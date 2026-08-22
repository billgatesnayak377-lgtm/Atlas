import { GoogleGenAI } from "@google/genai";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

/* =======================================================
   TYPES
======================================================= */

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

type PreferredTime =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening";

type Recurrence =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly";

type PlannerTask = {
  id: number;
  title: string;
  priority: Priority;
  duration: number;
  category?: Category;
  dueDate?: string | null;
  completed?: boolean;
  dependencyIds?: number[];
  preferredTime?: PreferredTime;
  recurrence?: Recurrence;
  reminder?: string;
};

type AIPlanItem = {
  id: number;
  reason: string;
  suggestedOrder: number;
};

type AIPlannerResponse = {
  plan: AIPlanItem[];
  summary: string;
};

type PlannedTask = {
  id: number;
  title: string;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate: string | null;
  dependencyIds: number[];
  preferredTime: PreferredTime;
  recurrence: Recurrence;
  reminder?: string;
  reason: string;
  suggestedOrder: number;
  startTime: string;
  endTime: string;
};

type PlannerResponse = {
  plan: PlannedTask[];
  summary: string;
  totalScheduledMinutes: number;
  totalUnscheduledMinutes: number;
};

/* =======================================================
   NORMALIZATION HELPERS
======================================================= */

function normalizePriority(
  value: unknown
): Priority {
  if (
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }

  return "medium";
}

function normalizeCategory(
  value: unknown
): Category {
  if (
    value === "work" ||
    value === "study" ||
    value === "health" ||
    value === "personal" ||
    value === "finance" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function normalizePreferredTime(
  value: unknown
): PreferredTime {
  if (
    value === "morning" ||
    value === "afternoon" ||
    value === "evening" ||
    value === "anytime"
  ) {
    return value;
  }

  return "anytime";
}

function normalizeRecurrence(
  value: unknown
): Recurrence {
  if (
    value === "daily" ||
    value === "weekdays" ||
    value === "weekly" ||
    value === "none"
  ) {
    return value;
  }

  return "none";
}

function normalizeDuration(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 30;
  }

  return Math.min(
    Math.max(
      Math.round(value),
      5
    ),
    1440
  );
}

function normalizeDependencyIds(
  value: unknown
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (id: unknown) =>
        Number(id)
    )
    .filter(
      (id: number) =>
        Number.isFinite(id)
    );
}

/* =======================================================
   DATE HELPERS
======================================================= */

