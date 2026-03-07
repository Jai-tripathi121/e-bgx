"use client";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { getApplicantAllPayments, ApplicantPaymentRecord } from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { CreditCard, FileText, Inbox, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const STATUS_COLORS: Record<string, string> = {
  PENDING:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECEIPT_UPLOADED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_LABELS: Record<string, string> = {
  PLATFORM_FEE: "Platform Processing Fee",
  FD_DEPOSIT:   "FD Deposit",
  BANK_FEE:     "Bank Fee",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<ApplicantPaymentRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    getApplicantAllPayments(user.uid)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoadingData(false));
  }, [user]);

  const totalSpent = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + p.amount, 0);
  const platformFees = payments
    .filter((p) => p.type === "PLATFORM_FEE" && p.status === "APPROVED")
    .reduce((s, p) => s + p.amount, 0);
  const fdPlaced = payments
    .filter((p) => p.type === "FD_DEPOSIT" && p.status === "APPROVED")
    .reduce((s, p) => s + p.amount, 0);

  if (loadingData) {
    return (
      <>
        <PortalHeader title="Payment History" subtitle="All financial transactions across your BG applications" />
        <div className="portal-content flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="Payment History" subtitle="All financial transactions across your BG applications" />
      <div className="portal-content space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Paid" value={formatINR(totalSpent, true)} subtext="All approved payments" icon={<CreditCard size={18} />} variant="navy" />
          <KPICard label="Transactions" value={String(payments.length)} subtext="Across all BGs" />
          <KPICard label="Platform Fees" value={formatINR(platformFees, true)} subtext="e-BGX processing fee" />
          <KPICard label="FD Placed" value={formatINR(fdPlaced, true)} subtext="Collateral deposits" />
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Transactions Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Payment transactions will appear here once your BG applications progress through the pipeline.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Against BG</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Receipt</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-gray-400">{p.created_at ? formatDate(p.created_at) : "—"}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-700 dark:text-navy-200">#{p.bg_id}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 dark:text-white">{p.description}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300 font-medium">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold tabular">{formatINR(p.amount, true)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.receipt_url ? (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer">
                        <Button size="xs" variant="ghost" icon={<ExternalLink size={12} />}>View</Button>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
