"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Clock,
    X,
    ShoppingBag,
    Tag,
    Store,
    Briefcase,
    Heart,
    Users,
    Wallet,
    LayoutDashboard,
} from "lucide-react";

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
}

interface Transaction {
    id: string;
    amount: number;
    category: string | null;
    merchant: string | null;
    transaction_date: string;
}

const typeConfig: Record<string, { icon: typeof Briefcase; accent: string; bg: string; text: string }> = {
    work: { icon: Briefcase, accent: "bg-[#1e3a5f]", bg: "bg-[#1e3a5f]/[0.07]", text: "text-[#1e3a5f]" },
    personal: { icon: Wallet, accent: "bg-[#5b4a8a]", bg: "bg-[#5b4a8a]/[0.07]", text: "text-[#5b4a8a]" },
    friend: { icon: Users, accent: "bg-[#4a7c6f]", bg: "bg-[#4a7c6f]/[0.07]", text: "text-[#4a7c6f]" },
    spouse: { icon: Heart, accent: "bg-[#8b4a5a]", bg: "bg-[#8b4a5a]/[0.07]", text: "text-[#8b4a5a]" },
};
const fallbackConfig = { icon: LayoutDashboard, accent: "bg-zinc-600", bg: "bg-zinc-600/[0.07]", text: "text-zinc-600" };

