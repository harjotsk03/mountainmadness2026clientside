"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    DollarSign,
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

const typeConfig: Record<string, { icon: typeof Briefcase; gradient: string; accentText: string }> = {
    work: { icon: Briefcase, gradient: "from-blue-500 to-indigo-600", accentText: "text-blue-600" },
    personal: { icon: Wallet, gradient: "from-violet-500 to-purple-600", accentText: "text-violet-600" },
    friend: { icon: Users, gradient: "from-emerald-500 to-teal-600", accentText: "text-emerald-600" },
    spouse: { icon: Heart, gradient: "from-pink-500 to-rose-600", accentText: "text-pink-600" },
};
const fallbackConfig = { icon: LayoutDashboard, gradient: "from-gray-500 to-slate-600", accentText: "text-gray-600" };
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

const categoryColors: Record<string, string> = {
    food: "bg-orange-50 text-orange-700 border-orange-200",
    drink: "bg-amber-50 text-amber-700 border-amber-200",
    transportation: "bg-sky-50 text-sky-700 border-sky-200",
    entertainment: "bg-pink-50 text-pink-700 border-pink-200",
    shopping: "bg-violet-50 text-violet-700 border-violet-200",
    leisure: "bg-teal-50 text-teal-700 border-teal-200",
};

function getCategoryStyle(cat: string | null) {
    if (!cat) return "bg-gray-50 text-gray-600 border-gray-200";
    return categoryColors[cat.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-200";
}

export default function BoardDetailPage() {
    const params = useParams();
    const router = useRouter();
    const boardId = params.id as string;

    const [board, setBoard] = useState<Board | null>(null);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);

    // Transaction modal
    const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(false);

    /* Fetch board + events with total spent */
    useEffect(() => {
        const fetchBoardData = async () => {
            // 1. Fetch board info
            const { data: boardData } = await supabase
                .from("boards")
                .select("id, name, type, goal_description, goal_target_amount")
                .eq("id", boardId)
                .single();

            if (boardData) setBoard(boardData);

            // 2. Fetch events for this board
            const { data: eventRows } = await supabase
                .from("events")
                .select("id, title, description, start_time, end_time, location, event_type")
                .eq("board_id", boardId)
                .order("start_time", { ascending: false });

            if (eventRows && eventRows.length > 0) {
                // 3. Fetch total spent per event via transactions
                const eventIds = eventRows.map((e) => e.id);
                const { data: txData } = await supabase
                    .from("transactions")
                    .select("event_id, amount")
                    .in("event_id", eventIds);

                // Sum amounts per event
                const totals: Record<string, number> = {};
                if (txData) {
                    txData.forEach((tx) => {
                        if (tx.event_id) {
                            totals[tx.event_id] = (totals[tx.event_id] || 0) + Number(tx.amount);
                        }
                    });
                }

                const enriched = eventRows.map((ev) => ({
                    ...ev,
                    totalSpent: totals[ev.id] || 0,
                }));

                setEvents(enriched);
            }

            setLoading(false);
        };

        // Initial fetch
        fetchBoardData();

        // Polling every 500ms
        const intervalId = setInterval(() => {
            fetchBoardData();
        }, 500);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, [boardId]);

    /* Handle opening the modal */
    const openEventTransactions = (event: EventRow) => {
        setSelectedEvent(event);
        setLoadingTx(true); // Show loading state briefly
    };

    /* Fetch transactions for a selected event on a 500ms interval */
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

        // Initial fetch
        fetchTransactions();

        // Polling every 500ms
        const intervalId = setInterval(() => {
            fetchTransactions();
        }, 500);

        // Cleanup interval when modal closes or unmounts
        return () => clearInterval(intervalId);
    }, [selectedEvent]);

    const config = board ? getTypeConfig(board.type) : fallbackConfig;
    const BoardIcon = config.icon;

    /* ─── Render ──────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors py-2 px-3 -ml-3 rounded-lg hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">All Boards</span>
                    </button>
                    <div className="h-5 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center shadow-sm`}>
                            <BoardIcon className="h-4 w-4 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-lg font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                            {board?.name || "Loading..."}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="h-10 w-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-400 font-medium">Loading board...</p>
                    </div>
                ) : (
                    <>
                        {/* Board Header Info */}
                        {board && (
                            <div className="mb-10">
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                                    {board.name}
                                </h1>
                                {board.goal_description && (
                                    <p className="mt-2 text-base sm:text-lg text-gray-500 max-w-2xl">
                                        {board.goal_description}
                                    </p>
                                )}

                                {/* Quick stats */}
                                <div className="flex flex-wrap gap-4 mt-6">
                                    <div className="bg-white border border-gray-200/80 rounded-xl px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                        <p className="text-xl font-bold text-gray-900">{events.length}</p>
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Events</p>
                                    </div>
                                    <div className="bg-white border border-gray-200/80 rounded-xl px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                        <p className="text-xl font-bold text-gray-900">
                                            ${events.reduce((sum, ev) => sum + (ev.totalSpent || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Spent</p>
                                    </div>
                                    {board.goal_target_amount != null && (
                                        <div className="bg-white border border-gray-200/80 rounded-xl px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                            <p className="text-xl font-bold text-gray-900">${board.goal_target_amount.toLocaleString()}</p>
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Goal</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Events Grid */}
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4">
                                <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-md w-full flex flex-col items-center gap-5 shadow-sm">
                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-200/50">
                                        <Calendar className="h-9 w-9 text-gray-300" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">No events yet</h3>
                                    <p className="text-gray-500 leading-relaxed">
                                        Events from your Google Calendar will appear here once synced.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Events</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {events.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={() => openEventTransactions(event)}
                                            className="group bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer flex flex-col gap-3"
                                        >
                                            {/* Title row */}
                                            <div className="flex items-start justify-between gap-3">
                                                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug flex-1">
                                                    {event.title}
                                                </h3>
                                                {event.totalSpent != null && event.totalSpent > 0 && (
                                                    <span className="flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                                        <DollarSign className="h-3.5 w-3.5" />
                                                        {event.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {event.description && (
                                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                                    {event.description}
                                                </p>
                                            )}

                                            {/* Meta row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mt-auto pt-2">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(event.start_time)}
                                                </span>
                                                {event.end_time && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {formatTime(event.start_time)} – {formatTime(event.end_time)}
                                                    </span>
                                                )}
                                                {event.location && (
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5" />
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

            {/* ─── Transaction Detail Modal ─────────────── */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedEvent(null)}
                    ></div>
                    <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
                            <div className="flex-1 min-w-0 pr-4">
                                <h3 className="text-xl font-bold text-gray-900 truncate">
                                    {selectedEvent.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(selectedEvent.start_time)}
                                    </span>
                                    {selectedEvent.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {selectedEvent.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 -mt-1 -mr-1"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Total bar */}
                        {!loadingTx && transactions.length > 0 && (
                            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-500">Total Spent</span>
                                    <span className="text-2xl font-bold text-gray-900">
                                        ${transactions.reduce((s, t) => s + Number(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingTx ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="h-8 w-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm text-gray-400">Loading transactions...</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <ShoppingBag className="h-10 w-10 text-gray-200" strokeWidth={1.5} />
                                    <p className="text-sm text-gray-400 font-medium">No transactions recorded for this event.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center gap-4 p-4 bg-gray-50/80 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            {/* Icon */}
                                            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                <Store className="h-4 w-4 text-gray-400" />
                                            </div>
                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {tx.merchant || "Unknown merchant"}
                                                </p>
                                                {tx.category && (
                                                    <span className={`inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${getCategoryStyle(tx.category)}`}>
                                                        <Tag className="h-3 w-3" />
                                                        {tx.category}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Amount */}
                                            <p className="text-base font-bold text-gray-900 whitespace-nowrap">
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