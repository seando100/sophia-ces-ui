// --- CES Password Protection ---
import { cookies } from "next/headers";

const cookieStore = cookies();
const hasAccess = cookieStore.get("ces_access")?.value === "true";

if (!hasAccess) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  });
}

// ------------------------------------------------------
// IMPORTS
// ------------------------------------------------------
import { NextResponse } from "next/server";
import OpenAI from "openai";

// Next.js runtime must come AFTER imports
export const runtime = "nodejs";

// ------------------------------------------------------
// OPENAI CLIENT
// ------------------------------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});


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

    // -------------------------------------------
    // 1. Reject extremely short or silent clips
    // -------------------------------------------
    if (file.size < 2000) {
      console.log("⚠️ Very small audio file, treat as silence");
      return NextResponse.json({ text: "" });
    }

    // -------------------------------------------
    // 2. Send to Whisper API (correct signature)
    // -------------------------------------------
    const transcription = await client.audio.transcriptions.create({
      file,          // File object (Next.js compatible)
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
