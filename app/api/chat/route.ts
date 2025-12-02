import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";

export const runtime = "nodejs";

// OpenAI Client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// SYSTEM PROMPT
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

- Hesitation, sadness, or emotional reflection does NOT count as ending.
- If uncertain: {"shouldEnd": false}

IMPORTANT:
- The control tag must come AFTER your visible text.
- Do NOT mention or refer to this control tag.
`;

export async function POST(req: Request) {
  try {
    const { message, voiceMode } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // SILENCE FILTER
    const clean = message.trim().toLowerCase();
    if (clean.length < 3) {
      return NextResponse.json({ text: "", audio: null, shouldEnd: false });
    }

    const junkFragments = ["uh", "um", "hmm", ".", "..", "..."];
    if (junkFragments.includes(clean)) {
      return NextResponse.json({ text: "", audio: null, shouldEnd: false });
    }

    // GPT CALL
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });

    const raw = completion.choices[0].message?.content || "";

    // EXTRACT CONTROL TAG
    const match = raw.match(/<control>([\s\S]*?)<\/control>/);
    let shouldEnd = false;
    if (match) {
      try {
        const obj = JSON.parse(match[1]);
        shouldEnd = obj.shouldEnd === true;
      } catch {}
    }

    // CLEAN TEXT BEFORE TTS
    let cleanedText = raw.replace(/<control>[\s\S]*?<\/control>/gi, "").trim();

    // -----------------------------------------
    // GUARANTEED AUDIO FIX
    // -----------------------------------------
    // Ensure TTS always has enough meaningful text
    let finalText = cleanedText;

    if (!finalText || finalText.length < 3) {
      finalText = shouldEnd
        ? "Take care. I will be here whenever you want to talk again."
        : "I am here with you.";
    }

    // GENERATE AUDIO
    let audioBase64: string | null = null;

    if (voiceMode || shouldEnd) {
      const tts = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: finalText,
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
    return NextResponse.json({ error: "Chat API failed" }, { status: 500 });
  }
}
