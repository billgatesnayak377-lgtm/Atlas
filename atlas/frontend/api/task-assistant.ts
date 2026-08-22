import { GoogleGenAI } from "@google/genai";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

type Priority = "high" | "medium" | "low";

type Category =
  | "work"
  | "study"
  | "health"
  | "personal"
  | "finance"
  | "other";

type AtlasTask = {
  title: string;
  priority: Priority;
  duration: number;
  category: Category;
  dueDate: string | null;
  preferredTime?: PreferredTime;
  recurrence?: Recurrence;
  reminder?: string;
};

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

type Preferences = {
  defaultPriority?: Priority;
  defaultDuration?: number;
  defaultCategory?: Category;
  defaultPreferredTime?: PreferredTime;
  defaultRecurrence?: Recurrence;
  defaultReminder?: string;
};


function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/*
 * Extract a due date from ONE task segment.
 * This is deliberately run per segment so that:
 *
 *   Task A tomorrow; Task B in 3 days
 *
 * gets two different dates.
 */
function getDeterministicDueDate(
  input: string,
  today: Date
): string | null | undefined {
  const text = input.toLowerCase().trim();

  if (/\b(no due date|no deadline|without deadline)\b/i.test(text)) {
    return null;
  }

  if (/\btoday\b/i.test(text)) {
    return formatDate(today);
  }

  if (/\bday after tomorrow\b/i.test(text)) {
    return formatDate(addDays(today, 2));
  }

  if (/\btomorrow\b/i.test(text)) {
    return formatDate(addDays(today, 1));
  }

  const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i);

  if (inDaysMatch) {
    const days = Number(inDaysMatch[1]);

    if (Number.isFinite(days) && days >= 0 && days <= 365) {
      return formatDate(addDays(today, days));
    }
  }

  const wordNumbers: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };

  const inWordDaysMatch = text.match(
    /\bin\s+(one|two|three|four|five|six|seven)\s+days?\b/i
  );

  if (inWordDaysMatch) {
    return formatDate(
      addDays(
        today,
        wordNumbers[inWordDaysMatch[1].toLowerCase()]
      )
    );
  }

  const weekdays: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [dayName, targetDay] of Object.entries(weekdays)) {
    const dayPattern = new RegExp(
      `\\b(?:this|next)\\s+${dayName}\\b`,
      "i"
    );

    if (dayPattern.test(text)) {
      const currentDay = today.getDay();

      let difference =
        (targetDay - currentDay + 7) % 7;

      if (
        difference === 0 ||
        new RegExp(`\\bnext\\s+${dayName}\\b`, "i").test(text)
      ) {
        if (difference === 0) {
          difference = 7;
        }
      }

      return formatDate(addDays(today, difference));
    }
  }

  if (/\bthis weekend\b/i.test(text)) {
    const currentDay = today.getDay();

    let daysUntilSaturday =
      (6 - currentDay + 7) % 7;

    if (daysUntilSaturday === 0) {
      daysUntilSaturday = 7;
    }

    return formatDate(
      addDays(today, daysUntilSaturday)
    );
  }

  if (/\bnext week\b/i.test(text)) {
    return formatDate(addDays(today, 7));
  }

  return undefined;
}

/*
 * Extract an explicit duration from ONE task segment.
 */
