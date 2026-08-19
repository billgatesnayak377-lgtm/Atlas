import { GoogleGenAI } from "@google/genai";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

type PlannerTask = {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate?: string | null;
  completed?: boolean;
};

type PlannedTask = {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: string | null;
  reason: string;
  suggestedOrder: number;
};

type PlannerResponse = {
  plan: PlannedTask[];
  summary: string;
};

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

    const tasks =
      req.body?.tasks as PlannerTask[];

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        error:
          "Tasks must be provided as an array.",
      });
    }

    /*
      Remove completed tasks.
      The planner only needs to plan unfinished work.
    */

    const activeTasks = tasks.filter(
      (task) => !task.completed
    );

    if (activeTasks.length === 0) {
      return res.status(200).json({
        plan: [],
        summary:
          "You have no unfinished tasks. Your day is clear!",
      });
    }

    const today =
      new Date();

    const todayString =
      today.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const ai = new GoogleGenAI({
      apiKey,
    });

    console.log(
      "Sending tasks to Gemini planner..."
    );

    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",

        contents: `
You are Atlas, an intelligent personal productivity assistant.

Today is:

${todayString}

Your job is to organize the user's unfinished tasks into the best order for completing them.

IMPORTANT RULES:

1. HIGH priority tasks should generally come before medium priority tasks.

2. Tasks with earlier due dates should generally come before tasks with later due dates.

3. Overdue tasks should receive very high priority.

4. Do not change task IDs.

5. Do not change task titles.

6. Do not invent new tasks.

7. Do not remove tasks.

8. Every unfinished task must appear exactly once.

9. suggestedOrder must start at 1.

10. Give a short practical reason for the position of each task.

11. Keep the plan realistic.

12. The plan is an ORDER of tasks, not a new task list.

Here are the user's unfinished tasks:

${JSON.stringify(
  activeTasks,
  null,
  2
)}

Return JSON with:

{
  "plan": [
    {
      "id": 123,
      "title": "Task title",
      "priority": "high",
      "dueDate": "YYYY-MM-DD",
      "reason": "Short explanation",
      "suggestedOrder": 1
    }
  ],
  "summary": "Short explanation of today's recommended order."
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
                    "dueDate",
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
      });

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
      JSON.parse(outputText) as PlannerResponse;

    /*
      Basic validation
    */

    if (!Array.isArray(result.plan)) {
      throw new Error(
        "Invalid planner response."
      );
    }

    /*
      Make sure only original unfinished
      tasks are returned.
    */

    const validIds =
      new Set(
        activeTasks.map(
          (task) => task.id
        )
      );

    result.plan =
      result.plan.filter(
        (task) =>
          validIds.has(task.id)
      );

    /*
      Sort by suggested order.
    */

    result.plan.sort(
      (a, b) =>
        a.suggestedOrder -
        b.suggestedOrder
    );

    /*
      Re-number the final plan.
    */

    result.plan =
      result.plan.map(
        (task, index) => ({
          ...task,
          suggestedOrder:
            index + 1,
        })
      );

    console.log(
      "Final Atlas daily plan:",
      result
    );

    return res.status(200).json(
      result
    );
  } catch (error: unknown) {
    console.error(
      "ATLAS PLANNER ERROR:",
      error
    );

    let message =
      "Atlas could not create your daily plan.";

    if (error instanceof Error) {
      message = error.message;
    }

    return res.status(500).json({
      error: message,
    });
  }
}