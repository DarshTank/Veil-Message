import { NextResponse } from "next/server";
import { createGroqChatCompletion } from "@/lib/groqClient";

export async function GET() {
  try {
    const response = await createGroqChatCompletion({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Generate exactly 3 open-ended, engaging questions for an anonymous social messaging platform.
Return ONLY a JSON object with this structure:
{"questions": ["question 1", "question 2", "question 3"]}

Rules:
- Questions must be fun, friendly, and universally relatable
- Avoid personal, sensitive, or controversial topics
- Each question should be different in theme
- No numbering, no extra text — just the JSON`,
        },
      ],
      temperature: 0.9,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { questions?: string[] };

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, 3)
      : ["What's a skill you wish you had?", "What's your go-to comfort show?", "If you could travel anywhere tomorrow, where?"];

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error("Suggest questions error:", error);
    return NextResponse.json(
      {
        success: true,
        questions: [
          "What's a skill you wish you had?",
          "What's your go-to comfort show?",
          "If you could travel anywhere tomorrow, where?",
        ],
      },
      { status: 200 }
    );
  }
}