function getDeterministicDuration(
  input: string
): number | undefined {
  const text = input.toLowerCase();

  const hoursMatch = text.match(
    /(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i
  );

  if (hoursMatch) {
    const hours = Number(hoursMatch[1]);

    if (
      Number.isFinite(hours) &&
      hours > 0 &&
      hours <= 24
    ) {
      return Math.round(hours * 60);
    }
  }

  const minutesMatch = text.match(
    /(?:for\s+)?(\d+)\s*(?:minutes?|mins?|min|m)\b/i
  );

  if (minutesMatch) {
    const minutes = Number(minutesMatch[1]);

    if (
      Number.isFinite(minutes) &&
      minutes > 0 &&
      minutes <= 1440
    ) {
      return minutes;
    }
  }

  return undefined;
}

/*
 * Split obvious multi-task input before sending it to Gemini.
 *
 * Semicolons/new lines are the strongest task separators.
 * Gemini is still instructed to split tasks if the user uses
 * natural language such as "and then".
 */
function splitTaskSegments(input: string): string[] {
  const segments = input
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments : [input.trim()];
}

function normalizeTask(
  task: Partial<AtlasTask>
): AtlasTask {
  const validPriorities: Priority[] = [
    "high",
    "medium",
    "low",
  ];

  const validCategories: Category[] = [
    "work",
    "study",
    "health",
    "personal",
    "finance",
    "other",
  ];

  const priority = validPriorities.includes(
    task.priority as Priority
  )
    ? (task.priority as Priority)
    : "medium";

  const category = validCategories.includes(
    task.category as Category
  )
    ? (task.category as Category)
    : "other";

  let duration =
    typeof task.duration === "number" &&
    Number.isFinite(task.duration) &&
    task.duration > 0
      ? Math.round(task.duration)
      : 30;

  duration = Math.min(
    Math.max(duration, 5),
    1440
  );

  const title =
    typeof task.title === "string" &&
    task.title.trim()
      ? task.title.trim()
      : "Untitled task";

  const dueDate =
    typeof task.dueDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
      ? task.dueDate
      : null;

  return {
    title,
    priority,
    duration,
    category,
    dueDate,
  };
}

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

    const userInput =
      req.body?.input;

    const preferences = (req.body?.preferences ?? {}) as Preferences;
    const memories = Array.isArray(req.body?.memories)
      ? req.body.memories.filter((item: unknown) => typeof item === "string").slice(0, 12)
      : [];

    if (
      typeof userInput !== "string" ||
      userInput.trim() === ""
    ) {
      return res.status(400).json({
        error:
          "Please provide a task description.",
      });
    }

    const today = new Date();

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

    const segments =
      splitTaskSegments(userInput);

    console.log(
      "Task segments:",
      segments
    );

    const ai = new GoogleGenAI({
      apiKey,
    });

    /*
     * Ask Gemini to return an ARRAY.
     *
     * This is the important change from the previous version:
     * the old API explicitly requested ONE task.
     */
    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",

        contents: `
You are Atlas, an intelligent personal task assistant.

Today's date:
${todayString}

The user may describe ONE OR MULTIPLE tasks in one message.

Your job is to identify EVERY distinct actionable task.

IMPORTANT:
- Return one object for every distinct task.
- Never combine two different tasks into one object.
- Never omit a task.
- Do not invent tasks.
- If tasks are separated by semicolons or new lines, treat each segment as a separate task unless it is clearly just extra information about the same task.
- If the user uses natural language such as "and", "also", or "then" to list separate actions, create separate task objects.
- Preserve the actual task/action in the title.
- Remove duration, date, and priority phrases from the title.
- Keep each task's own duration and due date.
- Do not copy a duration or due date from one task to another.

Priority must be exactly:
high
medium
low

Priority rules:
- urgent = high
- critical = high
- important = high
- high priority = high
- low priority = low
- otherwise = medium

Category must be exactly one of:
work
study
health
personal
finance
other

Category rules:
- studying, GATE preparation, exams, learning = study
- gym, exercise, workout, health = health
- work, reports, projects, meetings = work
- money, bills, payments, recharges = finance
- personal errands and personal activities = personal
- everything else = other

Duration:
- Return duration in MINUTES.
- If the user explicitly gives a duration for a task, use it.
- 2 hours = 120
- 1.5 hours = 90
- 30 minutes = 30
- 90 minutes = 90
- If no duration is given, estimate a realistic duration.
- Never return zero.

Due date:
- Return YYYY-MM-DD.
- "today" means today's date.
- "tomorrow" means one day after today.
- "day after tomorrow" means two days after today.
- "in 3 days" means three days after today.
- If no due date is given, return null.
- Do not invent a deadline.

Preferred time:
- Return exactly anytime, morning, afternoon, or evening.
- Use an explicit time/daypart from the user when present; otherwise use the supplied default.

Recurrence:
- Return exactly none, daily, weekdays, or weekly.
- Only set recurrence when the user explicitly asks for repetition; otherwise use the supplied default.

Reminder:
- Return a 24-hour HH:MM time when explicitly requested or when a supplied default exists.
- Otherwise return an empty string.
- Never invent a reminder time.

Examples:

User:
Study GATE for 2 hours tomorrow; Finish BESS report for 3 hours next Friday, urgent; Go to gym for 1 hour tomorrow

Return three separate objects:

[
  {
    "title": "Study GATE",
    "priority": "medium",
    "duration": 120,
    "category": "study",
    "dueDate": "..."
  },
  {
    "title": "Finish BESS report",
    "priority": "high",
    "duration": 180,
    "category": "work",
    "dueDate": "..."
  },
  {
    "title": "Go to gym",
    "priority": "medium",
    "duration": 60,
    "category": "health",
    "dueDate": "..."
  }
]

DEFAULTS TO USE ONLY WHEN THE USER DID NOT EXPLICITLY SPECIFY A VALUE:
- priority: ${preferences.defaultPriority ?? "medium"}
- duration: ${preferences.defaultDuration ?? 30} minutes
- category: ${preferences.defaultCategory ?? "other"}
- preferred time: ${preferences.defaultPreferredTime ?? "anytime"}
- recurrence: ${preferences.defaultRecurrence ?? "none"}
- reminder: ${preferences.defaultReminder || "none"}

MEMORY CONTEXT (use only when relevant; explicit user instructions always win):
${memories.join("\n") || "No saved memories."}

USER REQUEST:
${userInput.trim()}

TASK SEGMENTS DETECTED:
${JSON.stringify(segments, null, 2)}
        `,

        config: {
          responseMimeType:
            "application/json",

          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
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
                preferredTime: {
                  type: "string",
                  enum: ["anytime", "morning", "afternoon", "evening"],
                },
                recurrence: {
                  type: "string",
                  enum: ["none", "daily", "weekdays", "weekly"],
                },
                reminder: {
                  type: "string",
                },
              },
              required: [
                "title",
                "priority",
                "duration",
                "category",
                "dueDate",
                "preferredTime",
                "recurrence",
                "reminder",
              ],
            },
          },
        },
      });

    console.log(
      "Gemini response received."
    );

    const outputText =
      response.text ?? "";

    console.log(
      "Gemini raw response:",
      outputText
    );

    if (!outputText) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    const parsed: unknown =
      JSON.parse(outputText);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Gemini returned an invalid task list."
      );
    }

    const results: AtlasTask[] =
      parsed
        .map((task) =>
          normalizeTask(
            task as Partial<AtlasTask>
          )
        )
        .filter(
          (task) =>
            task.title !==
            "Untitled task"
        );

    if (results.length === 0) {
      throw new Error(
        "Gemini did not return any valid tasks."
      );
    }

    /*
     * Deterministic corrections PER SEGMENT.
     *
     * This guarantees that explicit durations/dates
     * are not accidentally shared between tasks.
     */
    const correctedResults =
      results.map(
        (task, index) => {
          const segment =
            segments[index] ??
            userInput;

          const explicitDuration =
            getDeterministicDuration(
              segment
            );

          const explicitDueDate =
            getDeterministicDueDate(
              segment,
              today
            );

          return {
            ...task,

            ...(explicitDuration !==
            undefined
              ? {
                  duration:
                    explicitDuration,
                }
              : {}),

            ...(explicitDueDate !==
            undefined
              ? {
                  dueDate:
                    explicitDueDate,
                }
              : {}),

            preferredTime:
              task.preferredTime ??
              preferences.defaultPreferredTime ??
              "anytime",

            recurrence:
              task.recurrence ??
              preferences.defaultRecurrence ??
              "none",

            reminder:
              typeof task.reminder === "string"
                ? task.reminder
                : preferences.defaultReminder || undefined,

            priority:
              task.priority ??
              preferences.defaultPriority ??
              "medium",

            duration:
              explicitDuration ??
              task.duration ??
              preferences.defaultDuration ??
              30,

            category:
              task.category ??
              preferences.defaultCategory ??
              "other",
          };
        }
      );

    console.log(
      "Final Atlas tasks:",
      correctedResults
    );

    /*
     * New response contract:
     *
     * {
     *   tasks: [...]
     * }
     *
     * The dashboard should consume data.tasks.
     */
    return res.status(200).json({
      tasks: correctedResults,
    });
  } catch (error: unknown) {
    console.error(
      "ATLAS GEMINI ERROR:",
      error
    );

    let message =
      "Atlas could not understand that task. Please try again.";

    if (error instanceof Error) {
      message = error.message;
    }

    return res.status(500).json({
      error: message,
    });
  }
}