import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart3, Building2, FileText, Clock, Globe, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const stats = [
    { value: "₹20L Cr+", label: "India's BG Market" },
    { value: "< 5 Days", label: "Avg. Issuance TAT" },
    { value: "10+", label: "Partner Banks" },
    { value: "98%", label: "Fee Collection Rate" },
  ];

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Fast Issuance",
      desc: "Reduce BG issuance from weeks to days with our streamlined digital workflow.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Price Discovery",
      desc: "Compare competitive offers from multiple partner banks in a single marketplace.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Secure & Compliant",
      desc: "End-to-end encryption, RBI-compliant KYC, and DPDPA 2023 data protection.",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Digital Vault",
      desc: "All BG documents, KYC artefacts, and payment proofs stored securely in one place.",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Multi-Bank Access",
      desc: "Apply once, broadcast to all empanelled banks. No more bank-by-bank applications.",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Real-time Tracking",
      desc: "Live status updates at every step — from application to final BG issuance.",
    },
  ];

  const bgTypes = [
    { name: "Performance BG", desc: "For work completion & tender submissions", tag: "Most Popular" },
    { name: "Financial BG", desc: "For advance payments & financial obligations" },
    { name: "Statutory BG", desc: "For court orders & regulatory requirements" },
  ];

  const lifecycle = [
    { step: "1", label: "Apply", desc: "Submit BG application with KYC & tender documents" },
    { step: "2", label: "Quotes", desc: "Receive competitive offers from multiple partner banks" },
    { step: "3", label: "Accept", desc: "Compare terms side-by-side and accept the best offer" },
    { step: "4", label: "Issued", desc: "Pay fees, verify FD, and receive your BG in days" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 dark:bg-navy-950/90 backdrop-blur-md border-b border-gray-100 dark:border-navy-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.png" alt="e-BGX" width={100} height={34} className="object-contain invert dark:invert-0" priority />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Platform", "For Banks", "For Applicants", "Pricing"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login?portal=applicant" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
              Sign In
            </Link>
            <Link href="/register?portal=applicant" className="bg-navy-800 hover:bg-navy-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-hero overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-navy-700/20 rounded-full blur-3xl" />
          <div className="absolute top-60 -left-20 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-silver-900/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-navy-800/60 border border-navy-700 rounded-full px-4 py-1.5 text-xs text-silver-300 font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            India's First Digital Bank Guarantee Exchange
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
            Get Bank Guarantees
            <br />
            <span className="bg-gradient-to-r from-silver-300 to-silver-500 bg-clip-text text-transparent">
              in Days, Not Weeks
            </span>
          </h1>

          <p className="text-lg md:text-xl text-navy-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Apply once, receive competing offers from partner banks, and get your BG issued — all on a single digital platform built for India's commercial finance market.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register?portal=applicant" className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-silver-100 transition-all shadow-glow text-base">
              Apply for a BG
              <ArrowRight size={18} />
            </Link>
            <Link href="/login?portal=bank" className="inline-flex items-center gap-2 bg-navy-800/60 border border-navy-700 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-navy-800 transition-all text-base">
              Bank Partner Login
              <Building2 size={16} />
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-4xl mx-auto px-6 mt-20">
          <div className="bg-navy-800/60 backdrop-blur-md border border-navy-700 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-xs text-navy-400 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="platform" className="py-24 bg-white dark:bg-navy-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-navy-600 dark:text-navy-300 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">BG in 4 Simple Steps</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              From application to issuance, e-BGX manages the entire BG lifecycle digitally.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-navy-200 dark:via-navy-700 to-transparent" />

            {lifecycle.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4 relative">
                <div className="w-20 h-20 rounded-2xl bg-navy-900 dark:bg-navy-800 border border-navy-700 flex items-center justify-center text-2xl font-bold text-white shadow-navy relative z-10">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BG Types */}
      <section className="py-20 bg-gray-50 dark:bg-navy-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold text-navy-600 dark:text-navy-300 uppercase tracking-widest mb-3">BG Types</p>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Every Type of Bank Guarantee, One Platform
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Whether you need a performance guarantee for an NHAI tender, a financial guarantee for an advance payment, or a statutory guarantee for court obligations — e-BGX has you covered.
              </p>
              <div className="space-y-3">
                {bgTypes.map((type) => (
                  <div key={type.name} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-navy-800 border border-gray-100 dark:border-navy-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{type.name}</span>
                        {type.tag && (
                          <span className="text-[10px] bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 px-2 py-0.5 rounded-full font-medium">
                            {type.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-navy rounded-2xl p-8 text-white space-y-6 shadow-navy">
              <div className="space-y-1">
                <p className="text-silver-400 text-xs font-medium uppercase tracking-wider">Sample BG Summary</p>
                <h3 className="text-xl font-bold">Performance BG – NHAI</h3>
                <p className="text-silver-400 text-sm">NH-45/2025</p>
              </div>
              <div className="space-y-3">
                {[
                  ["BG Amount", "₹3,80,00,000"],
                  ["Validity", "24 Months"],
                  ["Commission", "1.5% p.a."],
                  ["FD Margin", "100%"],
                  ["Total Cost", "₹11,40,000"],
                  ["Status", "ISSUED ✓"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b border-navy-700 pb-2.5">
                    <span className="text-silver-400">{k}</span>
                    <span className="font-semibold text-white">{v}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <div className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Issued in 4 business days
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="for-applicants" className="py-24 bg-white dark:bg-navy-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-navy-600 dark:text-navy-300 uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Built for Speed & Transparency</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900 hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-800 flex items-center justify-center text-navy-700 dark:text-navy-300 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Banks */}
      <section id="for-banks" className="py-24 bg-navy-900 dark:bg-navy-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-navy-400 uppercase tracking-widest mb-3">For Banks</p>
          <h2 className="text-4xl font-bold text-white mb-6">A New Channel for BG Business</h2>
          <p className="text-navy-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            Access a live feed of pre-vetted BG opportunities, submit competitive offers, manage your issuance pipeline, and track portfolio performance — all from one integrated dashboard.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: "🏦", title: "Live Market Feed", desc: "Real-time BG opportunities broadcasted from verified applicants across India" },
              { icon: "📊", title: "Portfolio Analytics", desc: "Track revenue, TAT, acceptance rates, and sector performance with rich dashboards" },
              { icon: "⚡", title: "Streamlined Issuance", desc: "Digital workflow from FD verification to draft generation to final issuance" },
            ].map((item) => (
              <div key={item.title} className="bg-navy-800/60 border border-navy-700 rounded-xl p-6 text-left">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-navy-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/login?portal=bank" className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-silver-100 transition-all">
            Bank Partner Login
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white dark:bg-navy-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-navy rounded-3xl p-12 shadow-navy">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-navy-300 mb-10 max-w-xl mx-auto">
              Join hundreds of companies already using e-BGX to get bank guarantees faster and at better rates.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register?portal=applicant" className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-silver-100 transition-all">
                Apply as Applicant
                <ArrowRight size={18} />
              </Link>
              <Link href="/register?portal=bank" className="inline-flex items-center gap-2 border border-navy-500 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-navy-800 transition-all">
                Onboard as Bank
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 border-t border-navy-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <div className="mb-1">
                <Image src="/logo.png" alt="e-BGX" width={88} height={30} className="object-contain" />
              </div>
              <p className="text-xs text-navy-400">Electronic Bank Guarantee Exchange</p>
            </div>
            <div className="flex gap-6 text-sm text-navy-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <a href="#" className="hover:text-white transition-colors">RBI Compliance</a>
            </div>
            <p className="text-xs text-navy-500">© 2026 e-BGX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
