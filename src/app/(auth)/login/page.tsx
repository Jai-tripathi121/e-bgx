"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type Portal = "applicant" | "bank" | "admin";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portal, setPortal] = useState<Portal>((searchParams.get("portal") as Portal) || "applicant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, loginWithGoogle } = useAuth();

  const portalConfig = {
    applicant: {
      label: "Applicant Portal",
      icon: <User size={18} />,
      color: "text-navy-600",
      redirect: "/applicant/dashboard",
    },
    bank: {
      label: "Bank Portal",
      icon: <Building2 size={18} />,
      color: "text-blue-600",
      redirect: "/bank/dashboard",
    },
    admin: {
      label: "Admin Portal",
      icon: <User size={18} />,
      color: "text-purple-600",
      redirect: "/admin/dashboard",
    },
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push(portalConfig[portal].redirect);
    } catch (err: any) {
      const msg = err?.message || "Login failed.";
      setError(msg.replace("Firebase: ", "").replace(/\s*\(.*\)\.?$/, ""));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle(portal);
      router.push(portalConfig[portal].redirect);
    } catch (err: any) {
      const msg = err?.message || "Google sign-in failed.";
      setError(msg.replace("Firebase: ", "").replace(/\s*\(.*\)\.?$/, ""));
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Logo (mobile) */}
        <div className="lg:hidden mb-8">
          <Logo variant="dark" size="md" />
        </div>

        {/* Portal switcher */}
        <div className="flex rounded-xl border border-gray-200 dark:border-navy-700 p-1 mb-8 bg-gray-50 dark:bg-navy-900">
          {(["applicant", "bank"] as Portal[]).map((p) => (
            <button
              key={p}
              onClick={() => setPortal(p)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                portal === p
                  ? "bg-white dark:bg-navy-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
              )}
            >
              {p === "bank" ? <Building2 size={14} /> : <User size={14} />}
              {p === "applicant" ? "Applicant" : "Bank"}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Sign in
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {portalConfig[portal].label} — enter your credentials to continue
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Google Sign-in */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-800 transition-all mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-navy-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-navy-950 px-3 text-xs text-gray-400">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            icon={<Mail size={14} />}
            required
          />
          <div className="space-y-1.5">
            <Input
              label="Password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              icon={<Lock size={14} />}
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)} className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
              required
            />
            <div className="flex justify-end">
              <Link href="#" className="text-xs text-navy-600 dark:text-navy-300 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" size="md" loading={loading}>
            Sign In to {portalConfig[portal].label}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href={`/register?portal=${portal}`} className="text-navy-600 dark:text-navy-300 font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-white dark:bg-navy-950">
      {/* Left – Branding */}
      <div className="hidden lg:flex flex-col w-2/5 bg-gradient-navy relative overflow-hidden p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-navy-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/20 rounded-full blur-2xl" />
        </div>
        <div className="relative">
          <Link href="/" className="flex items-center gap-2 text-navy-400 hover:text-white text-sm transition-colors mb-12">
            <ArrowLeft size={14} />
            Back to website
          </Link>
          <Logo variant="light" size="lg" showTagline />
        </div>
        <div className="relative flex-1 flex flex-col justify-end">
          <div className="space-y-6">
            {[
              { stat: "< 5 days", label: "Average BG issuance TAT" },
              { stat: "10+ banks", label: "Partner banks on platform" },
              { stat: "₹500 Cr+", label: "Monthly BG GMV target" },
            ].map((item) => (
              <div key={item.stat} className="border-l-2 border-navy-600 pl-4">
                <p className="text-2xl font-bold text-white">{item.stat}</p>
                <p className="text-sm text-navy-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-navy-500 mt-12">Secure | RBI Compliant | DPDPA 2023 Protected</p>
        </div>
      </div>

      {/* Right – Form */}
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
