"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, User, Mail, Lock, Phone, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type Portal = "applicant" | "bank";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portal, setPortal] = useState<Portal>((searchParams.get("portal") as Portal) || "applicant");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    mobile: "",
    password: "",
    pan: "",
    gstin: "",
    bankName: "",
    branchCode: "",
    officerName: "",
  });

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) { setStep(2); return; }
    setLoading(true);
    setError("");
    try {
      await register(form, portal);
      router.push(portal === "applicant" ? "/applicant/dashboard" : "/bank/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Registration failed.";
      setError(msg.replace("Firebase: ", "").replace(/\s*\(.*\)\.?$/, ""));
      setLoading(false);
    }
  };

  const benefits = {
    applicant: [
      "Apply for BGs 100% online",
      "Compare offers from 10+ partner banks",
      "Real-time tracking & audit trail",
      "Digital document vault",
    ],
    bank: [
      "Access live BG market feed",
      "Streamlined issuance workflow",
      "Portfolio analytics dashboard",
      "Digital KYC verification",
    ],
  };

  return (
    /* Right */
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="lg:hidden mb-8">
          <Logo variant="dark" size="md" />
        </div>

        {/* Portal switcher */}
        <div className="flex rounded-xl border border-gray-200 dark:border-navy-700 p-1 mb-6 bg-gray-50 dark:bg-navy-900">
          {(["applicant", "bank"] as Portal[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPortal(p); setStep(1); }}
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

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-navy-800 dark:bg-navy-400" : "bg-gray-200 dark:bg-navy-700")}
            />
          ))}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {step === 1 ? "Create Account" : "Entity Details"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Step {step} of 2 — {step === 1 ? "Your account credentials" : portal === "applicant" ? "Company KYC information" : "Bank branch information"}
        </p>

        {/* Google */}
        {step === 1 && (
          <>
            <button className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-800 transition-all mb-5">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-navy-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-navy-950 px-3 text-xs text-gray-400">or with email</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleNext} className="space-y-4">
          {step === 1 ? (
            <>
              <Input label="Full Name / Company Name" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="POSTMAC VENTURES PVT LTD" icon={<User size={14} />} required />
              <Input label="Email Address" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" icon={<Mail size={14} />} required />
              <Input label="Mobile Number" type="tel" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="+91 98765 43210" icon={<Phone size={14} />} required />
              <Input label="Password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min. 8 characters" icon={<Lock size={14} />} required hint="Must include uppercase, number, and special character" />
            </>
          ) : portal === "applicant" ? (
            <>
              <Input label="Company PAN" value={form.pan} onChange={(e) => update("pan", e.target.value)} placeholder="AABCP1234C" required hint="Will be pre-verified with MCA" />
              <Input label="GST Number" value={form.gstin} onChange={(e) => update("gstin", e.target.value)} placeholder="27AABCP1234C1Z5" required />
              <Input label="CIN Number" placeholder="U12345MH2020PTC123456" hint="Optional at registration" />
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-400">
                Full KYC and document upload can be completed after registration in your Profile section.
              </div>
            </>
          ) : (
            <>
              <Input label="Bank Name" value={form.bankName} onChange={(e) => update("bankName", e.target.value)} placeholder="Canara Bank" icon={<Building2 size={14} />} required />
              <Input label="Branch IFSC Code" value={form.branchCode} onChange={(e) => update("branchCode", e.target.value)} placeholder="CNRB0001234" required />
              <Input label="Officer Name" value={form.officerName} onChange={(e) => update("officerName", e.target.value)} placeholder="Authorized BG desk officer" icon={<User size={14} />} required />
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-400">
                Bank onboarding requires verification by the e-BGX admin team. You will receive approval within 2 business days.
              </div>
            </>
          )}

          <Button type="submit" className="w-full" size="md" loading={loading}>
            {step === 1 ? "Continue" : "Create Account"}
          </Button>

          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              ← Back
            </button>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href={`/login?portal=${portal}`} className="text-navy-600 dark:text-navy-300 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-white dark:bg-navy-950">
      {/* Left */}
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
        <div className="relative flex-1 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-white mb-6">
            Join thousands of companies
          </h2>
          <div className="space-y-4">
            {[
              "Apply for BGs 100% online",
              "Compare offers from 10+ partner banks",
              "Real-time tracking & audit trail",
              "Digital document vault",
            ].map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                <span className="text-silver-300 text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right – wrapped in Suspense for useSearchParams */}
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