function getTypeConfig(type: string) {
    return typeConfig[type?.toLowerCase()] || fallbackConfig;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

const categoryStyles: Record<string, string> = {
    food: "bg-[#c2703e]/10 text-[#c2703e]",
    dining: "bg-[#c2703e]/10 text-[#c2703e]",
    drink: "bg-[#b08830]/10 text-[#b08830]",
    transportation: "bg-[#3a6f8f]/10 text-[#3a6f8f]",
    rideshare: "bg-[#3a6f8f]/10 text-[#3a6f8f]",
    entertainment: "bg-[#8b4a5a]/10 text-[#8b4a5a]",
    shopping: "bg-[#5b4a8a]/10 text-[#5b4a8a]",
    leisure: "bg-[#4a7c6f]/10 text-[#4a7c6f]",
    coffee: "bg-[#7a5c3e]/10 text-[#7a5c3e]",
};

function getCategoryStyle(cat: string | null) {
    if (!cat) return "bg-zinc-100 text-zinc-500";
    return categoryStyles[cat.toLowerCase()] || "bg-zinc-100 text-zinc-500";
}

export default function BoardDetailPage() {
    const params = useParams();
    const router = useRouter();
    const boardId = params.id as string;

    const [board, setBoard] = useState<Board | null>(null);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(false);

    useEffect(() => {
        const fetchBoardData = async () => {
            const { data: boardData } = await supabase
                .from("boards")
                .select("id, name, type, goal_description, goal_target_amount")
                .eq("id", boardId)
                .single();

            if (boardData) setBoard(boardData);

            const { data: eventRows } = await supabase
                .from("events")
                .select("id, title, description, start_time, end_time, location, event_type")
                .eq("board_id", boardId)
                .order("start_time", { ascending: false });

            if (eventRows && eventRows.length > 0) {
                const eventIds = eventRows.map((e) => e.id);
                const { data: txData } = await supabase
                    .from("transactions")
                    .select("event_id, amount")
                    .in("event_id", eventIds);

                const totals: Record<string, number> = {};
                if (txData) {
                    txData.forEach((tx) => {
                        if (tx.event_id) {
                            totals[tx.event_id] = (totals[tx.event_id] || 0) + Number(tx.amount);
                        }
                    });
                }

                setEvents(eventRows.map((ev) => ({ ...ev, totalSpent: totals[ev.id] || 0 })));
            } else {
                setEvents([]);
            }

            setLoading(false);
        };

        fetchBoardData();
        const intervalId = setInterval(fetchBoardData, 500);
        return () => clearInterval(intervalId);
    }, [boardId]);

    const openEventTransactions = (event: EventRow) => {
        setSelectedEvent(event);
        setLoadingTx(true);
    };

    useEffect(() => {
        if (!selectedEvent) return;

        const fetchTransactions = async () => {
            const { data } = await supabase
                .from("transactions")
                .select("id, amount, category, merchant, transaction_date")
                .eq("event_id", selectedEvent.id)
                .order("amount", { ascending: false });

            setTransactions(data || []);
            setLoadingTx(false);
        };

        fetchTransactions();
        const intervalId = setInterval(fetchTransactions, 500);
        return () => clearInterval(intervalId);
    }, [selectedEvent]);

    const config = board ? getTypeConfig(board.type) : fallbackConfig;
    const BoardIcon = config.icon;
    const totalSpent = events.reduce((sum, ev) => sum + (ev.totalSpent || 0), 0);

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-black/[0.06] sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-4">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-900 transition-colors py-2 px-3 -ml-3 rounded-lg hover:bg-zinc-100 active:scale-[0.97]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Boards</span>
                    </button>
                    <div className="h-5 w-px bg-zinc-200/60"></div>
                    <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-lg ${config.bg} flex items-center justify-center`}>
                            <BoardIcon className={`h-3.5 w-3.5 ${config.text}`} strokeWidth={1.8} />
                        </div>
                        <span className="text-[15px] font-semibold text-zinc-900 truncate max-w-[200px] sm:max-w-none tracking-tight">
                            {board?.name || "Loading…"}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="h-8 w-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
                        <p className="text-sm text-zinc-400">Loading board…</p>
                    </div>
                ) : (
                    <>
                        {/* Board header */}
                        {board && (
                            <div className="mb-12">
                                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
                                    {board.name}
                                </h1>
                                {board.goal_description && (
                                    <p className="mt-2 text-[15px] text-zinc-400 max-w-2xl leading-relaxed">
                                        {board.goal_description}
                                    </p>
                                )}

                                {/* Stats */}
                                <div className="flex flex-wrap gap-3 mt-8">
                                    <div className="bg-white ring-1 ring-black/[0.06] rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                        <p className="text-xl font-semibold text-zinc-900 tracking-tight tabular-nums">{events.length}</p>
                                        <p className="text-[11px] font-medium text-zinc-400 mt-1 uppercase tracking-wider">Events</p>
                                    </div>
                                    <div className="bg-white ring-1 ring-black/[0.06] rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                        <p className="text-xl font-semibold text-zinc-900 tracking-tight tabular-nums">
                                            ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[11px] font-medium text-zinc-400 mt-1 uppercase tracking-wider">Total Spent</p>
                                    </div>
                                    {board.goal_target_amount != null && (
                                        <div className="bg-white ring-1 ring-black/[0.06] rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                            <p className="text-xl font-semibold text-zinc-900 tracking-tight tabular-nums">${board.goal_target_amount.toLocaleString()}</p>
                                            <p className="text-[11px] font-medium text-zinc-400 mt-1 uppercase tracking-wider">Goal</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Events */}
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 px-4">
                                <div className="bg-white ring-1 ring-black/[0.06] rounded-2xl p-14 text-center max-w-sm w-full flex flex-col items-center gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                    <div className="w-14 h-14 bg-zinc-100 rounded-xl flex items-center justify-center">
                                        <Calendar className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-zinc-900">No events yet</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Events from your Google Calendar will appear here once synced.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider mb-4">Events</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {events.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={() => openEventTransactions(event)}
                                            className="group bg-white ring-1 ring-black/[0.06] rounded-2xl p-6 sm:p-7 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:ring-black/[0.12] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col gap-3"
                                        >
                                            {/* Title + amount */}
                                            <div className="flex items-start justify-between gap-3">
                                                <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug flex-1 tracking-tight">
                                                    {event.title}
                                                </h3>
                                                {event.totalSpent != null && event.totalSpent > 0 && (
                                                    <span className="text-sm font-semibold text-zinc-900 tabular-nums tracking-tight whitespace-nowrap">
                                                        ${event.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>

                                            {event.description && (
                                                <p className="text-[13px] text-zinc-400 line-clamp-2 leading-relaxed">
                                                    {event.description}
                                                </p>
                                            )}

                                            {/* Meta */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-zinc-400 mt-auto pt-3">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-zinc-300" />
                                                    {formatDate(event.start_time)}
                                                </span>
                                                {event.end_time && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3 text-zinc-300" />
                                                        {formatTime(event.start_time)} – {formatTime(event.end_time)}
                                                    </span>
                                                )}
                                                {event.location && (
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin className="h-3 w-3 text-zinc-300" />
                                                        {event.location}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Transaction Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-md"
                        onClick={() => setSelectedEvent(null)}
                    ></div>
                    <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-[0_24px_64px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] z-10 max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 pb-5 border-b border-zinc-100">
                            <div className="flex-1 min-w-0 pr-4">
                                <h3 className="text-lg font-semibold text-zinc-900 truncate tracking-tight">
                                    {selectedEvent.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-zinc-400">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-zinc-300" />
                                        {formatDate(selectedEvent.start_time)}
                                    </span>
                                    {selectedEvent.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-zinc-300" />
                                            {selectedEvent.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1.5 rounded-lg hover:bg-zinc-100 -mt-1 -mr-1"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Total */}
                        {!loadingTx && transactions.length > 0 && (
                            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-400">Total Spent</span>
                                    <span className="text-xl font-semibold text-zinc-900 tracking-tight tabular-nums">
                                        ${transactions.reduce((s, t) => s + Number(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingTx ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="h-7 w-7 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
                                    <p className="text-sm text-zinc-400">Loading…</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                    <ShoppingBag className="h-8 w-8 text-zinc-200" strokeWidth={1.5} />
                                    <p className="text-sm text-zinc-400">No transactions for this event.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors duration-150"
                                        >
                                            <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                                                <Store className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-zinc-900 truncate">
                                                    {tx.merchant || "Unknown merchant"}
                                                </p>
                                                {tx.category && (
                                                    <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-md capitalize ${getCategoryStyle(tx.category)}`}>
                                                        <Tag className="h-2.5 w-2.5" />
                                                        {tx.category}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-semibold text-zinc-900 whitespace-nowrap tabular-nums tracking-tight">
                                                ${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}