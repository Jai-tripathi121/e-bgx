"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle, KPICard } from "@/components/ui/card";
import { mockBankAnalytics } from "@/lib/mock-data";
import { formatINR } from "@/lib/utils";
import { TrendingUp, FileText, Briefcase, Clock, Award, Users, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const TIME_FILTERS = ["1W", "1M", "3M", "6M", "YTD", "1Y"] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

const SECTOR_COLORS = ["#1e3a5f", "#2563eb", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function BankAnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("YTD");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const a = mockBankAnalytics;

  // Compute sector percentages from amounts
  const totalSectorAmount = a.sector_distribution.reduce((sum, s) => sum + s.amount, 0);
  const sectorsWithPct = a.sector_distribution.map((s) => ({
    ...s,
    percentage: Math.round((s.amount / totalSectorAmount) * 100),
  }));

  // Monthly trend with revenue in Lakhs
  const monthlyWithLakh = a.monthly_trend.map((m) => ({
    ...m,
    revenue_lakh: +(m.revenue / 100000).toFixed(1),
  }));

  const metrics = [
    { label: "Offer Acceptance Rate", value: `${a.offer_acceptance_rate}%`, icon: Target, trend: "+3.2%", positive: true },
    { label: "Avg BG Ticket Size", value: formatINR(a.avg_bg_size, true), icon: Briefcase, trend: "+8.1%", positive: true },
    { label: "Avg Processing TAT", value: `${a.avg_tat} Days`, icon: Clock, trend: "-1 day", positive: true },
    { label: "Repeat Customer Rate", value: `${a.repeat_customers}%`, icon: Users, trend: "+5%", positive: true },
  ];

  return (
    <>
      <PortalHeader title="Performance Analytics" subtitle="Track issuance volume, revenue, and market performance" />
      <div className="portal-content space-y-6">

        {/* Time Filter */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl w-fit">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                timeFilter === f
                  ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Revenue"
            value={formatINR(a.total_revenue, true)}
            subtext="Commission + Processing Fees"
            icon={<TrendingUp size={18} />}
            trend={8.2}
            variant="navy"
          />
          <KPICard
            label="BGs Issued"
            value={a.bgs_issued.toString()}
            subtext="Successfully issued"
            icon={<FileText size={18} />}
            trend={12}
          />
          <KPICard
            label="Active Portfolio"
            value={formatINR(a.active_portfolio, true)}
            subtext="Live guarantee exposure"
            icon={<Briefcase size={18} />}
            trend={4.5}
          />
          <KPICard
            label="Acceptance Rate"
            value={`${a.offer_acceptance_rate}%`}
            subtext="Quotes that became BGs"
            icon={<Award size={18} />}
            trend={2.1}
            variant="success"
          />
        </div>

        {/* Charts Row 1 */}
        {mounted && <div className="grid lg:grid-cols-2 gap-4">
          {/* Monthly BG Volume */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={16} className="text-navy-500" />
                Monthly BG Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyWithLakh} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="count" name="BGs Issued" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={16} className="text-navy-500" />
                Revenue Trend (₹ Lakhs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyWithLakh}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue_lakh"
                    name="Revenue (L)"
                    stroke="#1e3a5f"
                    strokeWidth={2.5}
                    dot={{ fill: "#1e3a5f", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>}

        {/* Charts Row 2 */}
        {mounted && <div className="grid lg:grid-cols-3 gap-4">
          {/* Sector Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Exposure by Sector</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="45%" height={200}>
                  <PieChart>
                    <Pie
                      data={sectorsWithPct}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="percentage"
                      nameKey="sector"
                      paddingAngle={3}
                    >
                      {sectorsWithPct.map((_, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sectorsWithPct.map((s, i) => (
                    <div key={s.sector} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{s.sector}</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white ml-2">{s.percentage}%</p>
                        </div>
                        <div className="h-1 bg-gray-100 dark:bg-navy-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.percentage}%`, backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {metrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-navy-800 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-navy-50 dark:bg-navy-800 flex items-center justify-center">
                      <m.icon size={13} className="text-navy-600 dark:text-navy-300" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight max-w-[110px]">{m.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m.value}</p>
                    <p className={cn("text-[10px] font-medium", m.positive ? "text-green-600" : "text-red-500")}>{m.trend}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>}

        {/* Top Issued BGs */}
        <Card>
          <CardHeader><CardTitle>Top Issued BGs — {new Date().getFullYear()}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { rank: 1, bg: "BG-7918", applicant: "POSTMAC VENTURES PVT LTD", beneficiary: "NHAI", amount: 38000000, type: "PERFORMANCE" },
                { rank: 2, bg: "BG-6935", applicant: "AARAV INFRA LTD", beneficiary: "PWD Maharashtra", amount: 15000000, type: "PERFORMANCE" },
                { rank: 3, bg: "BG-5512", applicant: "SUNRIZE EXPORTS", beneficiary: "DGFT", amount: 5000000, type: "FINANCIAL" },
              ].map((row) => (
                <div key={row.bg} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    row.rank === 1 ? "bg-amber-100 text-amber-700" :
                    row.rank === 2 ? "bg-gray-100 text-gray-600" :
                    "bg-orange-50 text-orange-600"
                  )}>
                    {row.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-200">#{row.bg}</p>
                      <span className="text-[10px] bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300 px-1.5 py-0.5 rounded">{row.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{row.applicant} → {row.beneficiary}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular shrink-0">{formatINR(row.amount, true)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
