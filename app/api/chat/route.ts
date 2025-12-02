import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";

export const runtime = "nodejs";

// ------------------------------------------------------
// OPENAI CLIENT
// ------------------------------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ------------------------------------------------------
// SYSTEM PROMPT – Option A with control tag
// ------------------------------------------------------
const systemPrompt = `
You are Sophia, a calm, warm, supportive digital companion designed for older adults.

Core traits:
- Gentle, steady, patient
- Speaks slowly and naturally
- Supportive but never pushy
- No slang or jargon
- Short, clear paragraphs

Purpose:
- Provide companionship, reassurance, and emotional presence
- Help users feel calm, valued, and heard
- Never rush, pressure, or break character

CONTROL LOGIC (do not reveal to user):
At the END of your assistant reply, append this hidden tag:

<control>{"shouldEnd": true}</control>
or
<control>{"shouldEnd": false}</control>

Rules:
- shouldEnd = true ONLY if the user is clearly ending the conversation:
  "bye", "goodbye", "that's all", "I'm done",
  "I have to go", "no more questions",
  "I'll talk later", "I need to run errands"
- Hesitation, sadness, or emotional reflection DOES NOT count as ending.
- If uncertain, default to: {"shouldEnd": false}

IMPORTANT:
- The control tag must come AFTER your visible text.
- Do NOT mention or refer to this control tag in any way.
`;

  // ------------------------------------------------------
  // SINGLE POST HANDLER WITH CES GATE + FULL LOGIC
  // ------------------------------------------------------
  export async function POST(req: Request) {
    // CES ACCESS CHECK — inside handler (correct)
    const cookieStore = await cookies();
    const hasAccess = cookieStore.get("ces_access")?.value === "true";

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  try {
    const { message, voiceMode } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // ------------------------------------------------------
    // TRANSCRIPT SANITY FILTER
    // ------------------------------------------------------
    const clean = message.trim().toLowerCase();

    if (clean.length < 4) {
      return NextResponse.json({ text: "", audio: null, shouldEnd: false });
    }

    const junkFragments = [
      "uh", "um", "hmm", ".", "..", "...",
      "you", "ok", "okay", "yea", "yeah"
    ];

    if (junkFragments.includes(clean)) {
      return NextResponse.json({ text: "", audio: null, shouldEnd: false });
    }

    // ------------------------------------------------------
    // GPT CALL
    // ------------------------------------------------------
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });

    let raw = "";

    const msg = completion.choices[0].message;

    if (msg?.role === "assistant" && msg?.content) {
      raw = msg.content;
    }

    // ------------------------------------------------------
    // EXTRACT CONTROL TAG
    // ------------------------------------------------------
    const controlMatch = raw.match(/<control>([\s\S]*?)<\/control>/);
    let shouldEnd = false;

    if (controlMatch) {
      try {
        const obj = JSON.parse(controlMatch[1]);
        shouldEnd = obj.shouldEnd === true;
      } catch {
        shouldEnd = false;
      }
    }

    const cleanedText = raw
      .replace(/<control>[\s\S]*?<\/control>/gi, "")
      .trim();

    // ------------------------------------------------------
    // OPTIONAL SPEECH GENERATION
    // ------------------------------------------------------
    let audioBase64: string | null = null;

    if (voiceMode) {
      const tts = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: cleanedText,
      });

      const buffer = Buffer.from(await tts.arrayBuffer());
      audioBase64 = buffer.toString("base64");
    }

    return NextResponse.json({
      text: cleanedText,
      audio: audioBase64,
      shouldEnd,
    });

  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return NextResponse.json(
      { error: "Chat API failed" },
      { status: 500 }
    );
  }
}
