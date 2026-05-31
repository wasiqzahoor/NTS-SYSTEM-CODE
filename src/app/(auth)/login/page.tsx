"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl"
         style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", backdropFilter: "blur(24px)" }}>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nts-cyan/60 to-transparent" />

      <div className="px-8 pt-10 pb-8">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-nts-cyan/20 blur-xl scale-110" />
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-nts-cyan/20 to-nts-blue-magenta/30 border border-white/10">
                <Image src="/logo.png" alt="NTS" width={64} height={64} className="object-contain w-full h-full" priority />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-sm text-white/40 mt-1.5">Sign in to NTS Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus-visible:bg-white/[0.08] focus-visible:border-nts-cyan/40"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 pr-11 focus-visible:bg-white/[0.08] focus-visible:border-nts-cyan/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 mt-2 bg-nts-cyan text-[#050810] hover:bg-nts-cyan/90 font-semibold text-sm shadow-lg shadow-nts-cyan/20 hover:shadow-nts-cyan/30 transition-all gap-2"
            isLoading={isLoading}
          >
            {!isLoading && (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Bottom accent */}
      <div className="px-8 py-4 border-t border-white/[0.05] text-center">
        <p className="text-[11px] text-white/20">NTS Management System · Secure Access</p>
      </div>
    </div>
  );
}
