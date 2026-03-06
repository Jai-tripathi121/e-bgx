"use client";
import Link from "next/link";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { ApplicantPortfolioChart, ApplicantBeneficiaryChart } from "@/components/charts/applicant-charts";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { Plus, Eye, Navigation, Download, Inbox } from "lucide-react";

export default function ApplicantDashboard() {
  const activeBGs = mockBGApplications.filter((b) => b.status === "ISSUED");
  const totalExposure = activeBGs.reduce((s, b) => s + b.amount_inr, 0);
  const pipeline = mockBGApplications.filter((b) => b.status !== "ISSUED" && b.status !== "EXPIRED");
  const quotesReceived = mockBGApplications.reduce((s, b) => s + b.offers.length, 0);

  return (
    <>
      <PortalHeader
        title="Dashboard"
        subtitle="Welcome back, Jai Tripathi"
        actions={
          <Link href="/applicant/apply">
            <Button size="sm" icon={<Plus size={14} />}>New Application</Button>
          </Link>
        }
      />
      <div className="portal-content space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Active Portfolio"
            value={String(activeBGs.length)}
            subtext={`${activeBGs.length} Live BG${activeBGs.length !== 1 ? "s" : ""}`}
            icon={<Eye size={18} />}
            variant="navy"
          />
          <KPICard
            label="Total Exposure"
            value={formatINR(totalExposure, true)}
            subtext="Active BGs cumulative"
            icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KPICard
            label="Pipeline"
            value={String(pipeline.length)}
            subtext={`${quotesReceived} quote${quotesReceived !== 1 ? "s" : ""} received`}
            icon={<Navigation size={18} />}
          />
          <KPICard
            label="Renewals Due"
            value="1"
            subtext="Expiring within 30 days"
            variant="warning"
            icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ApplicantBeneficiaryChart applications={mockBGApplications} />
          </div>
          <div>
            <ApplicantPortfolioChart applications={mockBGApplications} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <Link href="/applicant/issuance" className="text-sm text-navy-600 dark:text-navy-300 hover:underline font-medium">View all</Link>
          </div>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {mockBGApplications.map((bg) => (
                <TableRow key={bg.bg_id}>
                  <TableCell>
                    <span className="font-medium text-navy-700 dark:text-navy-200">#{bg.bg_id}</span>
                  </TableCell>
                  <TableCell>{bg.beneficiary_name}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-gray-900 dark:text-white tabular">{formatINR(bg.amount_inr, true)}</span>
                  </TableCell>
                  <TableCell>
                    <BGStatusBadge status={bg.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/applicant/issuance/${bg.bg_id}`}>
                        <Button size="xs" variant="outline" icon={<Eye size={12} />}>View</Button>
                      </Link>
                      <Link href={`/applicant/track?id=${bg.bg_id}`}>
                        <Button size="xs" variant="ghost" icon={<Navigation size={12} />}>Track</Button>
                      </Link>
                      {bg.status === "ISSUED" && (
                        <Button size="xs" variant="ghost" icon={<Download size={12} />}>Download</Button>
                      )}
                      {bg.offers.length > 0 && bg.status === "DRAFT" && (
                        <Link href={`/applicant/offers?id=${bg.bg_id}`}>
                          <Button size="xs" variant="success">{bg.offers.length} Offers</Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/applicant/apply",    icon: <Plus size={18} />,   title: "New BG Application",    desc: "Start a new bank guarantee request" },
            { href: "/applicant/offers",   icon: <Inbox size={18} />,  title: "View Offers",           desc: "Compare bank quotes in your inbox" },
            { href: "/applicant/renewals", icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>, title: "Renew / Amend BG", desc: "Extend or modify an active guarantee" },
          ].map((qa) => (
            <Link key={qa.href} href={qa.href} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-800 flex items-center justify-center text-navy-700 dark:text-navy-300 group-hover:bg-navy-100 dark:group-hover:bg-navy-700 transition-colors shrink-0">
                {qa.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{qa.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{qa.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
