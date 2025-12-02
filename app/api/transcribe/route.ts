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
// POST HANDLER WITH CES GATE
// ------------------------------------------------------
export async function POST(req: Request) {
  console.log("🔵 /api/transcribe hit");

  // CES access protection
  const cookieStore = cookies();
  const hasAccess = cookieStore.get("ces_access")?.value === "true";

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.log("❌ No file provided");
      return NextResponse.json({ text: "" });
    }

    console.log("🟠 Incoming file:", file.name, file.type, file.size);

    // -------------------------------------------
    // 1. Reject extremely short or silent clips
    // -------------------------------------------
    if (file.size < 2000) {
      console.log("⚠️ Very small audio file, treat as silence");
      return NextResponse.json({ text: "" });
    }

    // -------------------------------------------
    // 2. Whisper transcription (correct signature)
    // -------------------------------------------
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "json",
      temperature: 0,
    });

    const text = transcription.text?.trim() || "";

    console.log("🟢 Whisper transcript:", text);

    // -------------------------------------------
    // 3. Return empty string if no meaningful words
    // -------------------------------------------
    if (!text || text.length < 2) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text });

  } catch (err) {
    console.error("❌ Whisper error:", err);
    return NextResponse.json({ text: "" });
  }
}
