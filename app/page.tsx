"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  Briefcase,
  Heart,
  Users,
  Wallet,
  Target,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

const USER_ID = "c6e7e6ea-6ab5-46ce-a37a-d131fb5669e0";

interface Board {
  id: string;
  name: string;
  type: string;
  have_board_goals: boolean;
  goal_description: string | null;
  goal_target_amount: number | null;
  created_at: string;
}

interface UserBoard {
  role: string;
  board_id: string;
  boards: Board;
}

const typeConfig: Record<string, { icon: typeof Briefcase; accent: string; bg: string; text: string }> = {
  work: {
    icon: Briefcase,
    accent: "bg-[#1e3a5f]",
    bg: "bg-[#1e3a5f]/[0.07]",
    text: "text-[#1e3a5f]",
  },
  personal: {
    icon: Wallet,
    accent: "bg-[#5b4a8a]",
    bg: "bg-[#5b4a8a]/[0.07]",
    text: "text-[#5b4a8a]",
  },
  friend: {
    icon: Users,
    accent: "bg-[#4a7c6f]",
    bg: "bg-[#4a7c6f]/[0.07]",
    text: "text-[#4a7c6f]",
  },
  spouse: {
    icon: Heart,
    accent: "bg-[#8b4a5a]",
    bg: "bg-[#8b4a5a]/[0.07]",
    text: "text-[#8b4a5a]",
  },
};

const fallbackConfig = {
  icon: LayoutDashboard,
  accent: "bg-zinc-600",
  bg: "bg-zinc-600/[0.07]",
  text: "text-zinc-600",
};

function getTypeConfig(type: string) {
  return typeConfig[type?.toLowerCase()] || fallbackConfig;
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

      if (user) {
        setUserName(`${user.first_name}`);
      }

      const { data, error } = await supabase
        .from("user_boards")
        .select(`
          role,
          board_id,
          boards (
            id,
            name,
            type,
            have_board_goals,
            goal_description,
            goal_target_amount,
            created_at
          )
        `)
        .eq("user_id", USER_ID);

      if (!error && data) {
        setBoards(data as unknown as UserBoard[]);
      }

      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-black/[0.06] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm leading-none">H</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Huddle Up</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-zinc-400">{userName}</span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-semibold ring-1 ring-black/[0.06]">
              {userName?.[0] || "?"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Greeting */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            {userName ? `Welcome back, ${userName}` : "Your Boards"}
          </h1>
          <p className="mt-2 text-[15px] text-zinc-400 max-w-lg">
            Track spending across your social circles and get smarter about your money.
          </p>
        </div>

        {/* Stats */}
        {!loading && boards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            <StatCard label="Total Boards" value={boards.length} />
            <StatCard
              label="With Goals"
              value={boards.filter((b) => b.boards.have_board_goals).length}
            />
            <StatCard
              label="Work"
              value={boards.filter((b) => b.boards.type?.toLowerCase() === "work").length}
            />
            <StatCard
              label="Personal"
              value={boards.filter((b) => b.boards.type?.toLowerCase() === "personal").length}
            />
          </div>
        )}

        {/* Board Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="h-8 w-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400">Loading boards…</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center py-24 px-4">
            <div className="bg-white ring-1 ring-black/[0.06] rounded-2xl p-14 text-center max-w-sm w-full flex flex-col items-center gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="w-14 h-14 bg-zinc-100 rounded-xl flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">No boards found</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                There are no boards linked to this account yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((ub) => {
              const board = ub.boards;
              const config = getTypeConfig(board.type);
              const Icon = config.icon;
              return (
                <button
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="group bg-white ring-1 ring-black/[0.06] rounded-2xl text-left cursor-pointer flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:ring-black/[0.12] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all duration-200"
                >
                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    {/* Icon + Badge */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                        <Icon className={`h-[18px] w-[18px] ${config.text}`} strokeWidth={1.8} />
                      </div>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${config.bg} ${config.text} capitalize`}>
                        {board.type}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-[16px] font-semibold text-zinc-900 leading-snug tracking-tight">
                      {board.name}
                    </h3>

                    {/* Description */}
                    {board.goal_description && (
                      <p className="text-[13px] text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                        {board.goal_description}
                      </p>
                    )}

                    <div className="flex-1 min-h-[16px]"></div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-5 pt-5 border-t border-zinc-100">
                      <div className="flex items-center gap-4">
                        {board.goal_target_amount != null && (
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-zinc-300" />
                            <span className="text-sm font-semibold text-zinc-700 tracking-tight tabular-nums">
                              ${board.goal_target_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <span className="text-[11px] text-zinc-400 capitalize font-medium">{ub.role}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white ring-1 ring-black/[0.06] rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <p className="text-2xl font-semibold text-zinc-900 tracking-tight tabular-nums">{value}</p>
      <p className="text-[11px] font-medium text-zinc-400 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
