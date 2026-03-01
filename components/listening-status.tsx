"use client";

import type { AudioData } from "@/hooks/use-audio-analyzer";

export type StatusMode = "idle" | "listening" | "processing" | "playing";

interface ListeningStatusProps {
  mode: StatusMode;
  audioData: AudioData;
}

export function ListeningStatus({ mode, audioData }: ListeningStatusProps) {
  const getMessage = () => {
    if (mode === "idle") return "Tap to begin";
    if (mode === "processing") return "Processing...";
    if (mode === "playing") return "Speaking...";
    if (audioData.isActive) return "Listening...";
    return "Go ahead, I'm listening...";
  };

  const dotColor =
    mode === "playing"
      ? "bg-emerald-400"
      : mode === "listening" || mode === "processing"
        ? "bg-blue-400"
        : "bg-muted-foreground/40";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2.5">
        <span
          className={`block h-2 w-2 rounded-full ${dotColor} ${mode !== "idle" ? "animate-pulse" : ""}`}
        />
        <p className="font-sans text-sm tracking-widest text-foreground/60 uppercase">
          {getMessage()}
        </p>
      </div>
      {(mode === "listening" || mode === "processing") && (
        <div className="flex items-center gap-[3px]">
          {[...Array(7)].map((_, i) => {
            const freq = audioData.frequencies[i * 8] || 0;
            return (
              <div
                key={i}
                className="w-[3px] rounded-full transition-all duration-75"
                style={{
                  height: `${6 + freq * 20}px`,
                  backgroundColor: `hsl(${220 + i * 20}, 80%, ${60 + freq * 20}%)`,
                  opacity: 0.5 + freq * 0.5,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
