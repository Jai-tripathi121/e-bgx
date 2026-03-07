"use client";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { KPICard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { ShoppingBag, FileText, TrendingUp, Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getMarketFeed, getBankOffers, FirestoreBG, BankOffer } from "@/lib/firestore";

export default function BankDashboard() {
  const { profile } = useAuth();
  const [marketFeed, setMarketFeed] = useState<FirestoreBG[]>([]);
  const [bankOffers, setBankOffers] = useState<BankOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([getMarketFeed(), getBankOffers(profile.uid)])
      .then(([feed, offers]) => {
        setMarketFeed(feed);
        setBankOffers(offers);
      })
      .finally(() => setLoading(false));
  }, [profile?.uid]);

  const acceptedOffers = bankOffers.filter((o) => o.status === "ACCEPTED");
  const winRate = bankOffers.length > 0 ? Math.round((acceptedOffers.length / bankOffers.length) * 100) : 0;
  const committedExposure = acceptedOffers.reduce((s, o) => s + o.bg_amount, 0);
  const pendingOffers = bankOffers.filter((o) => o.status === "PENDING");

  const subtitle = profile?.officerName
    ? `Welcome back, ${profile.officerName} – ${profile.bankName ?? ""} BG Desk`
    : profile?.bankName
    ? `Welcome back – ${profile.bankName} BG Desk`
    : "Welcome back";

  return (
    <>
      <PortalHeader title="Bank Dashboard" subtitle={subtitle} />
      <div className="portal-content space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Market Feed" value={loading ? "—" : String(marketFeed.length)} subtext="Fresh opportunities" icon={<ShoppingBag size={18} />} variant="navy" />
          <KPICard label="Total Quotes" value={loading ? "—" : String(bankOffers.length)} subtext="Offers submitted" icon={<FileText size={18} />} />
          <KPICard label="Committed Exposure" value={loading ? "—" : formatINR(committedExposure, true)} subtext="Active portfolio" icon={<TrendingUp size={18} />} />
          <KPICard label="Win Rate" value={loading ? "—" : `${winRate}%`} subtext="Offers accepted" icon={<Award size={18} />} variant={winRate >= 60 ? "success" : "default"} />
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
            {!loading && marketFeed.length === 0 ? (
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
                  {marketFeed.slice(0, 5).map((bg) => (
                    <TableRow key={bg.id}>
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

          {/* Pending Offers */}
          <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pending Offers</h3>
              <Link href="/bank/offers" className="text-sm text-navy-600 dark:text-navy-300 hover:underline font-medium">View all</Link>
            </div>
            {!loading && pendingOffers.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                <CheckCircle2 size={32} className="text-green-300" />
                <p className="text-sm">No pending offers</p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {pendingOffers.slice(0, 4).map((offer) => (
                  <div key={offer.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-navy-800 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{offer.applicant_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">#{offer.offer_id} · {formatINR(offer.bg_amount, true)}</p>
                    </div>
                    <Link href="/bank/offers">
                      <Button size="xs" variant="outline">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-navy-700 p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Performance Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? "—" : acceptedOffers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">BGs Won (Total)</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading || acceptedOffers.length === 0 ? "—" : formatINR(committedExposure / acceptedOffers.length, true)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average Ticket Size</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-navy-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? "—" : marketFeed.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pipeline Opportunities</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
