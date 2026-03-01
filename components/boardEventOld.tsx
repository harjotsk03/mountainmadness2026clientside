import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EventSuggestions } from "@/components/event-suggestions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

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

interface BoardEventOldProps {
  loading: boolean;
  events: EventRow[];
  selectedEvent: EventRow | null;
  setSelectedEvent: (event: EventRow | null) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  transactions: Transaction[];
  loadingTx: boolean;
}

const TX_DOTS: Record<string, string> = {
  food: "bg-orange-400",
  dining: "bg-orange-400",
  drink: "bg-amber-400",
  coffee: "bg-amber-600",
  transportation: "bg-sky-400",
  rideshare: "bg-sky-400",
  entertainment: "bg-pink-400",
  shopping: "bg-violet-400",
  leisure: "bg-teal-400",
};

function txDot(cat: string | null) {
  return cat ? (TX_DOTS[cat.toLowerCase()] ?? "bg-zinc-300") : "bg-zinc-300";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function FeedSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
      {[1, 2, 3, 4].map((i) => (
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
      {[1, 2, 3].map((i) => (
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

export default function BoardEventOld({
  loading,
  events,
  selectedEvent,
  setSelectedEvent,
  sheetOpen,
  setSheetOpen,
  transactions,
  loadingTx,
}: BoardEventOldProps) {
  return (
    <>
      {/* ── Full-width event feed ── */}
      <div className="flex-1 px-8 py-7 h-[70vh] overflow-y-scroll">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
            Events
          </h2>
          {!loading && (
            <Badge
              variant="secondary"
              className="text-[10px] tabular-nums bg-white border-zinc-200"
            >
              {events.length} total
            </Badge>
          )}
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-zinc-500">No events yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
            {events.map((event, idx) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setSheetOpen(true);
                }}
                className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 active:bg-zinc-100 transition-colors group"
              >
                {/* Index */}
                <span className="tabular-nums text-[11px] font-semibold text-zinc-300 w-5 shrink-0 text-right">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="w-1 h-1 rounded-full bg-zinc-300 shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      {fmtDate(event.start_time)}
                    </span>
                    {event.end_time && (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {fmtTime(event.start_time)}–{fmtTime(event.end_time)}
                      </span>
                    )}
                    {event.location && (
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  {event.totalSpent != null && event.totalSpent > 0 && (
                    <span className="text-sm font-bold text-zinc-900 tabular-nums tracking-tight">
                      {fmtMoney(event.totalSpent)}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Transaction Sheet ── */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedEvent(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto bg-white border-l border-zinc-200"
        >
          {selectedEvent && (
            <>
              <SheetHeader className="pb-4 border-b border-zinc-100">
                <SheetTitle className="text-base font-bold tracking-tight text-zinc-900">
                  {selectedEvent.title}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal gap-1 border-zinc-200"
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    {fmtDate(selectedEvent.start_time)}
                  </Badge>
                  {selectedEvent.location && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal gap-1 border-zinc-200"
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      {selectedEvent.location}
                    </Badge>
                  )}
                </SheetDescription>
              </SheetHeader>

              {/* Total */}
              {!loadingTx && transactions.length > 0 && (
                <div className="px-4 py-5 bg-zinc-50 border-b border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold tracking-tighter text-zinc-900 tabular-nums">
                    {fmtMoney(
                      transactions.reduce((s, t) => s + Number(t.amount), 0),
                    )}
                  </p>
                </div>
              )}

              {/* Transaction timeline */}
              <div className="px-4 py-6">
                {loadingTx ? (
                  <TxSkeleton />
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center">
                      <ShoppingBag
                        className="h-5 w-5 text-zinc-400"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-sm text-zinc-400">
                      No transactions for this event.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[5px] top-2 bottom-2 w-px bg-zinc-200" />
                    <div className="space-y-0">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="relative flex gap-4 pb-6 last:pb-0"
                        >
                          <div className="relative z-10 pt-0.5">
                            <div
                              className={cn(
                                "w-3 h-3 rounded-full ring-2 ring-white",
                                txDot(tx.category),
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                  {tx.merchant || "Unknown merchant"}
                                </p>
                                {tx.category && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] capitalize mt-1 bg-zinc-100 text-zinc-500 border-0"
                                  >
                                    {tx.category}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-bold text-zinc-900 tabular-nums tracking-tight whitespace-nowrap shrink-0">
                                {fmtMoney(Number(tx.amount))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Smart spending suggestions */}
              <EventSuggestions eventId={selectedEvent.id} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
