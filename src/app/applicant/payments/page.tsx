"use client";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { TxnStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { getApplicantBGs, FirestoreBG } from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { CreditCard, FileText, Inbox } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    getApplicantBGs(user.uid)
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoadingData(false));
  }, [user]);

  const allTxns = applications.flatMap((bg) =>
    (bg.payments || []).map((p: any) => ({ ...p, bg_ref: bg.bg_id, beneficiary: bg.beneficiary_name })),
  ).sort((a: any, b: any) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime());

  const totalSpent = allTxns.filter((t: any) => t.status === "SUCCESS" || t.status === "VERIFIED").reduce((s: number, t: any) => s + t.amount_inr, 0);
  const platformFees = allTxns.filter((t: any) => t.type === "PLATFORM_FEE").reduce((s: number, t: any) => s + t.amount_inr, 0);
  const fdPlaced = allTxns.filter((t: any) => t.type === "FD_DEPOSIT").reduce((s: number, t: any) => s + t.amount_inr, 0);

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
          <KPICard label="Total Spent" value={formatINR(totalSpent, true)} subtext="All verified transactions" icon={<CreditCard size={18} />} variant="navy" />
          <KPICard label="Transactions" value={String(allTxns.length)} subtext="Across all BGs" />
          <KPICard label="Platform Fees" value={formatINR(platformFees, true)} subtext="1% per BG" />
          <KPICard label="FD Placed" value={formatINR(fdPlaced, true)} subtext="Collateral deposits" />
        </div>

        {allTxns.length === 0 ? (
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
                <TableHeader>Transaction Ref</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Against BG</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Receipt</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {allTxns.map((txn: any) => (
                <TableRow key={txn.txn_id}>
                  <TableCell className="text-xs text-gray-400">{formatDate(txn.txn_date)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{txn.txn_id}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 dark:text-white">{txn.description}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-700 dark:text-navy-200">#{txn.bg_ref}</span>
                  </TableCell>
                  <TableCell>{txn.beneficiary}</TableCell>
                  <TableCell>
                    <span className="font-semibold tabular">{formatINR(txn.amount_inr, true)}</span>
                  </TableCell>
                  <TableCell><TxnStatusBadge status={txn.status} /></TableCell>
                  <TableCell>
                    <Button size="xs" variant="ghost" icon={<FileText size={12} />}>View</Button>
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
