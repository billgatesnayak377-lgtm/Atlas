import { GoogleGenAI } from "@google/genai";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

type Priority =
  | "high"
  | "medium"
  | "low";

type Category =
  | "work"
  | "study"
  | "health"
  | "personal"
  | "finance"
  | "other";

type PlannerTask = {
  id: number;
  title: string;
  priority: Priority;
  duration?: number;
  category?: Category;
  dueDate?: string | null;
  completed?: boolean;
};

type PlannedTask = {
  id: number;
  title: string;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate: string | null;
  reason: string;
  suggestedOrder: number;
};

type PlannerResponse = {
  plan: PlannedTask[];
  summary: string;
  totalScheduledMinutes?: number;
  totalUnscheduledMinutes?: number;
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function normalizeDuration(
  duration: unknown
): number {
  if (
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 30;
  }

  return Math.min(
    Math.max(
      Math.round(duration),
      5
    ),
    1440
  );
}

function normalizeCategory(
  category: unknown
): Category {
  const validCategories: Category[] = [
    "work",
    "study",
    "health",
    "personal",
    "finance",
    "other",
  ];

  if (
    typeof category === "string" &&
    validCategories.includes(
      category as Category
    )
  ) {
    return category as Category;
  }

  return "other";
}

function normalizePriority(
  priority: unknown
): Priority {
  if (
    priority === "high" ||
    priority === "medium" ||
    priority === "low"
  ) {
    return priority;
  }

  return "medium";
}

function normalizeAvailableMinutes(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const minutes = Number(value);

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return null;
  }

  return Math.min(
    Math.round(minutes),
    1440
  );
}

function formatDuration(
  minutes: number
): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const remaining =
    minutes % 60;

  if (remaining === 0) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    }`;
  }

  return `${hours}h ${remaining}m`;
}

/* -------------------------------------------------------
   API HANDLER
------------------------------------------------------- */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    /* ---------------------------------------------------
       API KEY
    --------------------------------------------------- */

    const apiKey =
      process.env.GEMINI_API_KEY;

    console.log(
      "Gemini API key available:",
      Boolean(apiKey)
    );

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not configured.",
      });
    }

    /* ---------------------------------------------------
       INPUT
    --------------------------------------------------- */

    const tasks =
      req.body?.tasks as PlannerTask[];

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        error:
          "Tasks must be provided as an array.",
      });
    }

    /*
      Available time is optional.

      Examples:

      60  = 1 hour
      120 = 2 hours
      240 = 4 hours
    */

    const availableMinutes =
      normalizeAvailableMinutes(
        req.body?.availableMinutes
      );

    console.log(
      "Available minutes:",
      availableMinutes
    );

    /* ---------------------------------------------------
       ACTIVE TASKS
    --------------------------------------------------- */

    const activeTasks =
      tasks
        .filter(
          (task) =>
            task &&
            !task.completed
        )
        .map((task) => ({
          ...task,

          priority:
            normalizePriority(
              task.priority
            ),

          duration:
            normalizeDuration(
              task.duration
            ),

          category:
            normalizeCategory(
              task.category
            ),

          dueDate:
            task.dueDate ?? null,
        }));

    if (activeTasks.length === 0) {
      return res.status(200).json({
        plan: [],
        summary:
          "You have no unfinished tasks. Your day is clear!",
        totalScheduledMinutes: 0,
        totalUnscheduledMinutes: 0,
      });
    }

    /* ---------------------------------------------------
       TOTAL WORK
    --------------------------------------------------- */

    const totalTaskMinutes =
      activeTasks.reduce(
        (total, task) =>
          total + task.duration,
        0
      );

    console.log(
      "Active tasks:",
      activeTasks.length
    );

    console.log(
      "Total task duration:",
      formatDuration(
        totalTaskMinutes
      )
    );

    /* ---------------------------------------------------
       DATE
    --------------------------------------------------- */

    const today =
      new Date();

    const todayString =
      today.toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );

    /* ---------------------------------------------------
       GEMINI
    --------------------------------------------------- */

    const ai = new GoogleGenAI({
      apiKey,
    });

    /*
      When available time exists, Atlas gets a stronger
      optimization instruction.

      The key idea:

      PRIORITY + DEADLINE + FIT + TIME UTILIZATION
    */

    const availableTimeRules =
      availableMinutes !== null
        ? `
AVAILABLE TIME MODE IS ACTIVE.

The user has:

${formatDuration(
  availableMinutes
)}

available today.

This is a HARD upper limit.

The selected tasks MUST NOT exceed the available time.

However, do NOT simply stop after selecting the
first urgent task.

Try to use as much of the available time as
reasonably possible.

For example:

Available = 240 minutes

Tasks:
- 120 min
- 120 min
- 60 min

A 240-minute combination should be preferred
over a 180-minute combination when the priority
and deadline difference is not significant.

IMPORTANT:

