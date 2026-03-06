"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle, KPICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockBGApplications, mockBanks, mockBankAnalytics } from "@/lib/mock-data";
import { formatINR, formatDate, getBGStatusConfig } from "@/lib/utils";
import {
  TrendingUp, Building2, Users, FileText, AlertTriangle, CheckCircle2,
  Activity, ArrowRight, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";

const platformRevenue = [
  { month: "Aug", revenue: 4.2 },
  { month: "Sep", revenue: 5.8 },
  { month: "Oct", revenue: 4.9 },
  { month: "Nov", revenue: 7.1 },
  { month: "Dec", revenue: 8.4 },
  { month: "Jan", revenue: 9.2 },
  { month: "Feb", revenue: 11.5 },
  { month: "Mar", revenue: 13.8 },
];

const bankVolume = [
  { bank: "Canara", bgs: 18 },
  { bank: "HDFC", bgs: 14 },
  { bank: "SBI", bgs: 11 },
  { bank: "ICICI", bgs: 9 },
  { bank: "PNB", bgs: 6 },
];

const recentAlerts = [
  { id: 1, type: "warning", msg: "BG-5512: Platform fee pending for 3+ days", time: "2h ago" },
  { id: 2, type: "info",    msg: "New bank registration: Axis Bank – awaiting KYC approval", time: "5h ago" },
  { id: 3, type: "success", msg: "BG-7918 issued successfully – ₹3.8 Cr NHAI BG", time: "1d ago" },
  { id: 4, type: "warning", msg: "BG-6935: No bank response in 48h, re-broadcast triggered", time: "2d ago" },
];

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const totalExposure = mockBGApplications.filter((b) => b.status === "ISSUED").reduce((sum, b) => sum + b.amount_inr, 0);
  const totalRevenue = mockBGApplications.reduce((sum, b) => sum + (b.amount_inr * 0.01), 0);

  return (
    <>
      <PortalHeader title="Admin Dashboard" subtitle="Platform-wide overview — e-BGX command centre" />
      <div className="portal-content space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Platform Revenue (YTD)"
            value={formatINR(totalRevenue, true)}
            subtext="1% fee on all BGs"
            icon={<TrendingUp size={18} />}
            trend={22.4}
            variant="navy"
          />
          <KPICard
            label="Total BGs Processed"
            value={mockBGApplications.length.toString()}
            subtext="All time"
            icon={<FileText size={18} />}
            trend={14}
          />
          <KPICard
            label="Active Bank Partners"
            value={mockBanks.length.toString()}
            subtext="Verified & active"
            icon={<Building2 size={18} />}
            trend={1}
          />
          <KPICard
            label="Live Exposure"
            value={formatINR(totalExposure, true)}
            subtext="Issued BG portfolio"
            icon={<Activity size={18} />}
            variant="success"
          />
        </div>

        {/* Charts Row */}
        {mounted && <div className="grid lg:grid-cols-3 gap-4">
          {/* Revenue Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={16} className="text-navy-500" />
                Platform Revenue (₹ Lakhs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={platformRevenue}>
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
            </CardContent>
          </Card>

          {/* Bank Volume */}
          <Card>
            <CardHeader><CardTitle>BGs by Bank</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bankVolume} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="bank" type="category" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip formatter={(v: number) => [v, "BGs"]} />
                  <Bar dataKey="bgs" radius={[0, 4, 4, 0]}>
                    {bankVolume.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#1e3a5f" : "#cbd5e1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>}

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
            <CardContent className="space-y-1">
              {mockBGApplications.map((bg) => {
                const cfg = getBGStatusConfig(bg.status);
                return (
                  <div key={bg.bg_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                        <Badge variant={cfg.color as any} size="sm">{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{bg.applicant_name} → {bg.beneficiary_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatINR(bg.amount_inr, true)}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(bg.created_at, "relative")}</p>
                    </div>
                  </div>
                );
              })}
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
            <CardContent className="space-y-3">
              {recentAlerts.map((a) => (
                <div key={a.id} className="flex gap-3 pb-3 border-b border-gray-50 dark:border-navy-800 last:border-0 last:pb-0">
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
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pending KYC Reviews", value: "3", color: "text-amber-600" },
            { label: "BGs Awaiting Approval", value: "1", color: "text-blue-600" },
            { label: "Platform Fee Overdue", value: "1", color: "text-red-600" },
            { label: "Disputes Open", value: "0", color: "text-green-600" },
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
