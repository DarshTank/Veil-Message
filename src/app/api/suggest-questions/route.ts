import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Create a list of three open-ended and engaging questions formatted as a single string. 
Each question should be separated by '||'. 
These questions are for an anonymous social messaging platform like Qooh.me. 
Avoid personal or sensitive topics and focus on universal, friendly themes. 
Ensure questions are different each time. 
Do not include any other text in the response, just the questions.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
      }
    });

    const resultText = response.text || "";
    // Parse the response using the requested delimiter
    let questions = resultText.split('||').map(q => q.trim()).filter(q => q.length > 0);
    
    // Fallback logic if delimiter is ignored
    if (questions.length <= 1) {
      questions = resultText.split('\n')
        .map(q => q.replace(/^\d+\.\s*|-\s*/, '').trim())
        .filter(q => q.length > 0);
    }

    return NextResponse.json({ questions: questions.slice(0, 3) });
  } catch (error) {
    console.error("Gemini Route Error:", error);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
