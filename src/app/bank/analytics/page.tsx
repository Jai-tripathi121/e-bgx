"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle, KPICard } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { TrendingUp, FileText, Briefcase, Clock, Award, Users, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { getBankOffers, getIssuanceBGs, BankOffer, FirestoreBG } from "@/lib/firestore";

const TIME_FILTERS = ["1W", "1M", "3M", "6M", "YTD", "1Y"] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

function getDateCutoff(filter: TimeFilter): Date {
  const now = new Date();
  switch (filter) {
    case "1W": return new Date(now.getTime() - 7 * 86400_000);
    case "1M": return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3M": return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6M": return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "YTD": return new Date(now.getFullYear(), 0, 1);
    case "1Y": return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

const TYPE_COLORS = ["#1e3a5f", "#2563eb", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];

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

function groupByMonth(offers: BankOffer[]) {
  const map: Record<string, { count: number; revenue: number }> = {};
  for (const o of offers) {
    const d = new Date(o.submitted_at);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { count: 0, revenue: 0 };
    map[key].count++;
    // Estimated commission revenue
    map[key].revenue += o.bg_amount * (o.commission_rate / 100) * (o.validity_months / 12);
  }
  return Object.entries(map)
    .slice(-8)
    .map(([month, v]) => ({
      month,
      count: v.count,
      revenue_lakh: +(v.revenue / 100_000).toFixed(1),
    }));
}

function groupByType(bgs: FirestoreBG[]) {
  const map: Record<string, number> = {};
  for (const bg of bgs) {
    map[bg.bg_type] = (map[bg.bg_type] ?? 0) + bg.amount_inr;
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(map).map(([sector, amount]) => ({
    sector,
    amount,
    percentage: Math.round((amount / total) * 100),
  }));
}

export default function BankAnalyticsPage() {
  const { profile } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("YTD");
  const [mounted, setMounted] = useState(false);
  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [issuedBGs, setIssuedBGs] = useState<FirestoreBG[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([getBankOffers(profile.uid), getIssuanceBGs(profile.uid)])
      .then(([o, bgs]) => { setOffers(o); setIssuedBGs(bgs); })
      .finally(() => setLoading(false));
  }, [profile?.uid]);

  // Apply time filter cutoff
  const cutoff = getDateCutoff(timeFilter);
  const filteredOffers = offers.filter((o) => {
    const d = new Date(o.submitted_at);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
  const filteredBGs = issuedBGs.filter((b) => {
    const d = new Date((b as any).issued_at || b.created_at);
    return !isNaN(d.getTime()) && d >= cutoff;
  });

  const acceptedOffers = filteredOffers.filter((o) => o.status === "ACCEPTED");
  const totalRevenue = acceptedOffers.reduce(
    (s, o) => s + o.bg_amount * (o.commission_rate / 100) * (o.validity_months / 12), 0
  );
  const activePortfolio = filteredBGs
    .filter((b) => b.status !== "EXPIRED")
    .reduce((s, b) => s + b.amount_inr, 0);
  const acceptanceRate = filteredOffers.length > 0 ? Math.round((acceptedOffers.length / filteredOffers.length) * 100) : 0;
  const avgBGSize = filteredBGs.length > 0 ? Math.round(activePortfolio / filteredBGs.length) : 0;

  const monthlyTrend = groupByMonth(filteredOffers);
  const typeDistribution = groupByType(filteredBGs);

  const metrics = [
    { label: "Offer Acceptance Rate", value: loading ? "—" : `${acceptanceRate}%`, icon: Target, positive: true },
    { label: "Avg BG Ticket Size", value: loading ? "—" : formatINR(avgBGSize, true), icon: Briefcase, positive: true },
    { label: "Total Offers Sent", value: loading ? "—" : String(filteredOffers.length), icon: Clock, positive: true },
    { label: "BGs Won", value: loading ? "—" : String(acceptedOffers.length), icon: Users, positive: true },
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
            label="Est. Revenue"
            value={loading ? "—" : formatINR(totalRevenue, true)}
            subtext="Commission (est.)"
            icon={<TrendingUp size={18} />}
            variant="navy"
          />
          <KPICard
            label="BGs Accepted"
            value={loading ? "—" : String(filteredBGs.length)}
            subtext="In issuance pipeline"
            icon={<FileText size={18} />}
          />
          <KPICard
            label="Active Portfolio"
            value={loading ? "—" : formatINR(activePortfolio, true)}
            subtext="Live guarantee exposure"
            icon={<Briefcase size={18} />}
          />
          <KPICard
            label="Acceptance Rate"
            value={loading ? "—" : `${acceptanceRate}%`}
            subtext="Quotes that became BGs"
            icon={<Award size={18} />}
            variant={acceptanceRate >= 60 ? "success" : "default"}
          />
        </div>

        {/* Charts Row 1 */}
        {mounted && monthlyTrend.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-navy-500" />
                  Monthly Offer Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyTrend} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="count" name="Offers Sent" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-navy-500" />
                  Est. Revenue Trend (₹ Lakhs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyTrend}>
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
          </div>
        )}

        {/* Charts Row 2 */}
        {mounted && (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* BG Type Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Portfolio by BG Type</CardTitle></CardHeader>
              <CardContent>
                {typeDistribution.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">No accepted BGs yet</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="45%" height={200}>
                      <PieChart>
                        <Pie
                          data={typeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          dataKey="percentage"
                          nameKey="sector"
                          paddingAngle={3}
                        >
                          {typeDistribution.map((_, i) => (
                            <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {typeDistribution.map((s, i) => (
                        <div key={s.sector} className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-0.5">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{s.sector}</p>
                              <p className="text-xs font-semibold text-gray-900 dark:text-white ml-2">{s.percentage}%</p>
                            </div>
                            <div className="h-1 bg-gray-100 dark:bg-navy-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${s.percentage}%`, backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top BGs in pipeline */}
        {issuedBGs.length > 0 && (
          <Card>
            <CardHeader><CardTitle>BGs in Issuance Pipeline — {new Date().getFullYear()}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issuedBGs.slice(0, 5).map((bg, i) => (
                  <div key={bg.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-gray-100 text-gray-600" :
                      "bg-orange-50 text-orange-600"
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                        <span className="text-[10px] bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300 px-1.5 py-0.5 rounded">{bg.bg_type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{bg.applicant_name} → {bg.beneficiary_name}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular shrink-0">{formatINR(bg.amount_inr, true)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </>
  );
}
