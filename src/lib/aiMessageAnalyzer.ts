import { createGroqChatCompletion } from "./groqClient";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIAnalysis {
  mood: "confession" | "advice" | "wit" | "critique" | "curious";
  toxicityScore: number;
  toxicityLevel: "clean" | "rude" | "harsh" | "toxic";
  tenderized: string;
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const PROMPT_TEMPLATE = (content: string) => `You are an expert message safety, sentiment, and mood classifier for an anonymous messaging app called Veil.

Analyze the following user message and return ONLY valid JSON matching this exact schema:
{
  "mood": "<one of: confession | advice | wit | critique | curious>",
  "toxicityScore": <float between 0.0 and 1.0>,
  "toxicityLevel": "<one of: clean | rude | harsh | toxic>",
  "tenderized": "<rewritten constructive version if harsh or toxic, otherwise empty string \"\">"
}

Classification Criteria:

1. Mood Classification:
- confession: Personal secrets, admissions, crushes, deep feelings, appreciation, vulnerability ("I've always liked you", "To be honest, I was scared", "I miss how we used to talk").
- advice: Suggestions, tips, guidance, recommendations ("You should try learning TypeScript", "I suggest taking a break", "How about trying this instead?").
- wit: Jokes, playful banter, humor, funny observations, sarcastic teasing ("Did it hurt when you fell from heaven?", "Bro is coding in 4K", "Haha nice try").
- critique: Constructive criticism, direct evaluation, performance questions ("Your latest project has UI bugs", "You need to improve documentation", "The app feels a bit slow").
- curious: Questions, general inquiries, neutral observations ("What's your favorite food?", "Are you coming to the event?", "Hey, what are you working on?").

2. Toxicity Level & Score:
- clean (0.0 to 0.2): Friendly, neutral, constructive, or positive. No hostility.
- rude (0.2 to 0.5): Mildly blunt or dismissive ("your posts are kind of boring"), but NOT abusive. Do NOT tenderize.
- harsh (0.5 to 0.8): Intentionally mean, personal mockery, hurtful. TENDERIZE this into polite constructive feedback.
- toxic (0.8 to 1.0): Slurs, hate speech, severe abuse, threats, harassment. TENDERIZE this into neutral constructive feedback.

3. Tenderized output:
- For 'clean' or 'rude' messages, tenderized MUST be "".
- For 'harsh' or 'toxic' messages, rewrite the message into a polite, constructive summary without hostility or abuse.

Message to analyze:
"${content.replace(/"/g, '\\"')}"`;

/**
 * Robust, multi-provider AI message analyzer (Groq -> Gemini -> Rule-based Fallback)
 */
export async function analyzeMessage(content: string): Promise<AIAnalysis> {
  const sanitized = content.trim();
  if (!sanitized) {
    return {
      mood: "curious",
      toxicityScore: 0,
      toxicityLevel: "clean",
      tenderized: "",
    };
  }

  // 1. Primary & Backup Attempt: Groq AI (Llama 3.3 70B)
  try {
    const response = await createGroqChatCompletion({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: PROMPT_TEMPLATE(sanitized) }],
      temperature: 0.1,
      max_tokens: 350,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = validateAndSanitize(JSON.parse(raw));
    if (parsed) return parsed;
  } catch (err) {
    console.warn("Groq AI analysis failed/rate-limited, attempting Gemini fallback...", err);
  }

  // 2. Secondary Fallback: Google Gemini AI (gemini-1.5-flash)
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(PROMPT_TEMPLATE(sanitized));
      const responseText = result.response.text();
      const parsed = validateAndSanitize(JSON.parse(responseText));
      if (parsed) return parsed;
    } catch (err) {
      console.warn("Gemini AI analysis failed, falling back to heuristic engine...", err);
    }
  }

  // 3. Tertiary Fallback: Smart Rule-based Heuristic Engine
  return fallbackHeuristicAnalysis(sanitized);
}

function validateAndSanitize(parsed: any): AIAnalysis | null {
  const validMoods = ["confession", "advice", "wit", "critique", "curious"];
  const validLevels = ["clean", "rude", "harsh", "toxic"];

  if (!parsed || typeof parsed !== "object") return null;

  const mood = validMoods.includes(parsed.mood) ? parsed.mood : "curious";
  const toxicityScore = typeof parsed.toxicityScore === "number"
    ? Math.min(1, Math.max(0, parsed.toxicityScore))
    : 0;
  const toxicityLevel = validLevels.includes(parsed.toxicityLevel) ? parsed.toxicityLevel : "clean";
  const tenderized = typeof parsed.tenderized === "string" ? parsed.tenderized : "";

  return { mood, toxicityScore, toxicityLevel, tenderized };
}

function fallbackHeuristicAnalysis(text: string): AIAnalysis {
  const lower = text.toLowerCase();

  // Toxicity detection
  const TOXIC_PATTERNS = /\b(fuck|shit|bitch|cunt|asshole|whore|bastard|dick|pussy|kill|die|hate you)\b/i;
  const HARSH_PATTERNS = /\b(ugly|loser|stupid|idiot|dumb|useless|trash|worst|pathetic)\b/i;
  const RUDE_PATTERNS = /\b(boring|whatever|lame|annoying|shut up)\b/i;

  let toxicityScore = 0;
  let toxicityLevel: AIAnalysis["toxicityLevel"] = "clean";
  let tenderized = "";

  if (TOXIC_PATTERNS.test(lower)) {
    toxicityScore = 0.9;
    toxicityLevel = "toxic";
    tenderized = "A sender expressed strong frustration regarding your profile.";
  } else if (HARSH_PATTERNS.test(lower)) {
    toxicityScore = 0.65;
    toxicityLevel = "harsh";
    tenderized = "A sender shared critical feedback regarding your content.";
  } else if (RUDE_PATTERNS.test(lower)) {
    toxicityScore = 0.35;
    toxicityLevel = "rude";
  }

  // Mood detection
  let mood: AIAnalysis["mood"] = "curious";

  if (/\b(confess|secret|crush|love|like you|admit|truth|honestly|feelings|miss you)\b/i.test(lower)) {
    mood = "confession";
  } else if (/\b(should|recommend|suggest|tip|try|advice|how about|instead|idea)\b/i.test(lower)) {
    mood = "advice";
  } else if (/\b(haha|lol|lmao|rofl|funny|joke|meme|kidding|banter)\b/i.test(lower)) {
    mood = "wit";
  } else if (/\b(bug|issue|problem|improve|wrong|bad|flaw|critique|fix)\b/i.test(lower)) {
    mood = "critique";
  } else if (/\?|what|why|how|who|where|when|are you/i.test(lower)) {
    mood = "curious";
  }

  return { mood, toxicityScore, toxicityLevel, tenderized };
}
