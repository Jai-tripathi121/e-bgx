"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Download, CreditCard, Clock,
  TrendingUp, FileText, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToBankAllPayments,
  approveFDRequest,
  rejectFDRequest,
  BGPaymentRequest,
} from "@/lib/firestore";

const STATUS_FILTERS = ["ALL", "PENDING", "RECEIPT_UPLOADED", "APPROVED", "REJECTED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECEIPT_UPLOADED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function BankPaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments]       = useState<BGPaymentRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Real-time subscription to all bank payments ───────────────────────────
  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);
    const unsub = subscribeToBankAllPayments(profile.uid, (data) => {
      setPayments(data);
      setLoading(false);
    });
    return unsub;
  }, [profile?.uid]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const filtered       = payments.filter((p) => statusFilter === "ALL" || p.status === statusFilter);
  const totalAmount    = payments.reduce((s, p) => s + p.amount, 0);
  const approvedCount  = payments.filter((p) => p.status === "APPROVED").length;
  const pendingReview  = payments.filter((p) => p.status === "RECEIPT_UPLOADED").length;
  const approvedAmount = payments.filter((p) => p.status === "APPROVED").reduce((s, p) => s + p.amount, 0);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async (payment: BGPaymentRequest) => {
    if (!profile) return;
    setActionLoading(payment.id);
    try {
      await approveFDRequest(payment.id, payment.bg_doc_id, profile.displayName || "Bank Officer");
      toast.success("Payment approved. BG has moved to drafting stage.");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (payment: BGPaymentRequest) => {
    if (!rejectReason.trim()) { toast.error("Please enter a rejection reason."); return; }
    if (!profile) return;
    setActionLoading(payment.id);
    try {
      await rejectFDRequest(payment.id, payment.bg_doc_id, profile.displayName || "Bank Officer");
      toast.success("Payment rejected. Applicant will be notified to re-upload.");
      setRejectingId(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject payment.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <PortalHeader
        title="Payment Management"
        subtitle="Review and approve FD margin and commission payment receipts from applicants"
      />
      <div className="portal-content space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Requests"
            value={loading ? "—" : String(payments.length)}
            subtext="All payment requests"
            icon={<FileText size={18} />}
          />
          <KPICard
            label="Pending Review"
            value={loading ? "—" : String(pendingReview)}
            subtext="Receipt uploaded by applicant"
            icon={<AlertTriangle size={18} />}
          />
          <KPICard
            label="Approved"
            value={loading ? "—" : String(approvedCount)}
            subtext="Payments cleared"
            icon={<CheckCircle2 size={18} />}
            variant="success"
          />
          <KPICard
            label="Total Volume"
            value={loading ? "—" : formatINR(approvedAmount, true)}
            subtext="Approved payment value"
            icon={<TrendingUp size={18} />}
            variant="navy"
          />
        </div>

        {/* Alert if pending review */}
        {pendingReview > 0 && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
            <AlertTriangle size={16} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">{pendingReview} payment receipt{pendingReview > 1 ? "s" : ""}</span>{" "}
              awaiting your review. Approve or reject to proceed with BG issuance.
            </p>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl w-fit overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                statusFilter === f
                  ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              )}
            >
              {f === "ALL" ? "All" : f.replace(/_/g, " ")}
              {f === "RECEIPT_UPLOADED" && pendingReview > 0 && (
                <span className="bg-blue-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {pendingReview}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Payments Table */}
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Date</TableHeader>
              <TableHeader>BG Doc Ref</TableHeader>
              <TableHeader>Applicant</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableEmpty message="Loading payments…" />
            ) : filtered.length === 0 ? (
              <TableEmpty message={statusFilter === "ALL" ? "No payment requests yet." : `No ${statusFilter.replace(/_/g, " ").toLowerCase()} payments.`} />
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-navy-700 dark:text-navy-200">
                      …{p.bg_doc_id.slice(-8)}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{p.applicant_id ? `ID: ${p.applicant_id.slice(0, 6)}` : "—"}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-[180px]">
                    <p className="truncate">{p.description}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold tabular text-sm">{formatINR(p.amount, true)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600")}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Download receipt button */}
                      {p.receipt_url && (
                        <a href={p.receipt_url} target="_blank" rel="noopener noreferrer">
                          <Button size="xs" variant="outline" icon={<Download size={12} />}>
                            Receipt
                          </Button>
                        </a>
                      )}

                      {/* Approve / Reject — only when receipt is uploaded */}
                      {p.status === "RECEIPT_UPLOADED" && (
                        <>
                          {rejectingId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                className="text-xs border border-gray-200 dark:border-navy-700 rounded-lg px-2.5 py-1.5 w-36 bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                                placeholder="Rejection reason…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleReject(p); if (e.key === "Escape") { setRejectingId(null); setRejectReason(""); } }}
                                autoFocus
                              />
                              <Button
                                size="xs"
                                icon={<XCircle size={12} />}
                                onClick={() => handleReject(p)}
                                loading={actionLoading === p.id}
                                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                              >
                                Confirm
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="xs"
                                variant="success"
                                icon={<CheckCircle2 size={12} />}
                                onClick={() => handleApprove(p)}
                                loading={actionLoading === p.id}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                icon={<XCircle size={12} />}
                                onClick={() => { setRejectingId(p.id); setRejectReason(""); }}
                                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </>
                      )}

                      {/* Approved badge */}
                      {p.status === "APPROVED" && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Cleared {formatDate(p.approved_at, "relative")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
