"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppShellProps {
    children: React.ReactNode;
    userName?: string;
    userInitials?: string;
}

const navItems = [
    { label: "Boards", href: "/", icon: LayoutDashboard },
];

export function AppShell({ children, userName = "", userInitials = "?" }: AppShellProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {/* ── White sidebar ── */}
            <aside className="hidden sm:flex flex-col w-56 shrink-0 bg-white border-r border-zinc-200">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-200">
                    <div className="h-7 w-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm leading-none">H</span>
                    </div>
                    <span className="text-zinc-900 font-semibold text-sm tracking-tight">huddle up</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {navItems.map(({ label, href, icon: Icon }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                        return (
                            <button
                                key={href}
                                onClick={() => router.push(href)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                    isActive
                                        ? "bg-zinc-100 text-zinc-900"
                                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                                {label}
                            </button>
                        );
                    })}
                </nav>

                {/* User at bottom */}
                <div className="px-3 py-4 border-t border-zinc-200">
                    <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
                        <Avatar size="sm">
                            <AvatarFallback className="bg-zinc-100 text-zinc-500 text-[10px] font-semibold">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-zinc-500 text-xs font-medium truncate">{userName}</span>
                    </div>
                </div>
            </aside>

            {/* Mobile top bar */}
            <div className="sm:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-zinc-200 h-12 flex items-center px-4 gap-3">
                <div className="h-6 w-6 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-xs">H</span>
                </div>
                <span className="text-zinc-900 font-semibold text-sm tracking-tight">huddle up</span>
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto bg-[#F4F4F5] sm:pt-0 pt-12">
                    {children}
                </main>
            </div>
        </div>
    );
}
