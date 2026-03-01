"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  Briefcase,
  Heart,
  Users,
  Wallet,
  LayoutDashboard,
  ChevronRight,
  Target,

} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

const USER_ID = "c6e7e6ea-6ab5-46ce-a37a-d131fb5669e0";

interface Board {
  id: string;
  name: string;
  type: string;
  have_board_goals: boolean;
  goal_description: string | null;
  goal_target_amount: number | null;
}

interface UserBoard {
  role: string;
  board_id: string;
  boards: Board;
}

const TYPE_META: Record<string, { icon: typeof Briefcase; bg: string; text: string; dot: string }> = {
  work: { icon: Briefcase, bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  personal: { icon: Wallet, bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  friend: { icon: Users, bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  spouse: { icon: Heart, bg: "bg-rose-50", text: "text-rose-500", dot: "bg-rose-500" },
};
const FALLBACK = { icon: LayoutDashboard, bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" };

function typeMeta(type: string) {
  return TYPE_META[type?.toLowerCase()] ?? FALLBACK;
}

// Deterministic hash → pseudo-progress %
function hashProgress(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 60) + 20;
}

export default function Home() {
  const router = useRouter();
  const [boards, setBoards] = useState<UserBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", USER_ID)
        .single();
      if (user) setUserName(`${user.first_name} ${user.last_name}`);

      const { data, error } = await supabase
        .from("user_boards")
        .select(`role, board_id,
          boards (id, name, type, have_board_goals, goal_description, goal_target_amount)`)
        .eq("user_id", USER_ID);
      if (!error && data) setBoards(data as unknown as UserBoard[]);
      setLoading(false);
    };

    fetchData();
    const id = setInterval(fetchData, 500);
    return () => clearInterval(id);
  }, []);

  const goalBoards = boards.filter(b => b.boards.have_board_goals).length;

  return (
    <div className="min-h-full">
      {/* ── Hero band ── */}
      <div className="bg-white border-b border-zinc-200 px-8 py-10">
        <div className="max-w-4xl">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">Overview</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-zinc-900 leading-none mb-2">
            {loading ? (
              <Skeleton className="h-12 w-48" />
            ) : (
              userName.split(" ")[0] + "'s Boards"
            )}
          </h1>
          <p className="text-zinc-400 text-sm mt-3 leading-relaxed max-w-md">
            Track spending and goals across all your social circles.
          </p>

          {/* Hero stat pills */}
          {!loading && (
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-full px-4 py-2">
                <span className="text-zinc-900 font-bold text-lg tabular-nums tracking-tight">{boards.length}</span>
                <span className="text-zinc-500 text-xs font-medium">boards</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-full px-4 py-2">
                <Target className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-zinc-900 font-bold text-lg tabular-nums tracking-tight">{goalBoards}</span>
                <span className="text-zinc-500 text-xs font-medium">with goals</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="px-8 py-8 max-w-5xl">

        {/* Board grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <BoardCardSkeleton key={i} />)}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-zinc-500">No {filter === "all" ? "" : filter} boards found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map(ub => {
              const b = ub.boards;
              const meta = typeMeta(b.type);
              const Icon = meta.icon;
              const pct = b.goal_target_amount ? hashProgress(b.id) : null;

              return (
                <Card
                  key={b.id}
                  onClick={() => router.push(`/board/${b.id}`)}
                  className="group cursor-pointer bg-white border-zinc-200/80 shadow-none hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:border-zinc-300 transition-all duration-200 active:scale-[0.98] gap-0 py-0 overflow-hidden"
                >
                  {/* Card top stripe */}
                  <div className={cn("h-1 w-full", meta.dot)} />

                  <CardContent className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", meta.bg)}>
                        <Icon className={cn("h-5 w-5", meta.text)} strokeWidth={1.8} />
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize font-normal text-zinc-500 border-zinc-200">
                        {ub.role}
                      </Badge>
                    </div>

                    {/* Name + desc */}
                    <h3 className="text-sm font-bold text-zinc-900 tracking-tight group-hover:text-indigo-600 transition-colors leading-snug">
                      {b.name}
                    </h3>
                    {b.goal_description && (
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">{b.goal_description}</p>
                    )}

                    {/* Progress */}
                    {pct !== null && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Goal</span>
                          <span className="text-xs font-bold text-zinc-700 tabular-nums">
                            ${b.goal_target_amount!.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1 bg-zinc-100 [&>div]:bg-indigo-500" />
                        <p className="text-[10px] text-zinc-400 mt-1 tabular-nums">{pct}% of goal</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-100">
                      <Badge
                        className={cn("text-[10px] capitalize border-0 font-semibold", meta.bg, meta.text)}
                      >
                        {b.type}
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-150" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BoardCardSkeleton() {
  return (
    <Card className="bg-white border-zinc-200 shadow-none gap-0 py-0 overflow-hidden">
      <div className="h-1 w-full bg-zinc-100" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-36 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4 mb-4" />
        <Skeleton className="h-1 w-full rounded-full mb-4" />
        <div className="flex justify-between pt-4 border-t border-zinc-100">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-3.5 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
