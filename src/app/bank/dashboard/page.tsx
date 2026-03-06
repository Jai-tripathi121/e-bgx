"use client";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { mockMarketFeed, mockBGApplications, mockBankAnalytics } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { ShoppingBag, FileText, TrendingUp, Award, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function BankDashboard() {
  const acceptedBGs = mockBGApplications.filter((b) => b.status === "ISSUED" || b.status === "OFFER_ACCEPTED" || b.status === "IN_PROGRESS");
  const totalQuotes = mockBGApplications.reduce((s, b) => s + b.offers.length, 0);
  const acceptedOffers = mockBGApplications.filter((b) => b.offers.some((o) => o.status === "ACCEPTED"));
  const winRate = totalQuotes > 0 ? Math.round((acceptedOffers.length / totalQuotes) * 100) : 0;

  return (
    <>
      <PortalHeader title="Bank Dashboard" subtitle="Welcome back, Jai – Canara Bank BG Desk" />
      <div className="portal-content space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Market Feed" value={String(mockMarketFeed.length)} subtext="Fresh opportunities" icon={<ShoppingBag size={18} />} variant="navy" />
          <KPICard label="Total Quotes" value={String(totalQuotes)} subtext="Offers submitted" icon={<FileText size={18} />} />
          <KPICard label="Committed Exposure" value={formatINR(acceptedBGs.reduce((s, b) => s + b.amount_inr, 0), true)} subtext="Active portfolio" icon={<TrendingUp size={18} />} />
          <KPICard label="Win Rate" value={`${winRate}%`} subtext="Offers accepted" icon={<Award size={18} />} variant={winRate >= 60 ? "success" : "default"} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Live Market Feed */}
          <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Live Market Feed</h3>
              </div>
              <Link href="/bank/requests" className="text-sm text-navy-600 dark:text-navy-300 hover:underline font-medium">View all</Link>
            </div>
            {mockMarketFeed.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                <CheckCircle2 size={32} className="text-green-300" />
                <p className="text-sm">No new opportunities available right now</p>
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>RFP ID</TableHeader>
                    <TableHeader>Applicant</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  {mockMarketFeed.map((bg) => (
                    <TableRow key={bg.bg_id}>
                      <TableCell><span className="font-mono text-sm text-navy-700 dark:text-navy-200">#{bg.bg_id}</span></TableCell>
                      <TableCell className="max-w-[120px] truncate">{bg.applicant_name}</TableCell>
                      <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                      <TableCell><span className="text-xs text-gray-500">{bg.bg_type}</span></TableCell>
                      <TableCell>
                        <Link href={`/bank/requests?quote=${bg.bg_id}`}>
                          <Button size="xs">Quote</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Action Required */}
          <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Action Required</h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "FD verification pending", ref: "BG-6935", urgent: true },
                { label: "Draft BG approval awaited", ref: "BG-7918", urgent: false },
              ].map((task, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-navy-800 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors cursor-pointer">
                  <div className={`w-2 h-2 mt-1.5 rounded-full ${task.urgent ? "bg-red-500" : "bg-amber-500"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">#{task.ref}</p>
                  </div>
                  <Link href="/bank/issuance" className="ml-auto">
                    <Button size="xs" variant="outline">Resolve</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700 p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Performance Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockBankAnalytics.bgs_issued}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">BGs Issued (Total)</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatINR(mockBankAnalytics.avg_bg_size, true)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average Ticket Size</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockMarketFeed.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pipeline Opportunities</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
