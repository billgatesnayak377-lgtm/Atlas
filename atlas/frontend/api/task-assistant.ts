/// <reference types="node" />

import OpenAI from "openai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type AtlasTask = {
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: string | null;
};

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
    const apiKey = process.env.OPENAI_API_KEY;

    console.log(
      "OpenAI API key available:",
      Boolean(apiKey)
    );

    if (!apiKey) {
      return res.status(500).json({
        error:
          "OPENAI_API_KEY is not configured.",
      });
    }

    const client = new OpenAI({
      apiKey,
      timeout: 15000,
      maxRetries: 0,
    });

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

    console.log(
      "Sending request to OpenAI..."
    );

    const response =
      await client.responses.create({
        model: "gpt-5.6",

        input: [
          {
            role: "system",
            content: `
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

- urgent means high priority
- critical means high priority
- important means high priority
- high priority means high
- low priority means low
- otherwise use medium

Understand natural-language dates such as:

today
tomorrow
this Friday
next Monday
next week
this weekend
in 3 days
in one week

Convert dates to YYYY-MM-DD.

If no due date is specified, return null.

Remove date and priority phrases from the title.

Do not invent information.

Examples:

User:
"Finish my BESS report tomorrow, high priority"

Return a structured task with:
title = "Finish my BESS report"
priority = "high"
dueDate = tomorrow's date

User:
"Go to the gym tomorrow"

Return:
title = "Go to the gym"
priority = "medium"
dueDate = tomorrow's date

User:
"Read the research paper"

Return:
title = "Read the research paper"
priority = "medium"
dueDate = null
            `,
          },

          {
            role: "user",
            content: userInput.trim(),
          },
        ],

        text: {
          format: {
            type: "json_schema",

            name: "atlas_task",

            strict: true,

            schema: {
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

              additionalProperties: false,
            },
          },
        },
      });

    console.log(
      "OpenAI response received."
    );

    const result =
      JSON.parse(
        response.output_text
      ) as AtlasTask;

    console.log(
      "Atlas task:",
      result
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error(
      "ATLAS AI ERROR:",
      error
    );

    let message =
      "Atlas could not understand the task.";

    if (error instanceof Error) {
      message = error.message;
    }

    return res.status(500).json({
      error: message,
    });
  }
}