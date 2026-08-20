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
};

/* -------------------------------------------------------
   Date helpers
------------------------------------------------------- */

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  date: Date,
  days: number
): Date {
  const result = new Date(date);
  result.setDate(
    result.getDate() + days
  );

  return result;
}

function getDeterministicDueDate(
  input: string,
  today: Date
): string | null | undefined {
  const text = input.toLowerCase().trim();

  if (
    /\b(no due date|no deadline|without deadline)\b/i.test(
      text
    )
  ) {
    return null;
  }

  // Today
  if (/\btoday\b/i.test(text)) {
    return formatDate(today);
  }

  // Day after tomorrow
  if (
    /\bday after tomorrow\b/i.test(text)
  ) {
    return formatDate(
      addDays(today, 2)
    );
  }

  // Tomorrow
  if (/\btomorrow\b/i.test(text)) {
    return formatDate(
      addDays(today, 1)
    );
  }

  // In X days
  const inDaysMatch = text.match(
    /\bin\s+(\d+)\s+days?\b/i
  );

  if (inDaysMatch) {
    const days = Number(
      inDaysMatch[1]
    );

    if (
      days >= 0 &&
      days <= 365
    ) {
      return formatDate(
        addDays(today, days)
      );
    }
  }

  // In one/two/three/etc. days
  const wordNumbers: Record<
    string,
    number
  > = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };

  const inWordDaysMatch =
    text.match(
      /\bin\s+(one|two|three|four|five|six|seven)\s+days?\b/i
    );

  if (inWordDaysMatch) {
    return formatDate(
      addDays(
        today,
        wordNumbers[
          inWordDaysMatch[1].toLowerCase()
        ]
      )
    );
  }

  // Weekdays
  const weekdays: Record<
    string,
    number
  > = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [
    dayName,
    targetDay,
  ] of Object.entries(weekdays)) {
    const dayPattern =
      new RegExp(
        `\\b(?:this|next)\\s+${dayName}\\b`,
        "i"
      );

    if (dayPattern.test(text)) {
      const currentDay =
        today.getDay();

      let difference =
        (targetDay -
          currentDay +
          7) %
        7;

      if (
        difference === 0 ||
        new RegExp(
          `\\bnext\\s+${dayName}\\b`,
          "i"
        ).test(text)
      ) {
        if (difference === 0) {
          difference = 7;
        }
      }

      return formatDate(
        addDays(
          today,
          difference
        )
      );
    }
  }

  // This weekend
  if (
    /\bthis weekend\b/i.test(text)
  ) {
    const currentDay =
      today.getDay();

    let daysUntilSaturday =
      (6 -
        currentDay +
        7) %
      7;

    if (
      daysUntilSaturday === 0
    ) {
      daysUntilSaturday = 7;
    }

    return formatDate(
      addDays(
        today,
        daysUntilSaturday
      )
    );
  }

  // Next week
  if (
    /\bnext week\b/i.test(text)
  ) {
    return formatDate(
      addDays(today, 7)
    );
  }

  return undefined;
}

/* -------------------------------------------------------
   Duration helper
------------------------------------------------------- */

