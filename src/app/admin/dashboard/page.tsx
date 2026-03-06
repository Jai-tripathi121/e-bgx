"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle, KPICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllBGs, getAllBanks, getPendingKYCApplicants, FirestoreBG, BankUser } from "@/lib/firestore";
import { formatINR, formatDate, getBGStatusConfig } from "@/lib/utils";
import {
  TrendingUp, Building2, FileText, AlertTriangle, CheckCircle2,
  Activity, ArrowRight, Clock, Inbox,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [allBGs, setAllBGs] = useState<FirestoreBG[]>([]);
  const [allBanks, setAllBanks] = useState<BankUser[]>([]);
  const [pendingKYC, setPendingKYC] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      getAllBGs().catch(() => [] as FirestoreBG[]),
      getAllBanks().catch(() => [] as BankUser[]),
      getPendingKYCApplicants().catch(() => []),
    ]).then(([bgs, banks, kyc]) => {
      setAllBGs(bgs);
      setAllBanks(banks);
      setPendingKYC(kyc.length);
      setLoading(false);
    });
  }, []);

  // ── KPI computations ──────────────────────────────────────────────────────
  const issuedBGs = allBGs.filter((b) => b.status === "ISSUED");
  const totalExposure = issuedBGs.reduce((s, b) => s + b.amount_inr, 0);
  const totalRevenue = allBGs.reduce((s, b) => s + b.amount_inr * 0.01, 0);
  const activeBanks = allBanks.filter((b) => b.status === "ACTIVE").length;

  // ── Revenue chart (monthly, last 6 months) ────────────────────────────────
  const revenueChart = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short" });
      months[key] = 0;
    }
    allBGs.forEach((bg) => {
      const d = new Date(bg.created_at);
      const key = d.toLocaleString("default", { month: "short" });
      if (key in months) months[key] += +(bg.amount_inr * 0.01 / 100000).toFixed(2);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue: +revenue.toFixed(2) }));
  })();

  // ── BGs by Bank chart ─────────────────────────────────────────────────────
  const bankVolumeChart = (() => {
    const counts: Record<string, number> = {};
    allBGs.forEach((bg) => {
      if (bg.accepted_bank_name) {
        const short = bg.accepted_bank_name.split(" ")[0];
        counts[short] = (counts[short] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bank, bgs]) => ({ bank, bgs }));
  })();

  // ── Alerts derived from real data ─────────────────────────────────────────
  const alerts = (() => {
    const list: { type: "warning" | "info" | "success"; msg: string; time: string }[] = [];
    const pendingBankUsers = allBanks.filter((b) => b.status === "PENDING");
    if (pendingBankUsers.length > 0) {
      list.push({ type: "info", msg: `${pendingBankUsers.length} bank registration${pendingBankUsers.length > 1 ? "s" : ""} awaiting KYC approval`, time: "now" });
    }
    if (pendingKYC > 0) {
      list.push({ type: "warning", msg: `${pendingKYC} applicant KYC review${pendingKYC > 1 ? "s" : ""} pending`, time: "now" });
    }
    const noOfferBGs = allBGs.filter((bg) => bg.status === "PROCESSING" && bg.offers?.length === 0);
    if (noOfferBGs.length > 0) {
      list.push({ type: "warning", msg: `${noOfferBGs.length} BG${noOfferBGs.length > 1 ? "s" : ""} pending bank quotes`, time: "now" });
    }
    issuedBGs.forEach((bg) => {
      if (bg.expiry_date) {
        const days = Math.ceil((new Date(bg.expiry_date).getTime() - Date.now()) / 86400000);
        if (days > 0 && days <= 30) {
          list.push({ type: "warning", msg: `#${bg.bg_id}: BG expiring in ${days} day${days > 1 ? "s" : ""}`, time: formatDate(bg.updated_at, "relative") });
        }
      }
    });
    return list;
  })();

  const pendingBGsCount = allBGs.filter((b) => b.status === "PROCESSING" || b.status === "DRAFT").length;

  return (
    <>
      <PortalHeader title="Admin Dashboard" subtitle="Platform-wide overview — e-BGX command centre" />
      <div className="portal-content space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Platform Revenue (YTD)"
            value={loading ? "—" : formatINR(totalRevenue, true)}
            subtext="1% fee on all BGs"
            icon={<TrendingUp size={18} />}
            variant="navy"
          />
          <KPICard
            label="Total BGs Processed"
            value={loading ? "—" : String(allBGs.length)}
            subtext="All time"
            icon={<FileText size={18} />}
          />
          <KPICard
            label="Active Bank Partners"
            value={loading ? "—" : String(activeBanks)}
            subtext="Verified & active"
            icon={<Building2 size={18} />}
          />
          <KPICard
            label="Live Exposure"
            value={loading ? "—" : formatINR(totalExposure, true)}
            subtext="Issued BG portfolio"
            icon={<Activity size={18} />}
            variant="success"
          />
        </div>

        {/* Charts Row */}
        {mounted && (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Revenue Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-navy-500" />
                  Platform Revenue (₹ Lakhs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allBGs.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                    <div className="text-center">
                      <Inbox size={28} className="mx-auto mb-2 opacity-40" />
                      No BG data yet
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueChart}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip formatter={(v: number) => [`₹${v}L`, "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#1e3a5f" strokeWidth={2.5} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Bank Volume */}
            <Card>
              <CardHeader><CardTitle>BGs by Bank</CardTitle></CardHeader>
              <CardContent>
                {bankVolumeChart.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                    <div className="text-center">
                      <Inbox size={28} className="mx-auto mb-2 opacity-40" />
                      No issued BGs yet
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bankVolumeChart} layout="vertical" barSize={14}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="bank" type="category" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={45} />
                      <Tooltip formatter={(v: number) => [v, "BGs"]} />
                      <Bar dataKey="bgs" radius={[0, 4, 4, 0]}>
                        {bankVolumeChart.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "#1e3a5f" : "#cbd5e1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Middle Row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent BGs */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent BG Activity</CardTitle>
              <Link href="/admin/applicants">
                <Button size="xs" variant="ghost" icon={<ArrowRight size={12} />} iconPosition="right">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : allBGs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Inbox size={24} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No BG applications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allBGs.slice(0, 8).map((bg) => {
                    const cfg = getBGStatusConfig(bg.status);
                    return (
                      <div key={bg.bg_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                            <Badge variant={cfg.color as any} size="sm">{cfg.label}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{bg.beneficiary_name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatINR(bg.amount_inr, true)}</p>
                          <p className="text-[10px] text-gray-400">{formatDate(bg.created_at, "relative")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Alerts & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 size={22} className="text-green-500 mb-2" />
                  <p className="text-sm text-gray-400">All clear — no pending actions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a, i) => (
                    <div key={i} className="flex gap-3 pb-3 border-b border-gray-50 dark:border-navy-800 last:border-0 last:pb-0">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        a.type === "warning" ? "bg-amber-100 dark:bg-amber-900/30" :
                        a.type === "success" ? "bg-green-100 dark:bg-green-900/30" :
                        "bg-blue-100 dark:bg-blue-900/30"
                      )}>
                        {a.type === "warning" ? <AlertTriangle size={11} className="text-amber-600" /> :
                         a.type === "success" ? <CheckCircle2 size={11} className="text-green-600" /> :
                         <Clock size={11} className="text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-200 leading-snug">{a.msg}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pending KYC Reviews",   value: loading ? "—" : String(pendingKYC),       color: "text-amber-600" },
            { label: "BGs Awaiting Approval", value: loading ? "—" : String(pendingBGsCount),  color: "text-blue-600" },
            { label: "Active Bank Partners",  value: loading ? "—" : String(activeBanks),       color: "text-navy-600" },
            { label: "Issued BGs",            value: loading ? "—" : String(issuedBGs.length),  color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-gray-50 dark:bg-navy-800 border border-gray-100 dark:border-navy-700">
              <p className={cn("text-3xl font-black", s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
