"use client";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { TxnStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { CreditCard, FileText } from "lucide-react";

export default function PaymentsPage() {
  const allTxns = mockBGApplications.flatMap((bg) =>
    bg.payments.map((p) => ({ ...p, bg_ref: bg.bg_id, beneficiary: bg.beneficiary_name })),
  ).sort((a, b) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime());

  const totalSpent = allTxns.filter((t) => t.status === "SUCCESS" || t.status === "VERIFIED").reduce((s, t) => s + t.amount_inr, 0);

  return (
    <>
      <PortalHeader title="Payment History" subtitle="All financial transactions across your BG applications" />
      <div className="portal-content space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Spent" value={formatINR(totalSpent, true)} subtext="All verified transactions" icon={<CreditCard size={18} />} variant="navy" />
          <KPICard label="Transactions" value={String(allTxns.length)} subtext="Across all BGs" />
          <KPICard label="Platform Fees" value={formatINR(allTxns.filter((t) => t.type === "PLATFORM_FEE").reduce((s, t) => s + t.amount_inr, 0), true)} subtext="1% per BG" />
          <KPICard label="FD Placed" value={formatINR(allTxns.filter((t) => t.type === "FD_DEPOSIT").reduce((s, t) => s + t.amount_inr, 0), true)} subtext="Collateral deposits" />
        </div>

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
            {allTxns.map((txn) => (
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
      </div>
    </>
  );
}