function getDeterministicDuration(
  input: string
): number | undefined {
  const text = input.toLowerCase();

  // Example:
  // "for 2 hours"
  // "2 hours"
  // "for 1.5 hrs"

  const hoursMatch =
    text.match(
      /(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i
    );

  if (hoursMatch) {
    const hours = Number(
      hoursMatch[1]
    );

    if (
      Number.isFinite(hours) &&
      hours > 0 &&
      hours <= 24
    ) {
      return Math.round(
        hours * 60
      );
    }
  }

  // Example:
  // "for 30 minutes"
  // "30 mins"
  // "for 90 min"

  const minutesMatch =
    text.match(
      /(?:for\s+)?(\d+)\s*(?:minutes?|mins?|min|m)\b/i
    );

  if (minutesMatch) {
    const minutes = Number(
      minutesMatch[1]
    );

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

/* -------------------------------------------------------
   Main API handler
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

    const userInput =
      req.body?.input;

    if (
      typeof userInput !==
        "string" ||
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

    /*
      Calculate dates ourselves.
    */
    const deterministicDueDate =
      getDeterministicDueDate(
        userInput,
        today
      );

    /*
      Calculate duration ourselves when
      the user explicitly gives one.
    */
    const deterministicDuration =
      getDeterministicDuration(
        userInput
      );

    console.log(
      "Deterministic due date:",
      deterministicDueDate
    );

    console.log(
      "Deterministic duration:",
      deterministicDuration
    );

    const ai = new GoogleGenAI({
      apiKey,
    });

    console.log(
      "Sending request to Gemini..."
    );

    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.6-flash",

          contents: `
You are Atlas, an intelligent personal task assistant.

Today's date is:

${todayString}

Convert the user's request into ONE structured task.

Return exactly these fields:

title
priority
duration
category
dueDate

Priority must be exactly:

high
medium
low

Category must be exactly one of:

work
study
health
personal
finance
other

Rules for priority:

- urgent means high
- critical means high
- important means high
- high priority means high
- low priority means low
- otherwise use medium

Rules for duration:

- Return duration in MINUTES.
- If the user explicitly gives a duration, use it.
- "2 hours" = 120
- "1.5 hours" = 90
- "30 minutes" = 30
- "90 minutes" = 90
- If no duration is given, estimate a realistic duration.
- Do not return zero.
- Keep estimates reasonable.

Rules for category:

- Studying, GATE preparation, exams, learning = study
- Gym, exercise, workout, health = health
- Work, reports, projects, meetings = work
- Money, bills, payments = finance
- Personal errands and personal activities = personal
- Everything else = other

Rules for title:

- Remove priority phrases.
- Remove date phrases.
- Remove duration phrases.
- Keep the actual task/action.
- Do not invent information.

Rules for dueDate:

- Return YYYY-MM-DD.
- If there is no due date, return null.
- Do not invent a deadline.

Examples:

User:
Study GATE for 2 hours tomorrow

Return:
{
  "title": "Study GATE",
  "priority": "medium",
  "duration": 120,
  "category": "study",
  "dueDate": "YYYY-MM-DD"
}

User:
Finish my BESS report for 3 hours next Friday, urgent

Return:
{
  "title": "Finish my BESS report",
  "priority": "high",
  "duration": 180,
  "category": "work",
  "dueDate": "YYYY-MM-DD"
}

User:
Go to gym for 1 hour tomorrow

Return:
{
  "title": "Go to gym",
  "priority": "medium",
  "duration": 60,
  "category": "health",
  "dueDate": "YYYY-MM-DD"
}

User:
Read research paper

Return:
{
  "title": "Read research paper",
  "priority": "medium",
  "duration": 30,
  "category": "study",
  "dueDate": null
}

User request:

${userInput.trim()}
          `,

          config: {
            responseMimeType:
              "application/json",

            responseSchema: {
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
              },

              required: [
                "title",
                "priority",
                "duration",
                "category",
                "dueDate",
              ],
            },
          },
        }
      );

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

    const result =
      JSON.parse(
        outputText
      ) as AtlasTask;

    /*
      Override Gemini's date when our
      deterministic parser recognized one.
    */
    if (
      deterministicDueDate !==
      undefined
    ) {
      result.dueDate =
        deterministicDueDate;
    }

    /*
      Override Gemini's duration when
      the user explicitly specified one.
    */
    if (
      deterministicDuration !==
      undefined
    ) {
      result.duration =
        deterministicDuration;
    }

    /*
      Validate priority.
    */
    if (
      result.priority !== "high" &&
      result.priority !== "medium" &&
      result.priority !== "low"
    ) {
      result.priority =
        "medium";
    }

    /*
      Validate category.
    */
    const validCategories:
      Category[] = [
        "work",
        "study",
        "health",
        "personal",
        "finance",
        "other",
      ];

    if (
      !validCategories.includes(
        result.category
      )
    ) {
      result.category =
        "other";
    }

    /*
      Validate duration.
    */
    if (
      !Number.isFinite(
        result.duration
      ) ||
      result.duration <= 0
    ) {
      result.duration = 30;
    }

    result.duration = Math.round(
      result.duration
    );

    /*
      Keep duration within a
      sensible range.
    */
    result.duration = Math.min(
      Math.max(
        result.duration,
        5
      ),
      1440
    );

    /*
      Clean title.
    */
    result.title =
      result.title.trim();

    console.log(
      "Final Atlas task:",
      result
    );

    return res.status(200).json(
      result
    );
  } catch (error: unknown) {
    console.error(
      "ATLAS GEMINI ERROR:",
      error
    );

    let message =
      "Atlas could not understand that task. Please try again.";

    if (
      error instanceof Error
    ) {
      message = error.message;
    }

    return res.status(500).json({
      error: message,
    });
  }
}