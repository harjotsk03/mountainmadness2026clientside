"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, ChevronDown, Check } from "lucide-react";
import { VoiceOrb } from "@/components/voice-orb";
import { ListeningStatus } from "@/components/listening-status";
import type { StatusMode } from "@/components/listening-status";
import { useAudioAnalyzer } from "@/hooks/use-audio-analyzer";

interface Board {
  id: string;
  name: string;
  type: string;
  goal_description: string;
}

const BOARDS: Board[] = [
  {
    id: "b2416bb1-5577-42bd-b7fd-5ead732f1a40",
    name: "Work Board",
    type: "work",
    goal_description: "Track team events and shared spending with coworkers",
  },
  {
    id: "b4bcd468-c162-4b4e-b7a3-f89eb546ea93",
    name: "Spouse Board",
    type: "personal",
    goal_description: "Shared spending and goals with Gurleen",
  },
  {
    id: "d4b6deb0-76f5-42b5-b821-17bdcc258a54",
    name: "Friends Board",
    type: "friend",
    goal_description:
      "Track social outings and shared expenses with Kashfi and Faaiz",
  },
  {
    id: "e46a8937-1fac-4de1-9405-732b676a1bda",
    name: "Personal Board",
    type: "personal",
    goal_description: "My own personal financial goals and tracking",
  },
];

const TYPE_EMOJI: Record<string, string> = {
  work: "💼",
  personal: "🏠",
  friend: "👥",
};