- Never split a task.
- Never shorten a task.
- A 120-minute task requires 120 minutes.
- A task is either selected completely or not selected.
- Prefer combinations that use more of the available time.
- Do not exceed the available time.
- Leaving a small amount unused is acceptable when
  no suitable task fits.
- Do not choose a clearly low-value task merely to
  fill a few minutes.
- Deadline urgency remains more important than simply
  filling every minute.

Think of the problem as:

"Choose the best complete tasks that fit inside the
available-time limit."

The goal is NOT simply maximum duration.

The goal is:

1. Urgency
2. Deadline
3. Priority
4. Practical task value
5. Efficient use of available time
`
        : `
AVAILABLE TIME MODE IS NOT ACTIVE.

The user did not specify a time limit.

Create the best ordering of all unfinished tasks.

Every unfinished task should be included.
`;

    /* ---------------------------------------------------
       GEMINI REQUEST
    --------------------------------------------------- */

    console.log(
      "Sending tasks to Gemini planner..."
    );

    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.6-flash",

          contents: `
You are Atlas, an intelligent personal productivity assistant.

Today is:

${todayString}

Your job is to create the best realistic plan from
the user's unfinished tasks.

${availableTimeRules}

GENERAL PLANNING RULES:

1. Overdue tasks receive very high urgency.

2. Tasks due today generally come before tasks due
   tomorrow.

3. Tasks due tomorrow generally come before tasks
   with later deadlines.

4. High priority tasks generally come before medium
   priority tasks.

5. Medium priority tasks generally come before low
   priority tasks.

6. A close deadline can outrank a higher-priority
   task with a much later deadline.

7. Consider the task category.

8. Avoid unnecessary context switching where practical.

9. Study tasks can be grouped when useful.

10. Work/deep-focus tasks can be placed earlier when
    they require concentration.

11. Health tasks can be placed after demanding
    cognitive work when appropriate.

12. Do not invent tasks.

13. Do not change task IDs.

14. Do not change task titles.

15. Do not change task durations.

16. Do not change task priorities.

17. Do not change task categories.

18. Do not partially schedule tasks.

19. Every selected task must appear exactly once.

20. suggestedOrder must start at 1.

21. The final result is an ORDER of existing tasks.

USER'S UNFINISHED TASKS:

${JSON.stringify(
  activeTasks,
  null,
  2
)}

TOTAL UNFINISHED WORK:

${formatDuration(
  totalTaskMinutes
)}

AVAILABLE TIME:

${
  availableMinutes !== null
    ? formatDuration(
        availableMinutes
      )
    : "Not specified"
}

Return JSON using exactly this structure:

{
  "plan": [
    {
      "id": 123,
      "title": "Task title",
      "priority": "high",
      "duration": 120,
      "category": "work",
      "dueDate": "2026-08-21",
      "reason": "Short practical reason.",
      "suggestedOrder": 1
    }
  ],
  "summary": "Short explanation of the recommended plan.",
  "totalScheduledMinutes": 240,
  "totalUnscheduledMinutes": 60
}

Priority must be:

high
medium
low

Category must be:

work
study
health
personal
finance
other

Duration is always in minutes.

If available time is specified:

- totalScheduledMinutes MUST NOT exceed available time
- selected tasks must be complete tasks
- try to make good use of available time
- do not invent shorter durations
        `,

          config: {
            responseMimeType:
              "application/json",

            responseSchema: {
              type: "object",

              properties: {
                plan: {
                  type: "array",

                  items: {
                    type: "object",

                    properties: {
                      id: {
                        type: "number",
                      },

                      title: {
                        type: "string",
                      },

                      priority: {
                        type: "string",
                        enum: [
                          "high",
                          "medium",
                          "low",
                        ],
                      },

                      duration: {
                        type: "number",
                      },

                      category: {
                        type: "string",
                        enum: [
                          "work",
                          "study",
                          "health",
                          "personal",
                          "finance",
                          "other",
                        ],
                      },

                      dueDate: {
                        type: [
                          "string",
                          "null",
                        ],
                      },

                      reason: {
                        type: "string",
                      },

                      suggestedOrder: {
                        type: "number",
                      },
                    },

                    required: [
                      "id",
                      "title",
                      "priority",
                      "duration",
                      "category",
                      "dueDate",
                      "reason",
                      "suggestedOrder",
                    ],
                  },
                },

                summary: {
                  type: "string",
                },

                totalScheduledMinutes: {
                  type: "number",
                },

                totalUnscheduledMinutes: {
                  type: "number",
                },
              },

              required: [
                "plan",
                "summary",
                "totalScheduledMinutes",
                "totalUnscheduledMinutes",
              ],
            },
          },
        }
      );

    /* ---------------------------------------------------
       RESPONSE
    --------------------------------------------------- */

    console.log(
      "Gemini planner response received."
    );

    const outputText =
      response.text ?? "";

    if (!outputText) {
      throw new Error(
        "Gemini returned an empty planner response."
      );
    }

    const result =
      JSON.parse(
        outputText
      ) as PlannerResponse;

    if (!Array.isArray(result.plan)) {
      throw new Error(
        "Invalid planner response."
      );
    }

    /* ---------------------------------------------------
       ORIGINAL TASK LOOKUP
    --------------------------------------------------- */

    const taskMap =
      new Map(
        activeTasks.map(
          (task) => [
            task.id,
            task,
          ]
        )
      );

    /* ---------------------------------------------------
       REMOVE INVALID TASKS
    --------------------------------------------------- */

    const validPlan =
      result.plan.filter(
        (task) =>
          taskMap.has(
            task.id
          )
      );

    /* ---------------------------------------------------
       REMOVE DUPLICATES
    --------------------------------------------------- */

    const seenIds =
      new Set<number>();

    const uniquePlan =
      validPlan.filter(
        (task) => {
          if (
            seenIds.has(
              task.id
            )
          ) {
            return false;
          }

          seenIds.add(
            task.id
          );

          return true;
        }
      );

    /* ---------------------------------------------------
       SORT BY AI ORDER
    --------------------------------------------------- */

    uniquePlan.sort(
      (a, b) =>
        a.suggestedOrder -
        b.suggestedOrder
    );

    /* ---------------------------------------------------
       RESTORE ORIGINAL DATA
    --------------------------------------------------- */

    let finalPlan =
      uniquePlan.map(
        (plannedTask) => {
          const original =
            taskMap.get(
              plannedTask.id
            )!;

          return {
            id: original.id,

            title:
              original.title,

            priority:
              original.priority,

            duration:
              original.duration,

            category:
              original.category,

            dueDate:
              original.dueDate ??
              null,

            reason:
              plannedTask.reason?.trim() ||
              "This task was selected for today's plan.",

            suggestedOrder:
              plannedTask.suggestedOrder,
          };
        }
      );

    /* ---------------------------------------------------
       HARD TIME SAFETY
    --------------------------------------------------- */

    if (
      availableMinutes !== null
    ) {
      let usedMinutes = 0;

      const safePlan:
        PlannedTask[] = [];

      for (const task of finalPlan) {
        /*
          Never allow the final server response
          to exceed the user's available time.
        */

        if (
          usedMinutes +
            task.duration <=
          availableMinutes
        ) {
          safePlan.push(
            task
          );

          usedMinutes +=
            task.duration;
        }
      }

      finalPlan =
        safePlan;
    }

    /* ---------------------------------------------------
       RE-NUMBER ORDER
    --------------------------------------------------- */

    finalPlan =
      finalPlan.map(
        (task, index) => ({
          ...task,
          suggestedOrder:
            index + 1,
        })
      );

    /* ---------------------------------------------------
       CALCULATE ACTUAL TIME
    --------------------------------------------------- */

    const totalScheduledMinutes =
      finalPlan.reduce(
        (total, task) =>
          total + task.duration,
        0
      );

    const totalUnscheduledMinutes =
      Math.max(
        totalTaskMinutes -
          totalScheduledMinutes,
        0
      );

    /* ---------------------------------------------------
       SUMMARY
    --------------------------------------------------- */

    let summary =
      typeof result.summary ===
        "string" &&
      result.summary.trim()
        ? result.summary.trim()
        : "Atlas created your recommended plan for today.";

    if (
      availableMinutes !== null
    ) {
      const remainingMinutes =
        Math.max(
          availableMinutes -
            totalScheduledMinutes,
          0
        );

      if (
        totalScheduledMinutes ===
        availableMinutes
      ) {
        summary += ` Atlas filled all ${formatDuration(
          availableMinutes
        )} of your available time.`;
      } else if (
        remainingMinutes > 0
      ) {
        summary += ` Atlas scheduled ${formatDuration(
          totalScheduledMinutes
        )} and left ${formatDuration(
          remainingMinutes
        )} available because no additional complete task was a suitable fit.`;
      }

      if (
        totalUnscheduledMinutes >
        0
      ) {
        summary += ` ${formatDuration(
          totalUnscheduledMinutes
        )} of total task work remains unscheduled.`;
      }
    }

    /* ---------------------------------------------------
       FINAL RESULT
    --------------------------------------------------- */

    const finalResult:
      PlannerResponse = {
      plan: finalPlan,

      summary,

      totalScheduledMinutes,

      totalUnscheduledMinutes,
    };

    console.log(
      "Final Atlas daily plan:",
      finalResult
    );

    return res.status(200).json(
      finalResult
    );
  } catch (error: unknown) {
    console.error(
      "ATLAS PLANNER ERROR:",
      error
    );

    let message =
      "Atlas could not create your daily plan.";

    if (
      error instanceof Error
    ) {
      message =
        error.message;
    }

    return res.status(500).json({
      error: message,
    });
  }
}