function getTodayISO(): string {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return new Date().toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function getDueDateDistance(
  dueDate: string | null | undefined,
  todayISO: string
): number {
  if (!dueDate) {
    return 9999;
  }

  const due =
    new Date(
      `${dueDate}T00:00:00`
    ).getTime();

  const today =
    new Date(
      `${todayISO}T00:00:00`
    ).getTime();

  if (
    Number.isNaN(due) ||
    Number.isNaN(today)
  ) {
    return 9999;
  }

  return Math.round(
    (due - today) /
      (1000 * 60 * 60 * 24)
  );
}

/* =======================================================
   PRIORITY SCORING
======================================================= */

function getPriorityScore(
  priority: Priority
): number {
  switch (priority) {
    case "high":
      return 300;

    case "medium":
      return 150;

    case "low":
      return 50;

    default:
      return 150;
  }
}

/*
  Higher score = more important.

  Deadline is deliberately strong because:
  - overdue = extremely important
  - today = very important
  - tomorrow = important
*/

function getTaskScore(
  task: PlannerTask,
  todayISO: string
): number {
  let score =
    getPriorityScore(
      normalizePriority(
        task.priority
      )
    );

  const days =
    getDueDateDistance(
      task.dueDate,
      todayISO
    );

  if (days < 0) {
    score += 1000;
  } else if (days === 0) {
    score += 800;
  } else if (days === 1) {
    score += 600;
  } else if (days === 2) {
    score += 400;
  } else if (days <= 7) {
    score += 200;
  } else if (days < 9999) {
    score += 100;
  }

  /*
    Slight bonus for longer meaningful work.
    This prevents the optimizer from filling time
    only with many tiny tasks.
  */

  score += Math.min(
    task.duration / 10,
    20
  );

  return score;
}

/* =======================================================
   AI FALLBACK ORDER
======================================================= */

function fallbackSort(
  tasks: PlannerTask[],
  todayISO: string
): PlannerTask[] {
  return [...tasks].sort(
    (
      a: PlannerTask,
      b: PlannerTask
    ) => {
      const aScore =
        getTaskScore(
          a,
          todayISO
        );

      const bScore =
        getTaskScore(
          b,
          todayISO
        );

      if (
        aScore !== bScore
      ) {
        return (
          bScore -
          aScore
        );
      }

      return (
        a.duration -
        b.duration
      );
    }
  );
}

/* =======================================================
   DEPENDENCY HELPERS
======================================================= */

function createTaskMap(
  tasks: PlannerTask[]
): Map<number, PlannerTask> {
  const map =
    new Map<number, PlannerTask>();

  tasks.forEach(
    (task: PlannerTask) => {
      map.set(
        task.id,
        task
      );
    }
  );

  return map;
}

function hasDependencyCycle(
  task: PlannerTask,
  taskMap: Map<
    number,
    PlannerTask
  >
): boolean {
  const visiting =
    new Set<number>();

  function visit(
    id: number
  ): boolean {
    if (
      visiting.has(id)
    ) {
      return true;
    }

    const current =
      taskMap.get(id);

    if (!current) {
      return false;
    }

    visiting.add(id);

    const dependencies =
      normalizeDependencyIds(
        current.dependencyIds
      );

    for (
      const dependencyId of
        dependencies
    ) {
      if (
        taskMap.has(
          dependencyId
        ) &&
        visit(
          dependencyId
        )
      ) {
        return true;
      }
    }

    visiting.delete(id);

    return false;
  }

  return visit(
    task.id
  );
}

/*
  Returns all dependencies required for a task.

  Example:

  Task C depends on B.
  B depends on A.

  Selecting C requires:

  A + B + C
*/

function getDependencyClosure(
  task: PlannerTask,
  taskMap: Map<
    number,
    PlannerTask
  >
): Set<number> {
  const result =
    new Set<number>();

  function collect(
    current: PlannerTask
  ) {
    if (
      result.has(
        current.id
      )
    ) {
      return;
    }

    result.add(
      current.id
    );

    const dependencies =
      normalizeDependencyIds(
        current.dependencyIds
      );

    dependencies.forEach(
      (
        dependencyId: number
      ) => {
        const dependency =
          taskMap.get(
            dependencyId
          );

        if (dependency) {
          collect(
            dependency
          );
        }
      }
    );
  }

  collect(task);

  return result;
}

/* =======================================================
   CAPACITY OPTIMIZER
======================================================= */

/*
  This is the important part.

  We don't simply take tasks one-by-one.

  Instead we evaluate combinations and choose the
  combination that:

  1. Fits inside available time.
  2. Uses as much time as possible.
  3. Then maximizes priority/deadline score.
  4. Respects dependencies.

  Example:

  Available = 240 minutes

  BESS = 120
  GATE = 120
  Gym  = 60

  BESS + Gym = 180
  BESS + GATE = 240

  Therefore:

  BESS + GATE wins.
*/

type CandidateSelection = {
  ids: Set<number>;
  minutes: number;
  score: number;
};

function compareSelections(
  a: CandidateSelection,
  b: CandidateSelection
): CandidateSelection {
  /*
    First maximize time utilization.
  */

  if (
    a.minutes !==
    b.minutes
  ) {
    return a.minutes >
      b.minutes
      ? a
      : b;
  }

  /*
    If both use the same amount of time,
    choose the higher-value combination.
  */

  if (
    a.score !==
    b.score
  ) {
    return a.score >
      b.score
      ? a
      : b;
  }

  return a;
}

function optimizeTasks(
  tasks: PlannerTask[],
  availableMinutes: number,
  todayISO: string
): Set<number> {
  const taskMap =
    createTaskMap(
      tasks
    );

  /*
    For a normal personal task list, there will usually
    be far fewer than 20 tasks.

    Exhaustive combination search gives the best result
    for small lists.

    For larger lists, use a greedy fallback so the
    API doesn't become exponentially expensive.
  */

  if (
    tasks.length <= 20
  ) {
    let best: CandidateSelection =
      {
        ids: new Set<number>(),
        minutes: 0,
        score: 0,
      };

    const total =
      1 << tasks.length;

    for (
      let mask = 1;
      mask < total;
      mask++
    ) {
      const selected =
        new Set<number>();

      let minutes = 0;
      let score = 0;

      let valid = true;

      for (
        let index = 0;
        index <
          tasks.length;
        index++
      ) {
        if (
          (mask &
            (1 << index)) ===
          0
        ) {
          continue;
        }

        const task =
          tasks[index];

        /*
          Ignore circular dependency tasks.
        */

        if (
          hasDependencyCycle(
            task,
            taskMap
          )
        ) {
          valid = false;
          break;
        }

        const closure =
          getDependencyClosure(
            task,
            taskMap
          );

        closure.forEach(
          (id: number) => {
            selected.add(
              id
            );
          }
        );
      }

      if (!valid) {
        continue;
      }

      /*
        Calculate the actual duration of the complete
        dependency closure.
      */

      selected.forEach(
        (id: number) => {
          const task =
            taskMap.get(id);

          if (!task) {
            return;
          }

          minutes +=
            normalizeDuration(
              task.duration
            );

          score +=
            getTaskScore(
              task,
              todayISO
            );
        }
      );

      if (
        minutes >
        availableMinutes
      ) {
        continue;
      }

      const candidate: CandidateSelection =
        {
          ids: selected,
          minutes,
          score,
        };

      best =
        compareSelections(
          candidate,
          best
        );
    }

    return best.ids;
  }

  /*
    Greedy fallback for very large task lists.
  */

  const sorted =
    fallbackSort(
      tasks,
      todayISO
    );

  const selected =
    new Set<number>();

  let usedMinutes = 0;

  for (
    const task of sorted
  ) {
    const closure =
      getDependencyClosure(
        task,
        taskMap
      );

    let closureMinutes = 0;

    closure.forEach(
      (id: number) => {
        if (
          selected.has(id)
        ) {
          return;
        }

        const dependency =
          taskMap.get(id);

        if (dependency) {
          closureMinutes +=
            normalizeDuration(
              dependency.duration
            );
        }
      }
    );

    if (
      usedMinutes +
        closureMinutes <=
      availableMinutes
    ) {
      closure.forEach(
        (id: number) => {
          selected.add(
            id
          );
        }
      );

      usedMinutes +=
        closureMinutes;
    }
  }

  return selected;
}

/* =======================================================
   ORDER SELECTED TASKS
======================================================= */

function topologicalSort(
  tasks: PlannerTask[],
  preferredOrder: PlannerTask[]
): PlannerTask[] {
  const taskMap =
    createTaskMap(
      tasks
    );

  const preferredIndex =
    new Map<number, number>();

  preferredOrder.forEach(
    (
      task: PlannerTask,
      index: number
    ) => {
      preferredIndex.set(
        task.id,
        index
      );
    }
  );

  const result: PlannerTask[] =
    [];

  const visited =
    new Set<number>();

  const visiting =
    new Set<number>();

  function visit(
    task: PlannerTask
  ) {
    if (
      visited.has(
        task.id
      )
    ) {
      return;
    }

    /*
      Circular dependencies are ignored safely.
    */

    if (
      visiting.has(
        task.id
      )
    ) {
      return;
    }

    visiting.add(
      task.id
    );

    const dependencies =
      normalizeDependencyIds(
        task.dependencyIds
      );

    const sortedDependencies =
      dependencies
        .map(
          (
            id: number
          ) =>
            taskMap.get(id)
        )
        .filter(
          (
            dependency:
              | PlannerTask
              | undefined
          ): dependency is PlannerTask =>
            Boolean(
              dependency
            )
        )
        .sort(
          (
            a: PlannerTask,
            b: PlannerTask
          ) =>
            (preferredIndex.get(
              a.id
            ) ?? 9999) -
            (preferredIndex.get(
              b.id
            ) ?? 9999)
        );

    sortedDependencies.forEach(
      (
        dependency: PlannerTask
      ) => {
        visit(
          dependency
        );
      }
    );

    visiting.delete(
      task.id
    );

    visited.add(
      task.id
    );

    result.push(
      task
    );
  }

  tasks.forEach(
    (
      task: PlannerTask
    ) => {
      visit(task);
    }
  );

  return result;
}

/* =======================================================
   SMART SCHEDULE
======================================================= */

function roundUpToFiveMinutes(date: Date): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);
  const remainder = result.getMinutes() % 5;
  if (remainder !== 0) {
    result.setMinutes(result.getMinutes() + (5 - remainder));
  }
  return result;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function scheduleTasks(
  tasks: PlannedTask[],
  startDate: Date = new Date()
): PlannedTask[] {
  let cursor = roundUpToFiveMinutes(startDate);
  let workSinceBreak = 0;

  return tasks.map((task: PlannedTask, index: number) => {
    // Add a short recovery break after roughly two hours of continuous work.
    // The break is represented by a gap in the schedule and is not counted
    // against Atlas' selected task minutes.
    if (index > 0 && workSinceBreak >= 120) {
      cursor = new Date(cursor.getTime() + 10 * 60 * 1000);
      workSinceBreak = 0;
    }

    const start = new Date(cursor);
    const end = new Date(
      start.getTime() + task.duration * 60 * 1000
    );

    cursor = end;
    workSinceBreak += task.duration;

    return {
      ...task,
      startTime: formatTime(start),
      endTime: formatTime(end),
    };
  });
}

