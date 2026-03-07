"use client";
import { useState, useEffect, useCallback } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utils";
import {
  Download, TrendingUp, CheckCircle2, Clock, FileText, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllPlatformTransactions, PlatformTransaction } from "@/lib/firestore";

const TYPE_FILTERS = ["ALL", "PLATFORM_FEE", "FD_DEPOSIT"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const STATUS_FILTERS = ["ALL", "PENDING", "RECEIPT_UPLOADED", "APPROVED", "REJECTED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECEIPT_UPLOADED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  PLATFORM_FEE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  FD_DEPOSIT:   "bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-200",
  BANK_FEE:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPlatformTransactions();
      setTransactions(data);
    } catch {
      // silently fail, empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const filtered = transactions.filter((t) => {
    const matchType   = typeFilter   === "ALL" || t.type   === typeFilter;
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchType && matchStatus;
  });

  const platformRevenue = transactions
    .filter((t) => t.type === "PLATFORM_FEE" && t.status === "APPROVED")
    .reduce((s, t) => s + t.amount, 0);
  const totalVolume  = transactions.reduce((s, t) => s + t.amount, 0);
  const approvedCnt  = transactions.filter((t) => t.status === "APPROVED").length;
  const pendingCnt   = transactions.filter((t) => t.status === "PENDING" || t.status === "RECEIPT_UPLOADED").length;

  return (
    <>
      <PortalHeader
        title="Platform Transactions"
        subtitle="All processing fees and FD deposits across the e-BGX platform"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        }
      />
      <div className="portal-content space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Platform Revenue"
            value={loading ? "—" : formatINR(platformRevenue, true)}
            subtext="Approved processing fees"
            icon={<TrendingUp size={18} />}
            variant="navy"
          />
          <KPICard
            label="Total Volume"
            value={loading ? "—" : formatINR(totalVolume, true)}
            subtext="All transactions"
            icon={<FileText size={18} />}
          />
          <KPICard
            label="Approved"
            value={loading ? "—" : String(approvedCnt)}
            subtext="Cleared transactions"
            icon={<CheckCircle2 size={18} />}
            variant="success"
          />
          <KPICard
            label="Pending"
            value={loading ? "—" : String(pendingCnt)}
            subtext="Awaiting approval"
            icon={<Clock size={18} />}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  typeFilter === f
                    ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
              >
                {f === "ALL" ? "All Types" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  statusFilter === f
                    ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
              >
                {f === "ALL" ? "All Statuses" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Date</TableHeader>
              <TableHeader>BG Ref</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Applicant</TableHeader>
              <TableHeader>Bank</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Receipt</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableEmpty message="Loading transactions…" />
            ) : filtered.length === 0 ? (
              <TableEmpty message="No transactions match the selected filters." />
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(t.created_at)}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-200">
                      #{t.bg_id || t.bg_doc_id.slice(-8)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", TYPE_COLORS[t.type] || "bg-gray-100 text-gray-600")}>
                      {t.type.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                    {t.applicant_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                    {t.bank_name || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[160px]">
                    <p className="truncate">{t.description}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold tabular text-sm">{formatINR(t.amount, true)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600")}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    {t.status === "APPROVED" && t.approved_at && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(t.approved_at, "relative")}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.receipt_url ? (
                      <a href={t.receipt_url} target="_blank" rel="noopener noreferrer">
                        <Button size="xs" variant="outline" icon={<Download size={12} />}>
                          Download
                        </Button>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No receipt</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Summary footer */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>Showing {filtered.length} of {transactions.length} transactions</span>
            <span>
              Filtered total:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {formatINR(filtered.reduce((s, t) => s + t.amount, 0), true)}
              </span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