export default function CoachPage() {
  const {
    audioData,
    startListening: startAudioAnalyzer,
    stopListening: stopAudioAnalyzer,
  } = useAudioAnalyzer();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<StatusMode>("idle");

  // Board selection state
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, 4000);
  }, []);

  const sendToBackend = useCallback(
    async (message: string) => {
      if (!selectedBoard) return;
      setStatus("processing");
      setTranscript("");

      const response = await fetch("http://localhost:8080/coachchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, board_id: selectedBoard.id }),
      });

      if (!response.ok || !response.body) {
        setTranscript(`Error ${response.status}`);
        setStatus("idle");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      let mediaSource: MediaSource | null = null;
      let sourceBuffer: SourceBuffer | null = null;
      let audio: HTMLAudioElement | null = null;
      let audioStarted = false;
      let streamDone = false;
      const pendingBuffers: Uint8Array[] = [];

      const appendNextBuffer = (): void => {
        if (
          !sourceBuffer ||
          sourceBuffer.updating ||
          pendingBuffers.length === 0
        )
          return;
        const next = pendingBuffers.shift();
        if (!next) return;
        try {
          const copy =
            next.buffer instanceof ArrayBuffer ? next : new Uint8Array(next);
          sourceBuffer.appendBuffer(copy as BufferSource);
        } catch (e) {
          console.warn("appendBuffer error:", e);
        }
      };

      const initMediaSource = (): void => {
        mediaSource = new MediaSource();
        audio = new Audio();
        audio.src = URL.createObjectURL(mediaSource);
        audioRef.current = audio;
        const ms = mediaSource;
        ms.addEventListener("sourceopen", () => {
          try {
            sourceBuffer = ms.addSourceBuffer("audio/mpeg");
            sourceBuffer.addEventListener("updateend", () => {
              if (pendingBuffers.length > 0) {
                appendNextBuffer();
              } else if (streamDone && ms.readyState === "open") {
                try {
                  ms.endOfStream();
                } catch {
                  // already ended
                }
              }
            });
            appendNextBuffer();
          } catch (e) {
            console.error("addSourceBuffer error:", e);
          }
        });
        audio.onended = () => {
          setStatus("idle");
          audioRef.current = null;
        };
        audio.onerror = () => {
          setStatus("idle");
          audioRef.current = null;
        };
      };

      const pushAudioChunk = (base64: string): void => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        if (!mediaSource) initMediaSource();
        pendingBuffers.push(bytes);
        appendNextBuffer();
        if (!audioStarted && audio) {
          audioStarted = true;
          setStatus("playing");
          audio.play().catch(() => setStatus("idle"));
        }
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          try {
            const event = JSON.parse(raw) as {
              type: string;
              content?: string;
              chunk?: string;
              error?: string;
            };
            if (event.type === "text" && event.content) {
              fullText += event.content;
              setTranscript(fullText);
            } else if (event.type === "audio" && event.chunk) {
              pushAudioChunk(event.chunk);
            } else if (event.type === "error") {
              setTranscript(event.error ?? "Unknown error");
              setStatus("idle");
              return;
            } else if (event.type === "done") {
              streamDone = true;
              const sb = sourceBuffer as SourceBuffer | null;
              const ms = mediaSource as MediaSource | null;
              if (
                sb &&
                !sb.updating &&
                pendingBuffers.length === 0 &&
                ms &&
                ms.readyState === "open"
              ) {
                try {
                  ms.endOfStream();
                } catch {
                  // already ended
                }
              }
              if (!audioStarted) setStatus("idle");
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    },
    [selectedBoard],
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Use Chrome.");
      return;
    }
    if (!selectedBoard) return;

    // Lock the board once the user starts talking
    setIsLocked(true);
    startAudioAnalyzer();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
      setTranscript("");
      resetSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer();
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onend = async () => {
      setIsListening(false);
      stopAudioAnalyzer();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const trimmed = finalTranscript.trim();
      if (!trimmed) {
        setStatus("idle");
        return;
      }
      await sendToBackend(trimmed);
    };

    recognition.onerror = () => {
      setIsListening(false);
      stopAudioAnalyzer();
      setStatus("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    selectedBoard,
    resetSilenceTimer,
    sendToBackend,
    startAudioAnalyzer,
    stopAudioAnalyzer,
  ]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopAudioAnalyzer();
    setIsListening(false);
    setStatus("idle");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, [stopAudioAnalyzer]);

  const orbMode: "idle" | "listening" | "processing" | "speaking" =
    status === "playing" ? "speaking" : status;

  // ── Board selection overlay ──────────────────────────────────────────
  if (!selectedBoard) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-foreground/90">
              Choose a board
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Select which board you&apos;d like to talk about
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {BOARDS.map((board) => (
              <button
                key={board.id}
                onClick={() => setSelectedBoard(board)}
                className="group flex items-start gap-3 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] px-5 py-4 text-left transition-all duration-200 hover:border-foreground/[0.12] hover:bg-foreground/[0.04] active:scale-[0.98]"
              >
                <span className="mt-0.5 text-lg leading-none">
                  {TYPE_EMOJI[board.type] ?? "📋"}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground/85">
                    {board.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-foreground/45 leading-snug">
                    {board.goal_description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Main coach UI ────────────────────────────────────────────────────
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-white">
      {/* Board selector dropdown (top center) */}
      <div className="absolute left-4 right-4 top-4 z-50 flex justify-center sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
        <div className="relative">
          <button
            onClick={() => {
              if (!isLocked) setDropdownOpen((o) => !o);
            }}
            disabled={isLocked}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
              isLocked
                ? "cursor-default border-foreground/[0.06] bg-foreground/[0.02] text-foreground/40"
                : "border-foreground/[0.08] bg-foreground/[0.03] text-foreground/70 hover:border-foreground/[0.15] hover:bg-foreground/[0.06]"
            }`}
          >
            <span className="text-xs leading-none">
              {TYPE_EMOJI[selectedBoard.type] ?? "📋"}
            </span>
            <span className="max-w-[180px] truncate">{selectedBoard.name}</span>
            {!isLocked && (
              <ChevronDown
                className={`h-3.5 w-3.5 text-foreground/40 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            )}
            {isLocked && (
              <span className="ml-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-foreground/35">
                locked
              </span>
            )}
          </button>

          {dropdownOpen && !isLocked && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-foreground/[0.08] bg-white shadow-lg shadow-black/[0.06]">
                {BOARDS.map((board) => {
                  const isSelected = board.id === selectedBoard.id;
                  return (
                    <button
                      key={board.id}
                      onClick={() => {
                        setSelectedBoard(board);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-foreground/[0.04]"
                          : "hover:bg-foreground/[0.03]"
                      }`}
                    >
                      <span className="text-sm leading-none">
                        {TYPE_EMOJI[board.type] ?? "📋"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground/80">
                          {board.name}
                        </span>
                        <span className="block truncate text-xs text-foreground/40">
                          {board.goal_description}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Canvas orb */}
      <div className="relative flex aspect-square w-full max-w-[520px] items-center justify-center">
        <VoiceOrb audioData={audioData} mode={orbMode} />
      </div>

      {/* Controls */}
      <div className="relative -mt-8 z-50 flex flex-col items-center gap-6">
        <ListeningStatus mode={status} audioData={audioData} />

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
              isListening
                ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                : "border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
            }`}
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? (
              <Square className="h-4 w-4 text-red-400 fill-red-400" />
            ) : (
              <Mic className="h-5 w-5 text-foreground/70 transition-colors group-hover:text-foreground/90" />
            )}
          </button>
          <p className="max-w-[280px] text-center text-xs text-foreground/50">
            {status === "idle" &&
              "Tap mic, then speak. Stops after 4s of silence."}
            {status === "listening" && "Listening…"}
            {status === "processing" && "Getting advice…"}
            {status === "playing" && "Playing response…"}
          </p>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="absolute inset-x-4 bottom-8 z-10 max-h-[180px] overflow-y-auto rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/80">
          <p className="whitespace-pre-wrap">{transcript}</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-stone-200 to-transparent" />
    </main>
  );
}