/* =======================================================
   CREATE PLANNED TASK
======================================================= */

function createPlannedTask(
  task: PlannerTask,
  reason: string,
  order: number
): PlannedTask {
  return {
    id: task.id,

    title:
      task.title,

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
      task.dueDate ??
      null,

    dependencyIds:
      normalizeDependencyIds(
        task.dependencyIds
      ),

    preferredTime:
      normalizePreferredTime(
        task.preferredTime
      ),

    recurrence:
      normalizeRecurrence(
        task.recurrence
      ),

    reminder:
      task.reminder,

    reason,

    suggestedOrder:
      order,

    startTime: "",
    endTime: "",
  };
}

/* =======================================================
   MAIN API HANDLER
======================================================= */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
    Only POST.
  */

  if (
    req.method !==
    "POST"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed",
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
       INPUT TASKS
    --------------------------------------------------- */

    const incomingTasks =
      req.body?.tasks;

    if (
      !Array.isArray(
        incomingTasks
      )
    ) {
      return res.status(400).json({
        error:
          "Tasks must be provided as an array.",
      });
    }

    /* ---------------------------------------------------
       AVAILABLE TIME
    --------------------------------------------------- */

    const rawAvailableMinutes =
      req.body
        ?.availableMinutes;

    let availableMinutes:
      | number
      | null =
      null;

    if (
      typeof rawAvailableMinutes ===
        "number" &&
      Number.isFinite(
        rawAvailableMinutes
      )
    ) {
      availableMinutes =
        Math.min(
          Math.max(
            Math.round(
              rawAvailableMinutes
            ),
            0
          ),
          1440
        );
    }

    console.log(
      "Available minutes:",
      availableMinutes
    );

    /* ---------------------------------------------------
       NORMALIZE TASKS
    --------------------------------------------------- */

    const allTasks: PlannerTask[] =
      incomingTasks
        .map(
          (
            task: PlannerTask
          ) => ({
            id:
              Number(
                task.id
              ),

            title:
              typeof task.title ===
              "string"
                ? task.title.trim()
                : "Untitled task",

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
              typeof task.dueDate ===
                  "string" &&
                task.dueDate
                ? task.dueDate
                : null,

            completed:
              Boolean(
                task.completed
              ),

            dependencyIds:
              normalizeDependencyIds(
                task.dependencyIds
              ),

            preferredTime:
              normalizePreferredTime(
                task.preferredTime
              ),

            recurrence:
              normalizeRecurrence(
                task.recurrence
              ),

            reminder:
              typeof task.reminder ===
              "string"
                ? task.reminder
                : undefined,
          })
        )
        .filter(
          (
            task: PlannerTask
          ) =>
            Number.isFinite(
              task.id
            ) &&
            task.title.length >
              0
        );

    /* ---------------------------------------------------
       REMOVE COMPLETED TASKS
    --------------------------------------------------- */

    const activeTasks =
      allTasks.filter(
        (
          task: PlannerTask
        ) =>
          !task.completed
      );

    if (
      activeTasks.length ===
      0
    ) {
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

    const totalWorkMinutes =
      activeTasks.reduce(
        (
          total: number,
          task: PlannerTask
        ) =>
          total +
          task.duration,
        0
      );

    const todayISO =
      getTodayISO();

    const todayString =
      getTodayString();

    /* ---------------------------------------------------
       ASK GEMINI FOR IDEAL ORDER
    --------------------------------------------------- */

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    console.log(
      "Sending tasks to Gemini planner..."
    );

    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.6-flash",

          contents: `
You are Atlas, an intelligent personal productivity planner.

Today's date:

${todayString}

ISO date:

${todayISO}

Your job is to create the IDEAL PRIORITY ORDER of the user's unfinished tasks.

IMPORTANT RULES:

1. High-priority tasks should generally come before medium-priority tasks.

2. Medium-priority tasks should generally come before low-priority tasks.

3. Earlier due dates should generally come before later due dates.

4. Overdue tasks are extremely urgent.

5. Tasks due today are extremely important.

6. Tasks due tomorrow should normally be strongly prioritized.

7. Respect dependencies.

8. A task that depends on another task should come after that dependency.

9. Do not invent tasks.

10. Do not remove tasks.

11. Do not change IDs.

12. Do not change titles.

13. Do not change durations.

14. Every unfinished task must appear exactly once.

15. suggestedOrder must start at 1.

16. Give a short practical reason for each task.

17. The order should be useful for a real human completing their day.

18. Do not calculate available-time scheduling. The server will handle that separately.

USER TASKS:

${JSON.stringify(
  activeTasks,
  null,
  2
)}

Return exactly:

{
  "plan": [
    {
      "id": 123,
      "reason": "Short practical reason.",
      "suggestedOrder": 1
    }
  ],
  "summary": "Short explanation of the recommended order."
}
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

                      reason: {
                        type: "string",
                      },

                      suggestedOrder: {
                        type: "number",
                      },
                    },

                    required: [
                      "id",
                      "reason",
                      "suggestedOrder",
                    ],
                  },
                },

                summary: {
                  type: "string",
                },
              },

              required: [
                "plan",
                "summary",
              ],
            },
          },
        }
      );

    const outputText =
      response.text ??
      "";

    if (
      !outputText
    ) {
      throw new Error(
        "Gemini returned an empty planner response."
      );
    }

    let aiResult:
      AIPlannerResponse;

    try {
      aiResult =
        JSON.parse(
          outputText
        ) as AIPlannerResponse;
    } catch {
      throw new Error(
        "Atlas returned invalid planner JSON."
      );
    }

    if (
      !Array.isArray(
        aiResult.plan
      )
    ) {
      throw new Error(
        "Invalid planner response."
      );
    }

    /* ---------------------------------------------------
       CLEAN AI ORDER
    --------------------------------------------------- */

    const activeIds =
      new Set<number>(
        activeTasks.map(
          (
            task: PlannerTask
          ) =>
            task.id
        )
      );

    const seenIds =
      new Set<number>();

    const aiItems =
      aiResult.plan
        .filter(
          (
            item: AIPlanItem
          ) =>
            activeIds.has(
              item.id
            )
        )
        .filter(
          (
            item: AIPlanItem
          ) => {
            if (
              seenIds.has(
                item.id
              )
            ) {
              return false;
            }

            seenIds.add(
              item.id
            );

            return true;
          }
        )
        .sort(
          (
            a: AIPlanItem,
            b: AIPlanItem
          ) =>
            a.suggestedOrder -
            b.suggestedOrder
        );

    /* ---------------------------------------------------
       ADD MISSING TASKS
    --------------------------------------------------- */

    const missingTasks =
      activeTasks.filter(
        (
          task: PlannerTask
        ) =>
          !seenIds.has(
            task.id
          )
      );

    const fallbackMissing =
      fallbackSort(
        missingTasks,
        todayISO
      );

    fallbackMissing.forEach(
      (
        task: PlannerTask
      ) => {
        aiItems.push({
          id: task.id,

          reason:
            "Added automatically because this unfinished task was missing from the AI ordering.",

          suggestedOrder:
            aiItems.length +
            1,
        });
      }
    );

    /* ---------------------------------------------------
       MAP AI REASONS
    --------------------------------------------------- */

    const reasonMap =
      new Map<
        number,
        string
      >();

    aiItems.forEach(
      (
        item: AIPlanItem
      ) => {
        reasonMap.set(
          item.id,
          item.reason
        );
      }
    );

    /* ---------------------------------------------------
       PREFERRED TASK ORDER
    --------------------------------------------------- */

    const taskMap =
      createTaskMap(
        activeTasks
      );

    const preferredOrder =
      aiItems
        .map(
          (
            item: AIPlanItem
          ) =>
            taskMap.get(
              item.id
            )
        )
        .filter(
          (
            task:
              | PlannerTask
              | undefined
          ): task is PlannerTask =>
            Boolean(task)
        );

    /* ---------------------------------------------------
       NO AVAILABLE-TIME LIMIT
    --------------------------------------------------- */

    let selectedIds:
      Set<number>;

    if (
      availableMinutes ===
      null
    ) {
      selectedIds =
        new Set<number>(
          activeTasks.map(
            (
              task: PlannerTask
            ) =>
              task.id
          )
        );
    } else {
      /* -------------------------------------------------
         CAPACITY OPTIMIZATION
      ------------------------------------------------- */

      selectedIds =
        optimizeTasks(
          activeTasks,
          availableMinutes,
          todayISO
        );
    }

    /* ---------------------------------------------------
       SELECT TASKS
    --------------------------------------------------- */

    const selectedTasks =
      activeTasks.filter(
        (
          task: PlannerTask
        ) =>
          selectedIds.has(
            task.id
          )
      );

    /* ---------------------------------------------------
       ORDER SELECTED TASKS
    --------------------------------------------------- */

    const orderedSelectedTasks =
      topologicalSort(
        selectedTasks,
        preferredOrder
      );

    /*
      Make sure selected tasks are still ordered according
      to the AI preference where dependencies don't force
      a different order.
    */

    const preferredIndex =
      new Map<number, number>();

    preferredOrder.forEach(
      (
        task: PlannerTask,
        index: number
      ) => {
        preferredIndex.set(
          task.id,
          index
        );
      }
    );

    /*
      The topological sort already guarantees dependencies.
      We therefore keep its result.
    */

    /* ---------------------------------------------------
       BUILD FINAL PLAN
    --------------------------------------------------- */

    const orderedPlan:
      PlannedTask[] =
      orderedSelectedTasks.map(
        (
          task: PlannerTask,
          index: number
        ) =>
          createPlannedTask(
            task,

            reasonMap.get(
              task.id
            ) ??
              "Recommended based on priority, deadline and available time.",

            index + 1
          )
      );

    const finalPlan = scheduleTasks(orderedPlan);

    /* ---------------------------------------------------
       CALCULATE TOTALS
    --------------------------------------------------- */

    const totalScheduledMinutes =
      finalPlan.reduce(
        (
          total: number,
          task: PlannedTask
        ) =>
          total +
          task.duration,
        0
      );

    const totalUnscheduledMinutes =
      Math.max(
        0,
        totalWorkMinutes -
          totalScheduledMinutes
      );

    /* ---------------------------------------------------
       SUMMARY
    --------------------------------------------------- */

   /* ---------------------------------------------------
   SUMMARY
--------------------------------------------------- */

function formatMinutes(
  minutes: number
): string {
  const hours = Math.floor(
    minutes / 60
  );

  const remainingMinutes =
    minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} minutes`;
  }

  if (remainingMinutes === 0) {
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`;
  }

  return `${hours} ${
    hours === 1
      ? "hour"
      : "hours"
  } ${remainingMinutes} minutes`;
}

function getPlanSummary(
  plan: PlannedTask[],
  availableMinutes:
    | number
    | null,
  totalUnscheduledMinutes: number
): string {
  if (plan.length === 0) {
    return availableMinutes !==
      null
      ? `None of your unfinished tasks fit within the available ${formatMinutes(
          availableMinutes
        )}.`
      : "You have unfinished tasks, but Atlas could not create a schedule.";
  }

  const firstTask =
    plan[0];

  const secondTask =
    plan[1];

  let summary =
    `Atlas scheduled ${firstTask.title}`;

  if (secondTask) {
    summary += `, followed by ${secondTask.title}`;
  }

  if (plan.length > 2) {
    summary += `, and ${plan.length - 2} more task${
      plan.length - 2 === 1
        ? ""
        : "s"
    }`;
  }

  if (
    availableMinutes !==
    null
  ) {
    const scheduledMinutes =
      plan.reduce(
        (
          total: number,
          task: PlannedTask
        ) =>
          total +
          task.duration,
        0
      );

    summary += `, using ${formatMinutes(
      scheduledMinutes
    )} of your available ${formatMinutes(
      availableMinutes
    )}.`;

    if (
      totalUnscheduledMinutes >
      0
    ) {
      summary += ` ${formatMinutes(
        totalUnscheduledMinutes
      )} of work remains unscheduled.`;
    } else {
      summary +=
        " All unfinished work fits within your available time.";
    }
  } else {
    summary +=
      ". All unfinished tasks were included because no daily time limit was provided.";
  }

  return summary;
}

const summary =
  getPlanSummary(
    finalPlan,
    availableMinutes,
    totalUnscheduledMinutes
  );
    /* ---------------------------------------------------
       FINAL RESPONSE
    --------------------------------------------------- */

    const result:
      PlannerResponse = {
      plan:
        finalPlan,

      summary,

      totalScheduledMinutes,

      totalUnscheduledMinutes,
    };

    console.log(
      "Final Atlas planner result:",
      JSON.stringify(
        result,
        null,
        2
      )
    );

    return res.status(200).json(
      result
    );
  } catch (
    error: unknown
  ) {
    console.error(
      "ATLAS DAILY PLANNER ERROR:",
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