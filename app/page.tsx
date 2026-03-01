"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for existing session
    const user = localStorage.getItem("huddle_user");
    if (user) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Query users table for matching email and password
        const { data, error: dbError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .eq("password", password)
          .single();

        if (dbError || !data) {
          throw new Error("Invalid email or password.");
        }

        // Store user in localStorage
        localStorage.setItem("huddle_user", JSON.stringify(data));
        router.push("/dashboard");
      } else {
        // Basic validation
        if (!firstName || !lastName || !email || !password) {
          throw new Error("Please fill in all fields.");
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingUser) {
          throw new Error("An account with this email already exists.");
        }

        // Insert new user
        const { data, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              first_name: firstName,
              last_name: lastName,
              email: email,
              password: password,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error("Failed to create account. Please try again.");
        }

        // Store user in localStorage and login
        localStorage.setItem("huddle_user", JSON.stringify(data));
        router.push("/dashboard");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Left pane - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 border-r border-gray-200 bg-white shadow-xl lg:shadow-none z-10 transition-all">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg shadow-sm flex items-center justify-center">
                <span className="text-white font-bold text-lg leading-none mt-0.5">H</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900 uppercase">
                Huddle Up
              </h2>
            </div>
            <h2 className="mt-10 text-3xl font-bold tracking-tight text-gray-900">
              {isLogin ? "Sign in to your account" : "Create an account"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isLogin ? "Welcome back! Please enter your details." : "Join us and start collaborating today."}
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm transition-all bg-white shadow-sm"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm transition-all bg-white shadow-sm"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm transition-all bg-white shadow-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm transition-all bg-white shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 mt-4 border border-red-100">
                  <p className="text-sm text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  isLogin ? "Sign in" : "Create account"
                )}
              </button>
            </form>

            <div className="mt-8 text-center bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {isLogin ? "Sign up" : "Log in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right pane - Decorative Premium Design */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:items-center bg-gradient-to-br from-indigo-50 via-blue-50 to-white relative overflow-hidden">
        {/* Abstract blur blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30"></div>
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30"></div>
        <div className="absolute -bottom-24 right-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30"></div>

        <div className="relative max-w-lg text-center px-8 z-10">
          <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight text-balance leading-tight">
            Collaborate seamlessly <br /><span className="text-blue-600">in one place.</span>
          </h3>
          <p className="mt-6 text-lg text-gray-600 text-balance leading-relaxed">
            Huddle Up simplifies scheduling, planning, and alignment, bringing everyone onto the same page effortlessly.
          </p>

          <div className="mt-12 flex justify-center">
            {/* Minimal Mockup Card */}
            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white rotate-[-3deg] transition-transform hover:rotate-[-1deg] duration-500">
              <div className="w-80 h-40 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100"></div>
                  <div className="space-y-2 flex-1">
                    <div className="w-1/2 h-3 bg-gray-200 rounded-full"></div>
                    <div className="w-1/3 h-2 bg-gray-100 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-3 mt-auto">
                  <div className="w-full h-8 bg-blue-50 rounded-lg"></div>
                  <div className="w-4/5 h-8 bg-gray-50 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagonal cut overlay (optional stylistic touch) */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
