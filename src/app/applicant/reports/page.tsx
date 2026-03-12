"use client";
import { useState, useEffect, useRef } from "react";
import {
  BarChart3, TrendingUp, FileDown, RefreshCw, AlertCircle,
  CheckCircle2, Clock, DollarSign, Award, Activity,
  Building2, ArrowUpRight, ArrowDownRight, Minus,
  Printer, Share2, Calendar,
} from "lucide-react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { generateApplicantFinancialReport, FinancialReportData } from "@/lib/firestore";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const fmtCr = (n: number) => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${fmt(n)}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

const BG_STATUS_LABELS: Record<string, string> = {
  PROCESSING: "Processing",
  OFFER_ACCEPTED: "Offer Accepted",
  FD_REQUESTED: "FD Requested",
  FD_PAID: "FD Paid",
  BG_DRAFTING: "BG Drafting",
  ISSUED: "Issued",
  PAY_FEES: "Pay Fees",
  EXPIRED: "Expired",
  AMENDED: "Amended",
  PAYMENT_REQUESTED: "Payment Requested",
  PAYMENT_CONFIRMED: "Payment Confirmed",
};

const STATUS_COLORS: Record<string, string> = {
  ISSUED:       "bg-green-500",
  BG_DRAFTING:  "bg-blue-500",
  FD_PAID:      "bg-cyan-500",
  FD_REQUESTED: "bg-indigo-500",
  OFFER_ACCEPTED: "bg-violet-500",
  PROCESSING:   "bg-amber-500",
  PAY_FEES:     "bg-orange-500",
  EXPIRED:      "bg-red-400",
  AMENDED:      "bg-purple-400",
  default:      "bg-gray-400",
};

