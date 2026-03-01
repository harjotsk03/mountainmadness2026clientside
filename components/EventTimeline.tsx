"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Clock, X } from "lucide-react";

/* ─────────────────── Types ─────────────────── */

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

interface EventTimelineProps {
  events: EventRow[];
  onSelectEvent?: (event: EventRow) => void;
}

/* ─────────────────── Layout constants ─────────────────── */

const START_DATE = new Date(2025, 10, 1);
const END_DATE = new Date(2026, 10, 1);
const TODAY = new Date(2026, 2, 1);
const DAY_MS = 86_400_000;
const DAY_W = 18; // ← zoomed in (was 9)
const TOTAL_DAYS = Math.round(
  (END_DATE.getTime() - START_DATE.getTime()) / DAY_MS,
);
const TOTAL_W = TOTAL_DAYS * DAY_W;
const GRAPH_H = 160;
const CARD_W = 148;
const CARD_GAP = 12;
const CARD_COL_W = CARD_W + CARD_GAP;

/* ─────────────────── Event-type colours ─────────────────── */

const TYPE_STYLE: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  concert: {
    bg: "bg-rose-50",
    border: "border-rose-500",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
  dining: {
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  coffee: {
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  movie: {
    bg: "bg-violet-50",
    border: "border-violet-500",
    text: "text-violet-700",
    dot: "bg-violet-500",
  },
  entertainment: {
    bg: "bg-sky-50",
    border: "border-sky-500",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
};

const FALLBACK_STYLE = {
  bg: "bg-zinc-50",
  border: "border-zinc-200",
  text: "text-zinc-600",
  dot: "bg-zinc-400",
};

function getStyle(t: string | null) {
  return t ? (TYPE_STYLE[t] ?? FALLBACK_STYLE) : FALLBACK_STYLE;
}

/* ─────────────────── Pure helpers ─────────────────── */

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
function dateToX(d: Date) {
  return daysBetween(START_DATE, d) * DAY_W;
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/* ─────────────────── Weekly spending buckets ─────────────────── */

interface SpendPt {
  x: number;
  actual: number;
  predicted: number;
  weekLabel: string;
}

function buildWeeklySpending(events: EventRow[]) {
  const weekCount = Math.ceil(TOTAL_DAYS / 7);
  const buckets: number[] = new Array(weekCount).fill(0);

  for (const ev of events) {
    if ((ev.totalSpent ?? 0) <= 0) continue;
    const idx = Math.floor(
      daysBetween(START_DATE, new Date(ev.start_time)) / 7,
    );
    if (idx >= 0 && idx < weekCount) buckets[idx] += ev.totalSpent!;
  }

  const todayWeek = Math.floor(daysBetween(START_DATE, TODAY) / 7);
  let maxVal = 0;

  const points: SpendPt[] = buckets.map((val, i) => {
    if (val > maxVal) maxVal = val;
    const weekStart = new Date(START_DATE.getTime() + i * 7 * DAY_MS);
    return {
      x: i * 7 * DAY_W + 3.5 * DAY_W,
      actual: i <= todayWeek ? val : 0,
      predicted: i > todayWeek ? val : 0,
      weekLabel: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
  });

  return { points, maxVal: Math.max(maxVal, 50) };
}

/* ─────────────────── Spending SVG with hover ─────────────────── */

function SpendingGraph({
  points,
  maxVal,
}: {
  points: SpendPt[];
  maxVal: number;
}) {
  const todayX = dateToX(TODAY);
  const pad = { top: 20, bot: 4 };
  const h = GRAPH_H - pad.top - pad.bot;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    val: number;
    label: string;
    isPast: boolean;
  } | null>(null);

  const yFor = (v: number) => pad.top + h - (v / (maxVal * 1.15)) * h;

  // Build coordinate arrays
  const allCoords = useMemo(() => {
    return points.map((p) => {
      const val = p.actual > 0 ? p.actual : p.predicted;
      return {
        x: p.x,
        y: yFor(val),
        val,
        isPast: p.x <= todayX,
        label: p.weekLabel,
      };
    });
  }, [points, maxVal]);

  // Interpolate a point at exactly todayX so past/future lines meet at the TODAY marker
  const { past, future } = useMemo(() => {
    const pastPts = allCoords.filter((c) => c.x <= todayX);
    const futurePts = allCoords.filter((c) => c.x > todayX);

    // If last past point isn't exactly at todayX, interpolate
    if (pastPts.length > 0 && futurePts.length > 0) {
      const lp = pastPts[pastPts.length - 1];
      const ff = futurePts[0];
      if (lp.x < todayX) {
        const t = (todayX - lp.x) / (ff.x - lp.x);
        const interpY = lp.y + t * (ff.y - lp.y);
        const interpVal = lp.val + t * (ff.val - lp.val);
        const bridgePt = {
          x: todayX,
          y: interpY,
          val: interpVal,
          isPast: true,
          label: "Today",
        };
        return {
          past: [...pastPts, bridgePt],
          future: [{ ...bridgePt, isPast: false }, ...futurePts],
        };
      }
      // lp.x === todayX — use it directly as bridge
      return {
        past: pastPts,
        future: [{ ...lp, isPast: false }, ...futurePts],
      };
    }

    return { past: pastPts, future: futurePts };
  }, [allCoords, todayX]);

  function smooth(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return "";
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1],
        c = pts[i],
        mx = (p.x + c.x) / 2;
      d += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`;
    }
    return d;
  }

  function area(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return "";
    return `${smooth(pts)} L${pts[pts.length - 1].x},${GRAPH_H} L${pts[0].x},${GRAPH_H} Z`;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX =
        e.clientX - rect.left + (svgRef.current.parentElement?.scrollLeft ?? 0);

      // Find nearest point
      let closest: (typeof allCoords)[0] | null = null;
      let closestDist = Infinity;
      for (const c of allCoords) {
        const dist = Math.abs(c.x - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = c;
        }
      }
      if (closest && closestDist < 80) {
        setHover({
          x: closest.x,
          y: closest.y,
          val: closest.val,
          label: closest.label,
          isPast: closest.isPast,
        });
      } else {
        setHover(null);
      }
    },
    [allCoords],
  );

  const gridVals = [0, maxVal * 0.5, maxVal];

  return (
    <svg
      ref={svgRef}
      width={TOTAL_W}
      height={GRAPH_H}
      className="block"
      style={{ overflow: "visible" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="gPast" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
        </linearGradient>
        <linearGradient id="gFuture" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
        </linearGradient>
      </defs>

      {/* Horizontal grid */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line
            x1={0}
            x2={TOTAL_W}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="#e4e4e7"
            strokeWidth={0.5}
            strokeDasharray="3 4"
          />
          <text
            x={4}
            y={yFor(v) - 4}
            fill="#a1a1aa"
            fontSize={9}
            fontFamily="system-ui"
          >
            {fmtMoney(Math.round(v))}
          </text>
        </g>
      ))}

      {/* Past */}
      {past.length >= 2 && (
        <>
          <path d={area(past)} fill="url(#gPast)" />
          <path
            d={smooth(past)}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      )}

      {/* Future */}
      {future.length >= 2 && (
        <>
          <path d={area(future)} fill="url(#gFuture)" />
          <path
            d={smooth(future)}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
        </>
      )}

      {/* Today line */}
      <line
        x1={todayX}
        x2={todayX}
        y1={0}
        y2={GRAPH_H}
        stroke="#ef4444"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.5}
      />

      {/* Dots — past */}
      {past.map((c, i) =>
        c.val > 0 ? (
          <circle
            key={`dp${i}`}
            cx={c.x}
            cy={c.y}
            r={3}
            fill="#10b981"
            stroke="white"
            strokeWidth={1.5}
          />
        ) : null,
      )}

      {/* Dots — future */}
      {future.map((c, i) =>
        c.val > 0 ? (
          <circle
            key={`df${i}`}
            cx={c.x}
            cy={c.y}
            r={3}
            fill="#8b5cf6"
            stroke="white"
            strokeWidth={1.5}
          />
        ) : null,
      )}

      {/* ── Hover tooltip ── */}
      {hover && (
        <g>
          {/* Vertical guide */}
          <line
            x1={hover.x}
            x2={hover.x}
            y1={pad.top}
            y2={GRAPH_H - pad.bot}
            stroke={hover.isPast ? "#10b981" : "#8b5cf6"}
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.5}
          />
          {/* Ring around point */}
          <circle
            cx={hover.x}
            cy={hover.y}
            r={6}
            fill="none"
            stroke={hover.isPast ? "#10b981" : "#8b5cf6"}
            strokeWidth={2}
            opacity={0.4}
          />
          <circle
            cx={hover.x}
            cy={hover.y}
            r={4}
            fill={hover.isPast ? "#10b981" : "#8b5cf6"}
            stroke="white"
            strokeWidth={2}
          />
          {/* Tooltip box */}
          <g transform={`translate(${hover.x}, ${Math.max(hover.y - 44, 4)})`}>
            <rect
              x={-42}
              y={0}
              width={84}
              height={36}
              rx={8}
              fill="#18181b"
              opacity={0.92}
            />
            <text
              x={0}
              y={14}
              textAnchor="middle"
              fill="white"
              fontSize={11}
              fontWeight={700}
              fontFamily="system-ui"
            >
              {fmtMoney(hover.val)}
            </text>
            <text
              x={0}
              y={28}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize={9}
              fontFamily="system-ui"
            >
              {hover.label}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

/* ─────────────────── Event Card ─────────────────── */

function EventCard({
  event,
  onClick,
}: {
  event: EventRow;
  onClick: (e: EventRow) => void;
}) {
  const s = getStyle(event.event_type);
  return (
    <button
      onClick={() => onClick(event)}
      className={cn(
        "text-left rounded-md border px-3 py-2.5 shrink-0",
        "transition-all duration-150 hover:scale-[1.03] hover:shadow-md cursor-pointer",
        // s.bg,
        s.border,
      )}
      style={{ width: CARD_W }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {/* <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} /> */}
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-wider truncate",
            s.text,
          )}
        >
          {event.event_type}
        </span>
      </div>
      <p className="text-[11px] font-semibold text-black truncate leading-tight">
        {event.title}
      </p>
      {(event.totalSpent ?? 0) > 0 && (
        <p className="text-[11px] font-bold text-zinc-500 mt-1 tabular-nums">
          {fmtMoney(event.totalSpent!)}
        </p>
      )}
      <p className="text-[10px] text-zinc-400 mt-0.5">
        {shortTime(event.start_time)}
      </p>
    </button>
  );
}

/* ─────────────────── Detail Modal ─────────────────── */

function EventDetail({
  event,
  onClose,
}: {
  event: EventRow;
  onClose: () => void;
}) {
  const s = getStyle(event.event_type);
  const isPast = new Date(event.start_time) <= TODAY;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 max-w-xs w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className={cn("w-2.5 h-2.5 rounded-full", s.dot)} />
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              s.text,
            )}
          >
            {event.event_type}
          </span>
        </div>

        <h3 className="text-lg font-bold text-zinc-900 leading-snug">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-xs text-zinc-400 mt-1">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="inline-flex items-center gap-1 text-[10px] bg-zinc-100 text-zinc-500 rounded-full px-2.5 py-1 font-medium">
            <Clock className="w-2.5 h-2.5" />
            {shortDate(event.start_time)} · {shortTime(event.start_time)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-zinc-100 text-zinc-500 rounded-full px-2.5 py-1 font-medium">
              <MapPin className="w-2.5 h-2.5" />
              {event.location}
            </span>
          )}
        </div>

        {(event.totalSpent ?? 0) > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-100">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
              {isPast ? "Total Spent" : "Predicted Spend"}
            </p>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums tracking-tight mt-0.5">
              {fmtMoney(event.totalSpent!)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Row-packing to prevent card overlap ─────────────────── */

interface DateGroup {
  key: string;
  x: number;
  events: EventRow[];
  row: number;
}

/**
 * Assigns each date-group a row so that no two groups overlap horizontally.
 * Each group occupies [x - CARD_W/2, x + CARD_W/2].
 * We greedily place into the first row where it fits.
 */
function layoutDateGroups(
  eventsByDate: Record<string, EventRow[]>,
): DateGroup[] {
  const groups: DateGroup[] = Object.entries(eventsByDate)
    .map(([key, evts]) => {
      const d = new Date(evts[0].start_time);
      return { key, x: dateToX(d), events: evts, row: 0 };
    })
    .sort((a, b) => a.x - b.x);

  // Track the rightmost edge per row
  const rowEdges: number[] = [];

  for (const g of groups) {
    const left = g.x - CARD_COL_W / 2;

    let placed = false;
    for (let r = 0; r < rowEdges.length; r++) {
      if (rowEdges[r] <= left) {
        g.row = r;
        rowEdges[r] = g.x + CARD_COL_W / 2;
        placed = true;
        break;
      }
    }

    if (!placed) {
      g.row = rowEdges.length;
      rowEdges.push(g.x + CARD_COL_W / 2);
    }
  }

  return groups;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */

export default function EventTimeline({
  events,
  onSelectEvent,
}: EventTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<EventRow | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const todayX = dateToX(TODAY);
    scrollRef.current.scrollLeft = todayX - scrollRef.current.offsetWidth / 2;
  }, []);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventRow[]> = {};
    for (const ev of events) {
      const k = dateKey(new Date(ev.start_time));
      (map[k] ??= []).push(ev);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    }
    return map;
  }, [events]);

  const layoutGroups = useMemo(
    () => layoutDateGroups(eventsByDate),
    [eventsByDate],
  );

  const { points, maxVal } = useMemo(
    () => buildWeeklySpending(events),
    [events],
  );

  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string; yr?: boolean }[] = [];
    const d = new Date(START_DATE);
    while (d <= END_DATE) {
      ticks.push({
        x: dateToX(d),
        label: d.toLocaleDateString("en-US", { month: "short" }),
        yr: d.getMonth() === 0,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, []);

  const todayX = dateToX(TODAY);

  // Compute card area height based on how many rows we need
  const maxRow = layoutGroups.reduce((m, g) => Math.max(m, g.row), 0);
  // Each row: date label (~16px) + N cards * ~80px + gap
  const estimateGroupH = (evts: EventRow[]) => 20 + evts.length * 82;
  const rowHeight =
    Math.max(...layoutGroups.map((g) => estimateGroupH(g.events)), 100) + 8;
  const cardAreaHeight = (maxRow + 1) * rowHeight + 20;

  function handleClick(ev: EventRow) {
    setSelected(ev);
    onSelectEvent?.(ev);
  }

  return (
    <div className="flex-1 h-[70vh] flex flex-col overflow-hidden rounded-xl bg-[#fafafa]">
      {/* ── Legend ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <h2 className="text-sm font-bold text-zinc-700 tracking-tight">
          Event Timeline
        </h2>
        <div className="flex items-center gap-5 text-[10px] text-zinc-500 font-medium select-none">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-[2px] rounded-full bg-emerald-500 inline-block" />
            Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-5 h-[2px] rounded inline-block"
              style={{
                background:
                  "repeating-linear-gradient(90deg,#8b5cf6 0,#8b5cf6 3px,transparent 3px,transparent 5px)",
              }}
            />
            Predicted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Today
          </span>
        </div>
      </div>

      {/* ── Scrollable ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{ scrollBehavior: "smooth" }}
      >
        <div
          style={{
            width: TOTAL_W + 160,
            paddingLeft: 80,
            paddingRight: 80,
            minHeight: "100%",
          }}
        >
          {/* Graph */}
          <SpendingGraph points={points} maxVal={maxVal} />

          {/* Timeline ruler */}
          <div className="relative" style={{ height: 48 }}>
            <div
              className="absolute"
              style={{
                top: 14,
                left: 0,
                width: TOTAL_W,
                height: 2,
                borderRadius: 1,
                background: "#d4d4d8",
              }}
            />
            <div
              className="absolute"
              style={{
                top: 14,
                left: 0,
                width: todayX,
                height: 2,
                borderRadius: 1,
                background: "#a1a1aa",
              }}
            />

            {/* Today */}
            <div
              className="absolute z-10"
              style={{ left: todayX, top: 0, transform: "translateX(-50%)" }}
            >
              <div className="flex flex-col items-center">
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-bold text-[9px] tracking-wide shadow-sm select-none">
                  TODAY
                </span>
                <div className="w-px h-2 bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              </div>
            </div>

            {/* Months */}
            {monthTicks.map((t, i) => (
              <div key={i} className="absolute" style={{ left: t.x, top: 8 }}>
                <div className="w-px h-3 bg-zinc-300" />
                <span
                  className={cn(
                    "absolute font-semibold select-none whitespace-nowrap",
                    t.yr ? "text-zinc-500" : "text-zinc-400",
                  )}
                  style={{ fontSize: 10, top: 20, left: -10 }}
                >
                  {t.label}
                  {t.yr && (
                    <span className="text-zinc-300 ml-0.5">&apos;26</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* ── Cards — row-packed ── */}
          <div
            className="relative"
            style={{ height: cardAreaHeight, paddingTop: 12 }}
          >
            {layoutGroups.map((g) => {
              const isPast = new Date(g.events[0].start_time) < TODAY;
              const top = g.row * rowHeight;

              return (
                <div
                  key={g.key}
                  className="absolute flex flex-col gap-1.5 items-center"
                  style={{
                    left: g.x - CARD_W / 2,
                    top,
                    opacity: isPast ? 0.72 : 1,
                  }}
                >
                  <div className="w-px h-3 bg-zinc-200" />
                  <span className="text-[9px] font-semibold text-zinc-400 tracking-wide">
                    {shortDate(g.events[0].start_time)}
                  </span>
                  {g.events.map((ev) => (
                    <EventCard key={ev.id} event={ev} onClick={handleClick} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
