import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

// OpenAI Client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ------------------------------------------------------
// POST handler — NO LOGIN / NO COOKIE CHECK
// ------------------------------------------------------
export async function POST(req: Request) {
  console.log("🔵 /api/transcribe hit");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.log("❌ No file provided");
      return NextResponse.json({ text: "" });
    }

    console.log("🟠 Incoming file:", file.name, file.type, file.size);

    // Reject extremely short or silent clips (< 2kb)
    if (file.size < 2000) {
      console.log("⚠️ Very small audio file, treat as silence");
      return NextResponse.json({ text: "" });
    }

    // Whisper transcription
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "json",
      temperature: 0,
    });

    const text = transcription.text?.trim() || "";

    console.log("🟢 Whisper transcript:", text);

    if (!text || text.length < 2) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text });

  } catch (err) {
    console.error("❌ Whisper error:", err);
    return NextResponse.json({ text: "" });
  }
}
