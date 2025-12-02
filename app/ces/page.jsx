"use client";

import { useState, useRef, useEffect } from "react";

export default function CESPage() {
  // CHAT STATE
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  // AUDIO
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // VOICE LOOP STATE
  const voiceModeRef = useRef(false);
  const allowMicRef = useRef(false);
  const isRecordingRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserCleanupRef = useRef<(() => void) | null>(null);

  // NEW — chat scroll container reference
  const chatRef = useRef<HTMLDivElement | null>(null);

  // UI STATE
  const [recordingUI, setRecordingUI] = useState(false);

  // AUTO-SCROLL EFFECT
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /* ============================================================
     START RECORDING
  ============================================================ */
  async function startRecording() {
    if (!allowMicRef.current || isRecordingRef.current) return;

    console.log("Mic ON");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    isRecordingRef.current = true;
    setRecordingUI(true);

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.start();

    // Stop old analyzers
    if (analyserCleanupRef.current) {
      try {
        analyserCleanupRef.current();
      } catch (_) {}
      analyserCleanupRef.current = null;
    }

    // Start silence detection
    setTimeout(() => {
      if (allowMicRef.current && isRecordingRef.current) {
        startSilenceDetection(stream);
      }
    }, 300);

    // Idle timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!isRecordingRef.current || !allowMicRef.current) return;
      console.log("Idle shutoff");
      allowMicRef.current = false;
      stopRecording();
    }, 7000);
  }

  /* ============================================================
     SILENCE DETECTION
  ============================================================ */
  function startSilenceDetection(stream: MediaStream) {
    if (!allowMicRef.current || !isRecordingRef.current) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioCtx.resume();

    const buffer = new Uint8Array(analyser.fftSize);

    let running = true;
    let silentFrames = 0;
    let voicedFrames = 0;

    analyserCleanupRef.current = () => {
      running = false;
      audioCtx.close();
    };

    function detect() {
      if (!running || !allowMicRef.current || !isRecordingRef.current) return;

      analyser.getByteTimeDomainData(buffer);

      let amplitude = 0;
      for (let i = 0; i < buffer.length; i++) {
        amplitude += Math.abs(buffer[i] - 128);
      }
      amplitude /= buffer.length;

      const isVoiced = amplitude > 2;

      if (isVoiced) {
        voicedFrames++;
        silentFrames = 0;

        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
      } else {
        silentFrames++;
      }

      if (voicedFrames > 60 && silentFrames > 120 && amplitude < 1.5) {
        console.log("END OF SPEECH");
        stopRecording();
        return;
      }

      requestAnimationFrame(detect);
    }

    detect();
  }

  /* ============================================================
     STOP RECORDING
  ============================================================ */
  function stopRecording() {
    if (!isRecordingRef.current) return;

    console.log("Mic OFF");

    isRecordingRef.current = false;
    setRecordingUI(false);

    if (analyserCleanupRef.current) {
      try {
        analyserCleanupRef.current();
      } catch (_) {}
      analyserCleanupRef.current = null;
    }

    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      finalizeStop(null);
      return;
    }

    try {
      recorder.onstop = () => finalizeStop(recorder);
      recorder.stop();
    } catch {
      finalizeStop(recorder);
    }
  }

  /* ============================================================
     FINALIZE → Whisper
  ============================================================ */
  async function finalizeStop(rec: MediaRecorder | null) {
    let file: File | null = null;

    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      file = new File([blob], "speech.webm", { type: "audio/webm" });
    }

    audioChunksRef.current = [];

    if (voiceModeRef.current && allowMicRef.current && file) {
      await transcribe(file);
    }
  }

  /* ============================================================
     TRANSCRIBE
  ============================================================ */
  async function transcribe(file: File) {
    if (!file || file.size < 2000) return;

    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch("/api/transcribe", { method: "POST", body: fd });
    const data = await r.json();

    if (!data.text || data.text.trim().length < 2) return;

    sendToSophia(data.text, true);
  }

  /* ============================================================
     SEND → Chat → Play Audio → Restart Mic (IF allowed)
     *** FULLY FIXED VERSION ***
  ============================================================ */
    async function sendToSophia(text: string, voice: boolean) {
      if (!text.trim()) return;

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setInput("");

      // Always stop mic before sending to backend
      allowMicRef.current = false;
      stopRecording();

      // Send request
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, voiceMode: voiceModeRef.current })
      });

      const data = await r.json();
      const reply = data.text;
      const shouldEnd = data.shouldEnd === true;

      // Show assistant text reply
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // If she should end the conversation, DO NOT restart mic
      if (shouldEnd) {
        console.log("Conversation ended by AI");
        voiceModeRef.current = false;   // Pause voice mode for now
        allowMicRef.current = false;    // Keep mic off
        return;                         // EXIT — no audio, no restart
      }

      // If not voice mode, stop here
      if (!voice) return;

      // Play audio if available
      if (audioRef.current && data.audio) {
        const player = audioRef.current;
        player.src = `data:audio/mp3;base64,${data.audio}`;

        player.onplay = () => {
          allowMicRef.current = false;
          stopRecording();
        };

        player.onended = () => {
          console.log("Sophia finished speaking");

          // Only restart mic if voice mode is still active
          if (!voiceModeRef.current) return;

          allowMicRef.current = true;
          startRecording();
        };

        player.play();
      }
    }


  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="w-full h-screen flex bg-[#0A0F2C]">
      <audio ref={audioRef} />

      {/* LEFT */}
      <div className="w-[92%] h-full flex flex-col items-end justify-center p-10 bg-gradient-to-br from-[#0F1A4F] via-[#0A0F2C] to-[#091642]">
        <div className="text-white text-2xl font-medium mb-4 opacity-90 tracking-wide">
          Hi, I am Sophia.
        </div>

        <div className="relative w-[820px] h-[920px] overflow-hidden mt-[-30px]">
          <img
            src="/sophia/avatar.png"
            alt="Sophia Avatar"
            className="absolute top-[120px] w-full object-cover"
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-[68%] h-full flex items-center justify-center p-8">
        <div className="w-full max-w-[480px] h-[80%] bg-[#1D1E24] rounded-2xl shadow-lg p-6 text-white flex flex-col">
          <div className="text-lg font-semibold mb-4">Sophia</div>

          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto mb-4 p-3 bg-[#2A2B33] rounded-xl"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`px-4 py-2 rounded-lg max-w-[75%] my-1 ${
                  m.role === "user"
                    ? "self-end bg-blue-700 ml-auto"
                    : "self-start bg-[#3A3B44]"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>

          {/* INPUT + MIC */}
          <div className="flex gap-2">
            <input
              placeholder="Ask me anything..."
              className="flex-1 bg-[#2A2B33] p-3 rounded-xl text-sm text-white outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && sendToSophia(input, false)
              }
            />

            <button
              onClick={() => sendToSophia(input, false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm"
            >
              Send
            </button>

            {/* MIC BUTTON */}
            <button
              onClick={() => {
                if (isRecordingRef.current) {
                  console.log("Manual stop");
                  allowMicRef.current = false;
                  stopRecording();
                  return;
                }

                console.log("Voice mode enabled for next turn");
                voiceModeRef.current = true;
                allowMicRef.current = true;
                startRecording();
              }}
              className={`${
                recordingUI ? "bg-red-600" : "bg-blue-600"
              } hover:bg-blue-700 text-white px-3 py-3 rounded-xl text-sm`}
            >
              {recordingUI ? "●" : "🎤"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
