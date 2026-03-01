"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, Lightbulb, DollarSign, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

/* ── Types ── */
interface Suggestion {
    id: number;
    suggestion: string | null;
    explanation: string | null;
    potential_savings: number | null;
    confidence: number | null;
    votes: number | null;
    is_completed: boolean | null;
    confetti_shown: boolean | null;
}

interface EventSuggestionsProps {
    eventId: string;
    onPredictedAmountChange?: (deduction: number) => void;
}

/* ── Confetti burst helper ── */
function blastConfetti() {
    const end = Date.now() + 1200;
    const colors = ["#4F46E5", "#818CF8", "#6366F1", "#A78BFA", "#C7D2FE"];
    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

/* ═══════════════════════════════════════════
   EventSuggestions — renders inside the Sheet
   ═══════════════════════════════════════════ */
export function EventSuggestions({ eventId, onPredictedAmountChange }: EventSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingIds, setVotingIds] = useState<Set<number>>(new Set());

    /* ── Fetch suggestions for this event ── */
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const { data } = await supabase
                .from("suggestions")
                .select("id, suggestion, explanation, potential_savings, confidence, votes, is_completed, confetti_shown")
                .eq("event_id", eventId)
                .order("is_completed", { ascending: true })
                .order("votes", { ascending: false });
            if (!cancelled && data) {
                setSuggestions(data);
                setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [eventId]);

    /* ── Silent refetch (no loading state) for after voting ── */
    const refetch = async () => {
        const { data } = await supabase
            .from("suggestions")
            .select("id, suggestion, explanation, potential_savings, confidence, votes, is_completed, confetti_shown")
            .eq("event_id", eventId)
            .order("is_completed", { ascending: true })
            .order("votes", { ascending: false });
        if (data) setSuggestions(data);
    };

    /* ── Vote handler ── */
    const handleVote = async (s: Suggestion) => {
        if (votingIds.has(s.id) || s.is_completed) return;

        setVotingIds(prev => new Set(prev).add(s.id));
        const newVotes = (s.votes ?? 0) + 1;
        const justCompleted = newVotes >= 3;

        // Optimistic update
        setSuggestions(prev =>
            prev.map(item =>
                item.id === s.id
                    ? { ...item, votes: newVotes, is_completed: justCompleted || item.is_completed }
                    : item
            )
        );

        // Persist
        const updates: Record<string, unknown> = { votes: newVotes };
        if (justCompleted) {
            updates.is_completed = true;
            updates.confetti_shown = true;
        }
        await supabase.from("suggestions").update(updates).eq("id", s.id);

        // Deduct half of potential_savings from event's predicted_amount
        if (justCompleted && s.potential_savings != null && s.potential_savings > 0) {
            const deduction = s.potential_savings / 2;
            // Fetch current predicted_amount, then update
            const { data: eventData } = await supabase
                .from("events")
                .select("predicted_amount")
                .eq("id", eventId)
                .single();
            if (eventData?.predicted_amount != null) {
                const newAmount = Math.max(0, eventData.predicted_amount - deduction);
                await supabase.from("events").update({ predicted_amount: newAmount }).eq("id", eventId);
                onPredictedAmountChange?.(deduction);
            }
        }

        // Confetti!
        if (justCompleted) blastConfetti();

        // Re-fetch to get the canonical order
        await refetch();
        setVotingIds(prev => {
            const next = new Set(prev);
            next.delete(s.id);
            return next;
        });
    };

    /* ── Sort: active first, completed last ── */
    const sorted = [...suggestions].sort((a, b) => {
        const ac = a.is_completed ? 1 : 0;
        const bc = b.is_completed ? 1 : 0;
        return ac - bc;
    });

    if (loading) return <SuggestionsSkeleton />;
    if (sorted.length === 0) return null; // no suggestions for this event

    return (
        <div className="px-4 py-5 border-t border-zinc-100">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center">
                    <Lightbulb className="h-3 w-3 text-indigo-500" />
                </div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Smart Spending</span>
                <Badge variant="secondary" className="text-[10px] tabular-nums bg-zinc-100 border-0 text-zinc-500 ml-auto">
                    {sorted.length}
                </Badge>
            </div>

            {/* Suggestion cards */}
            <div className="space-y-2.5">
                {sorted.map(s => (
                    <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        voting={votingIds.has(s.id)}
                        onVote={() => handleVote(s)}
                    />
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════
   SuggestionCard — single suggestion
   ═══════════════════════════════════ */
interface SuggestionCardProps {
    suggestion: Suggestion;
    voting: boolean;
    onVote: () => void;
}

function SuggestionCard({ suggestion: s, voting, onVote }: SuggestionCardProps) {
    const completed = s.is_completed === true;
    const votes = s.votes ?? 0;
    const confidence = s.confidence ? Math.round(s.confidence * 100) : null;

    return (
        <div
            className={cn(
                "rounded-xl border p-4 transition-all duration-300",
                completed
                    ? "bg-indigo-50/50 border-indigo-200/60"
                    : "bg-white border-zinc-200 hover:border-zinc-300"
            )}
        >
            {/* Top row: suggestion text + completed badge */}
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        completed ? "bg-indigo-100" : "bg-zinc-100"
                    )}
                >
                    {completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                        <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p
                        className={cn(
                            "text-[13px] font-semibold leading-snug",
                            completed ? "text-indigo-700" : "text-zinc-900"
                        )}
                    >
                        {s.suggestion}
                    </p>

                    {s.explanation && (
                        <p className={cn(
                            "text-[11px] mt-1 leading-relaxed",
                            completed ? "text-indigo-500/70" : "text-zinc-400"
                        )}>
                            {s.explanation}
                        </p>
                    )}

                    {/* Meta row: savings + confidence */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {s.potential_savings != null && s.potential_savings > 0 && (
                            <Badge
                                className={cn(
                                    "text-[10px] font-semibold gap-1 border-0",
                                    completed ? "bg-indigo-100 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                )}
                            >
                                <DollarSign className="h-2.5 w-2.5" />
                                Save ${s.potential_savings}
                            </Badge>
                        )}
                        {confidence !== null && (
                            <div className="flex items-center gap-1.5">
                                <Progress
                                    value={confidence}
                                    className={cn(
                                        "h-1 w-10",
                                        completed
                                            ? "bg-indigo-100 [&>div]:bg-indigo-400"
                                            : "bg-zinc-100 [&>div]:bg-zinc-400"
                                    )}
                                />
                                <span className={cn(
                                    "text-[10px] tabular-nums font-medium",
                                    completed ? "text-indigo-400" : "text-zinc-400"
                                )}>
                                    {confidence}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Vote bar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                {/* Vote count */}
                <div className="flex items-center gap-1.5">
                    <span className={cn(
                        "text-[11px] tabular-nums font-bold",
                        completed ? "text-indigo-500" : "text-zinc-400"
                    )}>
                        {votes}/3
                    </span>
                    <span className={cn(
                        "text-[10px] font-medium",
                        completed ? "text-indigo-400" : "text-zinc-400"
                    )}>
                        votes
                    </span>
                    {completed && (
                        <Badge className="text-[9px] bg-indigo-100 text-indigo-600 border-0 ml-1">
                            Adopted
                        </Badge>
                    )}
                </div>

                {/* Thumbs up button */}
                <button
                    onClick={e => { e.stopPropagation(); onVote(); }}
                    disabled={completed || voting}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150",
                        completed
                            ? "bg-indigo-100 text-indigo-400 cursor-default"
                            : voting
                                ? "bg-zinc-100 text-zinc-300 cursor-wait"
                                : "bg-zinc-100 text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
                    )}
                >
                    <ThumbsUp className={cn("h-3 w-3", voting && "animate-pulse")} />
                    {completed ? "Done" : voting ? "..." : "Vote"}
                </button>
            </div>
        </div>
    );
}

/* ── Loading skeleton ── */
function SuggestionsSkeleton() {
    return (
        <div className="px-4 py-5 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-2.5">
                {[1, 2].map(i => (
                    <div key={i} className="rounded-xl border border-zinc-200 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <Skeleton className="w-7 h-7 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-zinc-100">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-7 w-16 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
