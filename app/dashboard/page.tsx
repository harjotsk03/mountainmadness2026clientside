"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, LayoutGrid } from "lucide-react";

interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check locally stored user session
        const storedUser = localStorage.getItem("huddle_user");
        if (!storedUser) {
            router.replace("/");
        } else {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem("huddle_user");
                router.replace("/");
            }
            setLoading(false);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("huddle_user");
        router.replace("/");
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans">
            <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-600 rounded-xl shadow-md flex items-center justify-center">
                            <span className="text-white font-bold text-xl leading-none mt-0.5">H</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">Huddle Up</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-3 text-sm text-gray-600">
                            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200 shadow-sm">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </span>
                            <span className="font-medium text-gray-700">{user.first_name} {user.last_name}</span>
                        </div>
                        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome, {user.first_name}!</h2>
                    <p className="mt-2 text-gray-500 text-lg">Here&apos;s an overview of your workspaces.</p>
                </div>

                <div className="mt-12 flex flex-col items-center justify-center py-20 px-4">
                    <div className="bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-12 text-center max-w-lg w-full flex flex-col items-center gap-6 transition-transform hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] duration-500">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-blue-100/50">
                            <LayoutGrid className="h-10 w-10 text-blue-500" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">No boards yet</h3>
                            <p className="text-gray-500 mt-3 text-lg leading-relaxed">Add a board to get started and collaborate with your team today.</p>
                        </div>
                        <button className="mt-6 flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-[0.98]">
                            <Plus className="h-5 w-5" strokeWidth={2.5} />
                            Create your first Board
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
