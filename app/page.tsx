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

const typeConfig: Record<string, { icon: typeof Briefcase; gradient: string; badge: string }> = {
  work: {
    icon: Briefcase,
    gradient: "from-blue-500 to-indigo-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  personal: {
    icon: Wallet,
    gradient: "from-violet-500 to-purple-600",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
  friend: {
    icon: Users,
    gradient: "from-emerald-500 to-teal-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  spouse: {
    icon: Heart,
    gradient: "from-pink-500 to-rose-600",
    badge: "bg-pink-50 text-pink-700 border-pink-200",
  },
};

const fallbackConfig = {
  icon: LayoutDashboard,
  gradient: "from-gray-500 to-slate-600",
  badge: "bg-gray-50 text-gray-700 border-gray-200",
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
      // Fetch user info
      const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", USER_ID)
        .single();

      if (user) {
        setUserName(`${user.first_name}`);
      }

      // Fetch boards via user_boards join
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
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">H</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 uppercase">Huddle Up</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-medium text-gray-500">{userName}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center text-sm font-bold border border-blue-200/50 shadow-sm">
              {userName?.[0] || "?"}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero section */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {userName ? `Hey ${userName} 👋` : "Your Boards"}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-500 max-w-xl">
            Track spending, set goals, and get smart insights across all your social circles.
          </p>
        </div>

        {/* Stats bar */}
        {!loading && boards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Boards" value={boards.length} />
            <StatCard
              label="With Goals"
              value={boards.filter((b) => b.boards.have_board_goals).length}
            />
            <StatCard
              label="Work Boards"
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
            <div className="h-10 w-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400 font-medium">Loading your boards...</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-md w-full flex flex-col items-center gap-5 shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center border border-blue-100/50">
                <LayoutDashboard className="h-9 w-9 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No boards found</h3>
              <p className="text-gray-500 leading-relaxed">
                There are no boards linked to this account yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {boards.map((ub) => {
              const board = ub.boards;
              const config = getTypeConfig(board.type);
              const Icon = config.icon;
              return (
                <button
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 text-left cursor-pointer flex flex-col"
                >
                  {/* Gradient strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`}></div>

                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    {/* Top row: icon + type badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm`}>
                        <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${config.badge}`}>
                        {board.type}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {board.name}
                    </h3>

                    {/* Description */}
                    {board.goal_description && (
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2">
                        {board.goal_description}
                      </p>
                    )}

                    {/* Spacer */}
                    <div className="flex-1 min-h-[12px]"></div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        {board.goal_target_amount != null && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Target className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-semibold text-gray-700">${board.goal_target_amount.toLocaleString()}</span>
                          </div>
                        )}
                        <span className="text-xs text-gray-400 capitalize">{ub.role}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
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
    <div className="bg-white border border-gray-200/80 rounded-xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
