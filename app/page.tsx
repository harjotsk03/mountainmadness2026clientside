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
  MoreHorizontal,
  MoreVertical,
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

const TYPE_META: Record<
  string,
  { icon: typeof Briefcase; bg: string; text: string; dot: string }
> = {
  work: {
    icon: Briefcase,
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-500",
  },
  personal: {
    icon: Wallet,
    bg: "bg-violet-50",
    text: "text-violet-600",
    dot: "bg-violet-500",
  },
  friend: {
    icon: Users,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  spouse: {
    icon: Heart,
    bg: "bg-orange-50",
    text: "text-orange-500",
    dot: "bg-orange-500",
  },
};
const FALLBACK = {
  icon: LayoutDashboard,
  bg: "bg-zinc-100",
  text: "text-zinc-500",
  dot: "bg-zinc-400",
};

/* ── Avatar mappings per board type ── */
const ME_AVATAR =
  "https://media.licdn.com/dms/image/v2/D5603AQEHxze-eoyfPw/profile-displayphoto-scale_200_200/B56ZvYbxGrIQAc-/0/1768862719531?e=1773878400&v=beta&t=buq20infh1VO48BJsHy-JJnkLeLhDOnfZhdidPQwOss";

const BOARD_AVATARS: Record<string, string[]> = {
  partner: [
    ME_AVATAR,
    "https://media.licdn.com/dms/image/v2/D5603AQE1HGEBKNf2Tg/profile-displayphoto-scale_200_200/B56Zv5PSVaK4Ac-/0/1769413093351?e=1773878400&v=beta&t=xrPAu6hJ01w2bTyAIxqA6D__OXDMA_31bbyqGAFIPNo",
  ],
  friend: [
    ME_AVATAR,
    "https://media.licdn.com/dms/image/v2/D5603AQEkcuXVGqvzvw/profile-displayphoto-scale_200_200/B56ZmEOuGMKEAY-/0/1758860077114?e=1773878400&v=beta&t=_6LF9zi4tBnntccErsOQV-wWFKiLXZKoE91AfVL2FZM",
    "https://media.licdn.com/dms/image/v2/D5603AQEX3ACtLO1h1A/profile-displayphoto-scale_200_200/B56Zxt9OM1HUAY-/0/1771371293568?e=1773878400&v=beta&t=n8dyBNA25GG_yZNM7yyQlCz75SFfRgEypBcoqzb_fZU",
  ],
  work: [
    ME_AVATAR,
    "https://media.licdn.com/dms/image/v2/D5603AQGvo327N6sDzA/profile-displayphoto-scale_200_200/B56ZrKAbuMJUAY-/0/1764325703175?e=1773878400&v=beta&t=hNdA8bZrYkEq6RT-OuDB9TRmXohxegqHiag0bdu8YI4",
    "https://media.licdn.com/dms/image/v2/D4E03AQH2_p6g_hD8tw/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1724530876181?e=1773878400&v=beta&t=G1J2NBtE1atRcmHcbKt7wLwKnYYQN4uAuKcbk939bi4",
    "https://media.licdn.com/dms/image/v2/D5603AQENN_lZbzF9KQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1709925886921?e=1773878400&v=beta&t=tuew0hIAhzJl-_ZPShac_D0bAHUl_-0HgftgsmmRK7M",
    "https://media.licdn.com/dms/image/v2/D5603AQHj_itCgQ9I4Q/profile-displayphoto-scale_200_200/B56ZtPvl_TG4Ac-/0/1766569436779?e=1773878400&v=beta&t=TvQm_zmSJtOZQyxUxhykfTKQfaSI4bT8VLM2CLjv-Bs",
  ],
  personal: [ME_AVATAR],
};

const MAX_VISIBLE_AVATARS = 4;

function getAvatarsForType(type: string): string[] {
  const key = type?.toLowerCase();
  return BOARD_AVATARS[key] ?? [ME_AVATAR];
}

function AvatarStack({ avatars }: { avatars: string[] }) {
  const visible = avatars.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = avatars.length - MAX_VISIBLE_AVATARS;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
          style={{ zIndex: visible.length - i }}
        />
      ))}
      {overflow > 0 && (
        <span
          className="w-7 h-7 rounded-full bg-zinc-100 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-zinc-500"
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// Alias so DB value "partner" (or "Partner") uses spouse theme
const TYPE_ALIASES: Record<string, string> = { partner: "spouse" };

function typeMeta(type: string) {
  const key = type?.toLowerCase();
  const resolved = TYPE_ALIASES[key] ?? key;
  return TYPE_META[resolved] ?? FALLBACK;
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
        .select(
          `role, board_id,
          boards (id, name, type, have_board_goals, goal_description, goal_target_amount)`,
        )
        .eq("user_id", USER_ID);
      if (!error && data) setBoards(data as unknown as UserBoard[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const goalBoards = boards.filter((b) => b.boards.have_board_goals).length;

  return (
    <div className="min-h-full">
      {/* Safelist so Tailwind includes type-meta classes (work/personal/friend/spouse) */}
      <div
        className="hidden bg-blue-500 bg-blue-50 text-blue-600 bg-violet-500 bg-violet-50 text-violet-600 bg-emerald-500 bg-emerald-50 text-emerald-600 bg-orange-500 bg-orange-50 text-orange-500 bg-zinc-400 bg-zinc-100 text-zinc-500"
        aria-hidden
      />
      {/* ── Hero band ── */}
      <div className="bg-white border-b border-zinc-200 px-8 py-10">
        <div className="max-w-4xl">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Overview
          </p>
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
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="px-8 py-8 w-full">
        {/* Board grid */}
        {loading ? (
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <BoardCardSkeleton key={i} />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center">
              <LayoutDashboard
                className="h-5 w-5 text-zinc-400"
                strokeWidth={1.5}
              />
            </div>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((ub) => {
              const b = ub.boards;
              const meta = typeMeta(b.type);
              const Icon = meta.icon;
              const pct = b.goal_target_amount ? hashProgress(b.id) : null;
              const avatars = getAvatarsForType(b.type);

              return (
                <Card
                  key={b.id}
                  onClick={() => router.push(`/board/${b.id}`)}
                  className="group cursor-pointer min-h-44 w-full min-w-0 bg-white border-zinc-200/80 hover:border-blue-400 transition-all duration-300 ease-in-out active:scale-[0.98] gap-0 py-0 overflow-hidden"
                >
                  <CardContent className="p-5 justify-between flex flex-col h-full">
                    <div className="w-full gap-2 flex flex-row justify-between items-start">
                      <div>
                        {/* Name + desc */}
                        <h3 className="font-bold text-lg text-zinc-900 tracking-tight transition-all duration-300 ease-in-out leading-snug">
                          {b.name}
                        </h3>
                        {b.goal_description && (
                          <p className="text-sm text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                            {b.goal_description}
                          </p>
                        )}
                      </div>
                      <div>
                        <MoreHorizontal size={18} />
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-full pt-4 border-t border-zinc-100">
                      <AvatarStack avatars={avatars} />
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-150" />
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
    <Card className="w-full min-w-0 bg-white border-zinc-200 shadow-none gap-0 py-0 overflow-hidden">
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