const TXN_LABELS: Record<string, string> = {
  PLATFORM_FEE:     "Platform Fee",
  FD_CREATION:      "FD Created",
  BG_PROCESSING_FEE:"BG Processing Fee",
  BANK_BG_FEE:      "Bank BG Fee",
  FD_DEPOSIT:       "FD Deposit",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ApplicantReportsPage() {
  const { user, profile } = useAuth();
  const [report, setReport] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<"SUMMARY" | "PORTFOLIO" | "TRANSACTIONS" | "BENEFICIARIES">("SUMMARY");
  const printRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await generateApplicantFinancialReport(user.uid);
      setReport(data);
    } catch {
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [user]);

  const handlePrint = () => window.print();

  const maxMonthlyAmount = report ? Math.max(...report.monthlyVolume.map((m) => m.amount), 1) : 1;

  return (
    <>
      <PortalHeader
        title="Financial Report Engine"
        subtitle="Real-time analytics and financial insights for your BG portfolio"
      />

      <div className="portal-content space-y-6">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["SUMMARY", "PORTFOLIO", "TRANSACTIONS", "BENEFICIARIES"] as const).map((rt) => (
              <button
                key={rt}
                onClick={() => setReportType(rt)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  reportType === rt
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8"
                }`}
              >
                {rt.charAt(0) + rt.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadReport} loading={loading} className="gap-2">
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
              <Printer size={13} /> Print
            </Button>
          </div>
        </div>

        {/* Generated at */}
        {report && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar size={12} />
            Report generated: {fmtDate(report.generatedAt)} at{" "}
            {new Date(report.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            {" "}&bull;{" "}{profile?.companyName}
          </div>
        )}

        {loading && !report ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-24">
            <BarChart3 size={40} className="text-gray-200 dark:text-white/10 mb-4" />
            <p className="text-gray-500">No data available. Apply for a BG to see your report.</p>
          </div>
        ) : (
          <div ref={printRef}>
            {/* ── SUMMARY TAB ───────────────────────────────────────────── */}
            {reportType === "SUMMARY" && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard
                    label="Total BGs Applied"
                    value={String(report.totalBGsApplied)}
                    icon={<FileDown size={18} />}
                    subtext="Lifetime"
                  />
                  <KPICard
                    label="BGs Issued"
                    value={String(report.totalBGsIssued)}
                    icon={<Award size={18} />}
                    subtext={`${report.successRate}% success rate`}
                  />
                  <KPICard
                    label="Active Exposure"
                    value={fmtCr(report.totalExposureINR)}
                    icon={<TrendingUp size={18} />}
                    subtext="Live portfolio"
                  />
                  <KPICard
                    label="Avg BG Size"
                    value={fmtCr(report.avgBGAmountINR)}
                    icon={<BarChart3 size={18} />}
                    subtext="Per application"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <KPICard
                    label="Fees Paid"
                    value={fmtCr(report.totalFeesPaidINR)}
                    icon={<DollarSign size={18} />}
                    subtext="Platform + processing"
                  />
                  <KPICard
                    label="FD Created"
                    value={fmtCr(report.totalFDCreatedINR)}
                    icon={<Building2 size={18} />}
                    subtext="Total FD deposits"
                  />
                  <KPICard
                    label="Active BGs"
                    value={String(report.totalBGsActive)}
                    icon={<Activity size={18} />}
                    subtext={`${report.totalBGsPending} pending`}
                  />
                </div>

                {/* Monthly Volume Chart */}
                {report.monthlyVolume.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 size={16} /> Monthly BG Volume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-2 h-48">
                        {report.monthlyVolume.map((m) => (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                            <div
                              className="w-full bg-black dark:bg-white rounded-t-md transition-all group-hover:opacity-80"
                              style={{ height: `${Math.max(4, (m.amount / maxMonthlyAmount) * 180)}px` }}
                            />
                            <span className="text-[10px] text-gray-400 text-center">{fmtMonth(m.month)}</span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-xs rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                              <div className="font-semibold">{fmtCr(m.amount)}</div>
                              <div className="opacity-70">{m.count} BG{m.count !== 1 ? "s" : ""}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* BG Status Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">BGs by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2.5">
                        {Object.entries(report.bgsByStatus)
                          .sort(([, a], [, b]) => b - a)
                          .map(([status, count]) => (
                            <div key={status} className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[status] ?? STATUS_COLORS.default}`} />
                              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                                {BG_STATUS_LABELS[status] ?? status}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                              <div className="w-20 h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${STATUS_COLORS[status] ?? STATUS_COLORS.default}`}
                                  style={{ width: `${(count / report.totalBGsApplied) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">BGs by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2.5">
                        {Object.entries(report.bgsByType)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, count]) => (
                            <div key={type} className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500" />
                              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{type}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                              <div className="w-20 h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${(count / report.totalBGsApplied) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── PORTFOLIO TAB ─────────────────────────────────────────── */}
            {reportType === "PORTFOLIO" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricBox label="Total Applied" value={String(report.totalBGsApplied)} />
                  <MetricBox label="Total Issued" value={String(report.totalBGsIssued)} subtext={`${report.successRate}%`} />
                  <MetricBox label="Active Portfolio" value={fmtCr(report.totalExposureINR)} />
                  <MetricBox label="Average BG Size" value={fmtCr(report.avgBGAmountINR)} />
                  <MetricBox label="Total FD Created" value={fmtCr(report.totalFDCreatedINR)} />
                  <MetricBox label="Platform Fees" value={fmtCr(report.totalFeesPaidINR)} />
                </div>

                {/* Monthly trend table */}
                {report.monthlyVolume.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Monthly Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-white/8">
                            <th className="text-left text-xs text-gray-400 pb-2">Month</th>
                            <th className="text-right text-xs text-gray-400 pb-2">BGs Applied</th>
                            <th className="text-right text-xs text-gray-400 pb-2">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...report.monthlyVolume].reverse().map((m) => (
                            <tr key={m.month} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                              <td className="py-2.5 text-sm text-gray-700 dark:text-gray-300">{fmtMonth(m.month)}</td>
                              <td className="py-2.5 text-sm font-medium text-gray-900 dark:text-white text-right">{m.count}</td>
                              <td className="py-2.5 text-sm font-medium text-gray-900 dark:text-white text-right">{fmtCr(m.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── TRANSACTIONS TAB ──────────────────────────────────────── */}
            {reportType === "TRANSACTIONS" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <MetricBox label="Fees Paid" value={fmtCr(report.totalFeesPaidINR)} />
                  <MetricBox label="FD Created" value={fmtCr(report.totalFDCreatedINR)} />
                  <MetricBox label="Transactions" value={String(report.recentTransactions.length)} />
                </div>

                {report.recentTransactions.length === 0 ? (
                  <EmptyCard label="No transactions yet" />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-0">
                        {report.recentTransactions.map((txn, i) => (
                          <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              txn.status === "VERIFIED" ? "bg-green-50 dark:bg-green-950/20 text-green-500" : "bg-gray-50 dark:bg-white/5 text-gray-400"
                            }`}>
                              {txn.status === "VERIFIED" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {TXN_LABELS[txn.type] ?? txn.type}
                              </p>
                              <p className="text-xs text-gray-400">
                                {fmtDate(txn.created_at)} &bull; {txn.bg_id}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtCr(txn.amount)}</p>
                              <span className={`text-xs font-medium ${
                                txn.status === "VERIFIED" ? "text-green-600" :
                                txn.status === "PENDING" ? "text-amber-500" :
                                "text-gray-400"
                              }`}>
                                {txn.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── BENEFICIARIES TAB ─────────────────────────────────────── */}
            {reportType === "BENEFICIARIES" && (
              <div className="space-y-4">
                {report.topBeneficiaries.length === 0 ? (
                  <EmptyCard label="No beneficiary data" />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Building2 size={16} /> Top Beneficiaries by Exposure
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report.topBeneficiaries.map((b, i) => {
                          const maxTotal = report.topBeneficiaries[0]?.total ?? 1;
                          return (
                            <div key={i} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/8 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{b.name}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtCr(b.total)}</p>
                                  <p className="text-xs text-gray-400">{b.count} BG{b.count !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-black dark:bg-white rounded-full transition-all"
                                  style={{ width: `${(b.total / maxTotal) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* BG type breakdown for each beneficiary */}
                <div className="grid grid-cols-2 gap-4">
                  <MetricBox label="Unique Beneficiaries" value={String(report.topBeneficiaries.length)} />
                  <MetricBox label="Avg Exposure/Beneficiary" value={
                    report.topBeneficiaries.length > 0
                      ? fmtCr(report.topBeneficiaries.reduce((s, b) => s + b.total, 0) / report.topBeneficiaries.length)
                      : "—"
                  } />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .portal-sidebar, header, nav { display: none !important; }
          .portal-content { padding: 0 !important; }
        }
      `}</style>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricBox({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8">
      <BarChart3 size={28} className="text-gray-200 dark:text-white/10 mb-3" />
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}
