"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  ShoppingBag,
  Briefcase,
  Heart,
  Users,
  Wallet,
  LayoutDashboard,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import BoardEvent from "@/components/boardEvent";

interface Board {
  id: string;
  name: string;
  type: string;
  goal_description: string | null;
  goal_target_amount: number | null;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  event_type: string | null;
  totalSpent?: number;
  predicted_amount?: number | null;
}

interface Transaction {
  id: string;
  amount: number;
  category: string | null;
  merchant: string | null;
  transaction_date: string;
}

const TYPE_META: Record<string, { icon: typeof Briefcase; bg: string; text: string; dot: string }> = {
  work: { icon: Briefcase, bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  personal: { icon: Wallet, bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  friend: { icon: Users, bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  spouse: { icon: Heart, bg: "bg-rose-50", text: "text-rose-500", dot: "bg-rose-500" },
};
const FALLBACK = { icon: LayoutDashboard, bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" };
function typeMeta(type: string) { return TYPE_META[type?.toLowerCase()] ?? FALLBACK; }

const TX_DOTS: Record<string, string> = {
  food: "bg-orange-400", dining: "bg-orange-400", drink: "bg-amber-400",
  coffee: "bg-amber-600", transportation: "bg-sky-400", rideshare: "bg-sky-400",
  entertainment: "bg-pink-400", shopping: "bg-violet-400", leisure: "bg-teal-400",
};
function txDot(cat: string | null) { return cat ? (TX_DOTS[cat.toLowerCase()] ?? "bg-zinc-300") : "bg-zinc-300"; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BoardDetailPage() {
  const { id: boardId } = useParams<{ id: string }>();
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  /* ── Fetch board + events ── */
  useEffect(() => {
    const fetch = async () => {
      const { data: boardData } = await supabase
        .from("boards")
        .select("id, name, type, goal_description, goal_target_amount")
        .eq("id", boardId)
        .single();
      if (boardData) setBoard(boardData);

      const { data: evRows } = await supabase
        .from("events")
        .select(
          "id, title, description, start_time, end_time, location, event_type, predicted_amount",
        )
        .eq("board_id", boardId)
        .order("start_time", { ascending: false });

      if (evRows?.length) {
        const ids = evRows.map((e) => e.id);
        const { data: txData } = await supabase
          .from("transactions")
          .select("event_id, amount")
          .in("event_id", ids);

        const totals: Record<string, number> = {};
        txData?.forEach((tx) => {
          if (tx.event_id)
            totals[tx.event_id] =
              (totals[tx.event_id] || 0) + Number(tx.amount);
        });
        setEvents(
          evRows.map((ev) => ({ ...ev, totalSpent: totals[ev.id] || 0 })),
        );
      } else {
        setEvents([]);
      }
      setLoading(false);
    };

    fetch();
  }, [boardId]);

  /* ── Fetch transactions when sheet opens ── */
  useEffect(() => {
    if (!selectedEvent || !sheetOpen) return;
    let cancelled = false;
    const fetchTx = async () => {
      setLoadingTx(true);
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, category, merchant, transaction_date")
        .eq("event_id", selectedEvent.id)
        .order("transaction_date", { ascending: true });
      if (!cancelled) {
        setTransactions(data || []);
        setLoadingTx(false);
      }
    };
    fetchTx();
    return () => { cancelled = true; };
  }, [selectedEvent, sheetOpen]);

  const meta = board ? typeMeta(board.type) : FALLBACK;
  const BoardIcon = meta.icon;
  const totalSpent = events.reduce((s, ev) => s + (ev.totalSpent || 0), 0);
  const goalPct = board?.goal_target_amount
    ? Math.min(100, Math.round((totalSpent / board.goal_target_amount) * 100))
    : null;

  return (
    <div className="h-screen flex flex-col">
      {/* ── White top bar with board info + summary ── */}
      <div className="bg-white border-b border-zinc-200 px-8 py-6">
        {/* Back link */}
        <button
          onClick={() => router.push("/")}
          className="flex hover:cursor-pointer items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-xs font-medium mb-5 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          All Boards
        </button>

        {/* Board name row + summary stats */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left — board identity */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-400/15",
              )}
            >
              <BoardIcon
                className={cn("h-6 w-6 text-blue-400")}
                strokeWidth={1.5}
              />
            </div>
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-7 w-40 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-zinc-900 leading-none">
                    {board?.name}
                  </h1>
                  {board?.goal_description && (
                    <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                      {board.goal_description}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right — inline summary stats */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {loading ? (
              <>
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </>
            ) : (
              <>
                {/* Events pill */}
                <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-2.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-zinc-900 font-bold text-base tabular-nums tracking-tight">
                    {events.length}
                  </span>
                  <span className="text-zinc-500 text-xs font-medium">
                    events
                  </span>
                </div>

                {/* Separator */}
                <Separator
                  orientation="vertical"
                  className="h-6 bg-zinc-200 hidden lg:block"
                />

                {/* Total pill */}
                <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-zinc-900 font-bold text-base tabular-nums tracking-tight">
                    {fmtMoney(totalSpent)}
                  </span>
                  <span className="text-zinc-500 text-xs font-medium">
                    spent
                  </span>
                </div>

                {/* Goal pill */}
                {board?.goal_target_amount != null && goalPct !== null && (
                  <>
                    <Separator
                      orientation="vertical"
                      className="h-6 bg-zinc-200 hidden lg:block"
                    />
                    <div className="flex items-center gap-3 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-900 font-bold text-base tabular-nums tracking-tight">
                          {goalPct}%
                        </span>
                        <span className="text-zinc-500 text-xs font-medium">
                          of {fmtMoney(board.goal_target_amount)}
                        </span>
                      </div>
                      <Progress
                        value={goalPct}
                        className="h-1.5 w-16 bg-zinc-200 [&>div]:bg-indigo-500"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Full-width event feed ── */}
      <BoardEvent
        loading={loading}
        events={events}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        transactions={transactions}
        loadingTx={loadingTx}
      />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-3 w-5 rounded" />
          <div className="w-1 h-1 rounded-full bg-zinc-200" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

function TxSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-3 h-3 rounded-full mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}