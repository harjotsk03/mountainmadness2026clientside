"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { LogOut, Plus } from "lucide-react";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace("/");
            } else {
                setLoading(false);
            }
        };
        checkUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-blue-600">Huddle Up</h1>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center mt-20">
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-12 text-center max-w-lg w-full flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                        <Plus className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-semibold">Welcome to Huddle Up</h2>
                    <p className="text-gray-500">Add a board to get started and collaborate.</p>
                    <button className="mt-4 flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                        <Plus className="h-5 w-5" />
                        Create Board
                    </button>
                </div>
            </main>
        </div>
    );
}
