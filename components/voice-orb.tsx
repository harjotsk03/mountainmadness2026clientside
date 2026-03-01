"use client";

import { useRef, useEffect, useCallback } from "react";
import type { AudioData } from "@/hooks/use-audio-analyzer";

export type OrbMode = "idle" | "listening" | "processing" | "speaking";

interface VoiceOrbProps {
  audioData: AudioData;
  mode: OrbMode;
}

function fbm(x: number, y: number, t: number): number {
  let val = 0;
  val += Math.sin(x * 1.2 + t * 0.7) * Math.cos(y * 0.9 - t * 0.5) * 0.5;
  val += Math.sin(x * 2.4 - t * 1.1) * Math.cos(y * 1.8 + t * 0.8) * 0.25;
  val += Math.cos(x * 3.6 + t * 1.4) * Math.sin(y * 2.7 - t * 1.2) * 0.125;
  return val;
}

export function VoiceOrb({ audioData, mode }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const smoothVolumeRef = useRef(0);
  const smoothFreqsRef = useRef<number[]>(new Array(64).fill(0));
  const blobPhaseRef = useRef<number[]>([]);

  if (blobPhaseRef.current.length === 0) {
    for (let i = 0; i < 8; i++) {
      blobPhaseRef.current.push(Math.random() * Math.PI * 2);
    }
  }

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const isActive = mode !== "idle";
      const dt =
        mode === "idle" ? 0.006 : 0.01 + smoothVolumeRef.current * 0.008;
      timeRef.current += dt;
      const t = timeRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const baseR = Math.min(width, height) * 0.22;

      const targetVol = isActive ? audioData.volume : 0;
      smoothVolumeRef.current += (targetVol - smoothVolumeRef.current) * 0.1;
      const vol = smoothVolumeRef.current;

      for (let i = 0; i < 64; i++) {
        const target = audioData.frequencies[i] || 0;
        smoothFreqsRef.current[i] +=
          (target - smoothFreqsRef.current[i]) * 0.12;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const configs: Record<
        OrbMode,
        {
          blobs: { hue: number; sat: number; light: number; alpha: number }[];
          coreColor: string;
          coreColorMid: string;
          glowColor: string;
          edgeColor: string;
          particleColor: string;
        }
      > = {
        idle: {
          blobs: [
            { hue: 220, sat: 100, light: 55, alpha: 0.25 },
            { hue: 260, sat: 90, light: 50, alpha: 0.2 },
            { hue: 200, sat: 99, light: 50, alpha: 0.2 },
            { hue: 240, sat: 81, light: 45, alpha: 0.18 },
            { hue: 280, sat: 72, light: 50, alpha: 0.18 },
          ],
          coreColor: "rgba(50, 80, 245, VAL)",
          coreColorMid: "rgba(80, 105, 245, VAL)",
          glowColor: "rgba(50, 80, 245, VAL)",
          edgeColor: "rgba(65, 100, 248, VAL)",
          particleColor: "rgba(50, 80, 245, VAL)",
        },
        listening: {
          blobs: [
            { hue: 210, sat: 100, light: 55, alpha: 0.55 },
            { hue: 270, sat: 100, light: 50, alpha: 0.5 },
            { hue: 320, sat: 100, light: 50, alpha: 0.45 },
            { hue: 180, sat: 100, light: 45, alpha: 0.4 },
            { hue: 250, sat: 100, light: 48, alpha: 0.4 },
            { hue: 340, sat: 100, light: 55, alpha: 0.35 },
            { hue: 190, sat: 100, light: 50, alpha: 0.3 },
          ],
          coreColor: "rgba(20, 55, 255, VAL)",
          coreColorMid: "rgba(40, 75, 255, VAL)",
          glowColor: "rgba(15, 65, 255, VAL)",
          edgeColor: "rgba(30, 85, 255, VAL)",
          particleColor: "rgba(15, 65, 255, VAL)",
        },
        processing: {
          blobs: [
            { hue: 210, sat: 100, light: 48, alpha: 0.4 },
            { hue: 260, sat: 100, light: 45, alpha: 0.35 },
            { hue: 300, sat: 100, light: 48, alpha: 0.3 },
            { hue: 180, sat: 100, light: 45, alpha: 0.3 },
            { hue: 240, sat: 100, light: 45, alpha: 0.28 },
          ],
          coreColor: "rgba(30, 55, 250, VAL)",
          coreColorMid: "rgba(55, 75, 255, VAL)",
          glowColor: "rgba(20, 55, 250, VAL)",
          edgeColor: "rgba(40, 75, 255, VAL)",
          particleColor: "rgba(25, 65, 250, VAL)",
        },
        speaking: {
          blobs: [
            { hue: 160, sat: 100, light: 45, alpha: 0.55 },
            { hue: 200, sat: 100, light: 45, alpha: 0.5 },
            { hue: 280, sat: 100, light: 48, alpha: 0.4 },
            { hue: 170, sat: 100, light: 45, alpha: 0.45 },
            { hue: 220, sat: 100, light: 45, alpha: 0.38 },
            { hue: 140, sat: 100, light: 45, alpha: 0.35 },
            { hue: 300, sat: 100, light: 48, alpha: 0.3 },
          ],
          coreColor: "rgba(0, 230, 140, VAL)",
          coreColorMid: "rgba(0, 245, 165, VAL)",
          glowColor: "rgba(0, 220, 135, VAL)",
          edgeColor: "rgba(0, 235, 148, VAL)",
          particleColor: "rgba(0, 230, 148, VAL)",
        },
      };

      const config = configs[mode];
      const blobs = config.blobs;

      // Background glow — soft shadow/color wash on white
      ctx.save();
      const bgGlowSize = baseR * (2.5 + vol * 1.0);
      const bgGlowAlpha = mode === "idle" ? 0.06 : 0.1 + vol * 0.08;
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy,
        baseR * 0.3,
        cx,
        cy,
        bgGlowSize,
      );
      bgGrad.addColorStop(
        0,
        config.glowColor.replace("VAL", String(bgGlowAlpha)),
      );
      bgGrad.addColorStop(
        0.5,
        config.glowColor.replace("VAL", String(bgGlowAlpha * 0.3)),
      );
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, bgGlowSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Blob layers — using source-over (normal blending) for white BG
      ctx.save();
      const blurAmount = baseR * (mode === "idle" ? 0.38 : 0.28 + vol * 0.06);
      ctx.filter = `blur(${blurAmount}px)`;

      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];
        const phase = blobPhaseRef.current[i] ?? i * 1.3;
        const orbitSpeed = 0.2 + i * 0.05;
        const orbitRadius = baseR * (0.25 + 0.15 * Math.sin(t * 0.3 + phase));
        const noiseX = fbm(i * 1.7, t * 0.3 + phase, t * 0.2) * baseR * 0.35;
        const noiseY = fbm(t * 0.3 + phase, i * 1.7, t * 0.25) * baseR * 0.35;
        const volPush = vol * baseR * 0.4;
        const angle = t * orbitSpeed + phase;
        const bx = cx + Math.cos(angle) * (orbitRadius + volPush) + noiseX;
        const by = cy + Math.sin(angle) * (orbitRadius + volPush) + noiseY;
        const freqIdx = Math.floor((i / blobs.length) * 32);
        const freqVal = smoothFreqsRef.current[freqIdx] ?? 0;
        const blobR =
          baseR *
          (0.55 + 0.1 * Math.sin(t * 0.7 + phase) + vol * 0.35 + freqVal * 0.2);
        const dynamicAlpha =
          mode === "idle"
            ? blob.alpha
            : blob.alpha * (0.7 + vol * 0.6 + freqVal * 0.3);
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blobR);
        grad.addColorStop(
          0,
          `hsla(${blob.hue}, ${blob.sat}%, ${blob.light}%, ${dynamicAlpha})`,
        );
        grad.addColorStop(
          0.4,
          `hsla(${blob.hue}, ${blob.sat}%, ${blob.light}%, ${dynamicAlpha * 0.5})`,
        );
        grad.addColorStop(
          0.7,
          `hsla(${blob.hue}, ${blob.sat}%, ${blob.light}%, ${dynamicAlpha * 0.15})`,
        );
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, blobR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Core glow
      ctx.save();
      const coreBlur = baseR * 0.2;
      ctx.filter = `blur(${coreBlur}px)`;
      const coreR = baseR * (0.4 + vol * 0.25);
      const coreAlpha = mode === "idle" ? 0.2 : 0.35 + vol * 0.5;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(
        0,
        config.coreColor.replace("VAL", String(coreAlpha)),
      );
      coreGrad.addColorStop(
        0.35,
        config.coreColorMid.replace("VAL", String(coreAlpha * 0.4)),
      );
      coreGrad.addColorStop(
        0.7,
        config.coreColorMid.replace("VAL", String(coreAlpha * 0.08)),
      );
      coreGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Specular highlight — subtle white/light accent still works on white as a brighter spot
      ctx.save();
      ctx.filter = `blur(${baseR * 0.15}px)`;
      const specAngle = t * 0.5;
      const specDist = baseR * (0.28 + vol * 0.12);
      const specX =
        cx + Math.cos(specAngle) * specDist + Math.sin(t * 0.8) * baseR * 0.1;
      const specY = cy + Math.sin(specAngle * 0.7) * specDist * 0.7;
      const specR = baseR * (0.25 + vol * 0.1);
      const specAlpha = mode === "idle" ? 0.06 : 0.1 + vol * 0.1;
      const specGrad = ctx.createRadialGradient(
        specX,
        specY,
        0,
        specX,
        specY,
        specR,
      );
      specGrad.addColorStop(0, `rgba(255,255,255,${specAlpha * 1.5})`);
      specGrad.addColorStop(0.4, `rgba(220,230,255,${specAlpha * 0.4})`);
      specGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(specX, specY, specR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Edge ring
      if (mode !== "idle") {
        ctx.save();
        ctx.filter = `blur(${2 + vol * 5}px)`;
        const ringR = baseR * (1.0 + vol * 0.25 + Math.sin(t * 0.6) * 0.03);
        const ringAlpha = 0.1 + vol * 0.2;
        ctx.beginPath();
        const ringSeg = 120;
        for (let i = 0; i <= ringSeg; i++) {
          const a = (i / ringSeg) * Math.PI * 2;
          const noise =
            fbm(Math.cos(a) * 2, Math.sin(a) * 2, t * 0.5) *
            baseR *
            0.06 *
            (1 + vol * 2);
          const r = ringR + noise;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = config.edgeColor.replace("VAL", String(ringAlpha));
        ctx.lineWidth = 1.5 + vol * 2;
        ctx.stroke();
        const ring2R = baseR * (1.25 + vol * 0.35);
        const ring2Alpha = ringAlpha * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, ring2R, 0, Math.PI * 2);
        ctx.strokeStyle = config.edgeColor.replace("VAL", String(ring2Alpha));
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // Particles
      if (mode !== "idle" && vol > 0.008) {
        ctx.save();
        const pCount = Math.floor(6 + vol * 30);
        for (let p = 0; p < pCount; p++) {
          const seed = p * 137.508;
          const pAngle = ((seed + t * 35) % 360) * (Math.PI / 180);
          const drift = Math.sin(t * 0.8 + seed * 0.01) * 0.5 + 0.5;
          const pDist = baseR * (0.9 + drift * 0.8 + vol * 0.5);
          const px = cx + Math.cos(pAngle) * pDist;
          const py = cy + Math.sin(pAngle) * pDist;
          const pSize = 0.8 + Math.sin(t * 2 + seed * 0.05) * 0.6 + vol * 1.5;
          const pAlpha =
            (0.15 + vol * 0.4) * (0.5 + Math.sin(t + seed * 0.03) * 0.5);
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = config.particleColor.replace("VAL", String(pAlpha));
          ctx.fill();
        }
        ctx.restore();
      }
    },
    [audioData, mode],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
  );
}
