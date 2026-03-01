"use client";

export default function SidebarCTA() {
  return (
    <div className="relative w-10/12 mx-auto mb-3 overflow-hidden rounded-xl px-5 py-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-blue-500/20">
      {/* Glow orb */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.35)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.2)_0%,transparent_50%)] pointer-events-none" />

      {/* Copy */}
      <p className="text-[13.5px] font-medium leading-4 text-white mb-2">
        Unlock the full experience
      </p>
      <p className="text-[11.5px] leading-relaxed text-slate-400 mb-4">
        Unlimited projects, advanced analytics, and priority support.
      </p>

      {/* Button */}
      <button
        className="
          w-full py-2 rounded-lg text-[12.5px] font-semibold tracking-wide text-white
          bg-gradient-to-r from-blue-500 to-purple-500
          hover:-translate-y-px
          active:translate-y-0
          transition-all duration-200 ease-out
          cursor-pointer
        "
      >
        Upgrade to Pro
      </button>
    </div>
  );
}
