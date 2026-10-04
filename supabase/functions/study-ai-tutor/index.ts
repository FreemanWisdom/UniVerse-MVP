import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-3.6-flash";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
function cleanText(value, max = 12000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  if (req.method !== "POST") return json({
    error: "Method not allowed"
  }, 405);
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not configured");
    return json({
      error: "AI Tutor is not configured yet. Add GEMINI_API_KEY to Supabase secrets."
    }, 503);
  }
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({
    error: "Authentication required."
  }, 401);
  try {
    const body = await req.json();
    const question = cleanText(body.question ?? body.message, 6000);
    if (!question) return json({
      error: "Please enter a question."
    }, 400);
    const courseCode = cleanText(body.course_code, 100);
    const courseTitle = cleanText(body.course_title ?? body.subject, 200);
    const level = cleanText(body.level, 100);
    const suppliedContext = cleanText(body.context, 12000);
    const conversation = Array.isArray(body.conversation) ? body.conversation.filter((m)=>m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-8).map((m)=>({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: cleanText(m.content, 4000)
          }
        ]
      })) : [];
    const materialSection = suppliedContext ? `\nSTUDY MATERIAL PROVIDED BY THE STUDENT:\n${suppliedContext}\n` : "";
    const systemInstruction = `You are UniVerse AI Tutor, an academic study assistant inside the UniVerse ICOS Study Hub.

Help university students understand, revise, practise, and prepare for exams.

Rules:
- Teach clearly instead of simply dumping an answer.
- For calculations, show important steps.
- Explain difficult concepts simply first, then add depth when useful.
- For exam-style requests, give a structured study answer.
- If study material is supplied, prioritize it and say when a claim is not supported by it.
- Never invent citations, page numbers, quotations, or facts from documents you cannot see.
- If uncertain, say so.
- Do not claim to have read a PDF/file unless its text was actually supplied.
- Encourage understanding and independent learning; do not assist with cheating during a live examination.
- Formatting: write PLAIN TEXT only. Never use markdown symbols: no asterisks, no # headings, no underscores for emphasis, no backticks. Use short paragraphs separated by blank lines. For lists, start each line with a dash (-) and a space. For headings, just write a short standalone line. Write formulas in plain text (for example, a = pi r squared). Keep responses focused, readable, and scannable without any markup.

Student course context:
Course code: ${courseCode || "Not provided"}
Course title/subject: ${courseTitle || "Not provided"}
Level: ${level || "Not provided"}
${materialSection}`;
    const contents = [
      ...conversation,
      {
        role: "user",
        parts: [
          {
            text: question
          }
        ]
      }
    ];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemInstruction
            }
          ]
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1400
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini request failed", response.status, errorText.slice(0, 1200));
      return json({
        error: "The AI Tutor could not process that request right now."
      }, 502);
    }
    const result = await response.json();
    const answer = cleanText(result?.candidates?.[0]?.content?.parts?.map((p)=>p.text || "").join(""), 16000);
    if (!answer) {
      console.error("Gemini returned no text", JSON.stringify(result).slice(0, 1200));
      return json({
        error: "The AI Tutor returned an empty response. Please try again."
      }, 502);
    }
    return json({
      answer,
      model: GEMINI_MODEL,
      course_code: courseCode || null
    });
  } catch (error) {
    console.error("study-ai-tutor error", error);
    return json({
      error: "Something went wrong while contacting the AI Tutor."
    }, 500);
  }
});