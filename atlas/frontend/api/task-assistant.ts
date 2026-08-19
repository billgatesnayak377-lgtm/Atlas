import { GoogleGenAI } from "@google/genai";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

type Priority = "high" | "medium" | "low";

type AtlasTask = {
  title: string;
  priority: Priority;
  dueDate: string | null;
};

/* -------------------------------------------------------
   Date helpers
------------------------------------------------------- */

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

function getDeterministicDueDate(
  input: string,
  today: Date
): string | null | undefined {
  const text = input.toLowerCase().trim();

  /*
    undefined = no recognized date phrase
    null      = explicitly no date
    string    = calculated date
  */

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

  // Tomorrow
  if (/\btomorrow\b/i.test(text)) {
    return formatDate(addDays(today, 1));
  }

  // Day after tomorrow
  if (/\bday after tomorrow\b/i.test(text)) {
    return formatDate(addDays(today, 2));
  }

  // In X days
  const inDaysMatch = text.match(
    /\bin\s+(\d+)\s+days?\b/i
  );

  if (inDaysMatch) {
    const days = Number(inDaysMatch[1]);

    if (days >= 0 && days <= 365) {
      return formatDate(addDays(today, days));
    }
  }

  // In one/two/three/... days
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
        wordNumbers[
          inWordDaysMatch[1].toLowerCase()
        ]
      )
    );
  }

  // Day names
  const weekdays: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  /*
    "this Friday"
    "next Friday"

    Important:
    "next Friday" means the next occurrence after today.
    If today is Wednesday 19 Aug 2026,
    next Friday = 21 Aug 2026.
  */

  for (const [dayName, targetDay] of Object.entries(
    weekdays
  )) {
    const dayPattern = new RegExp(
      `\\b(?:this|next)\\s+${dayName}\\b`,
      "i"
    );

    if (dayPattern.test(text)) {
      const currentDay = today.getDay();

      let difference =
        (targetDay - currentDay + 7) % 7;

      // If today itself is the requested weekday,
      // "next" means one week later.
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
        addDays(today, difference)
      );
    }
  }

  // This weekend → Saturday
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

  // Next week → same weekday next week
  if (/\bnext week\b/i.test(text)) {
    return formatDate(addDays(today, 7));
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
  // Only POST
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

    const userInput = req.body?.input;

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
      today.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    /*
      Calculate obvious relative dates ourselves.
      This prevents Gemini from interpreting dates incorrectly.
    */
    const deterministicDueDate =
      getDeterministicDueDate(
        userInput,
        today
      );

    console.log(
      "Deterministic due date:",
      deterministicDueDate
    );

    const ai = new GoogleGenAI({
      apiKey,
    });

    console.log(
      "Sending request to Gemini..."
    );

    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",

        contents: `
You are Atlas, an intelligent personal task assistant.

Today's date is:

${todayString}

Convert the user's request into ONE structured task.

Return exactly:

title
priority
dueDate

Priority must be exactly:

high
medium
low

Rules:

- urgent means high
- critical means high
- important means high
- high priority means high
- low priority means low
- otherwise use medium

Remove priority phrases from the title.

Remove date phrases from the title.

If the request contains a date phrase, return the date in YYYY-MM-DD format.

If there is no date phrase, return null.

Do not invent information.

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
              "dueDate",
            ],
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

    const result =
      JSON.parse(outputText) as AtlasTask;

    /*
      Override Gemini's date when our deterministic
      parser recognized the user's relative date.

      This is the important fix.
    */
    if (
      deterministicDueDate !== undefined
    ) {
      result.dueDate =
        deterministicDueDate;
    }

    // Safety: make sure priority is valid
    if (
      result.priority !== "high" &&
      result.priority !== "medium" &&
      result.priority !== "low"
    ) {
      result.priority = "medium";
    }

    // Clean title
    result.title =
      result.title.trim();

    console.log(
      "Final Atlas task:",
      result
    );

    return res.status(200).json(result);
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