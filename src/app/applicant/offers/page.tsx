"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent } from "@/components/ui/card";
import { BGStatusBadge, OfferStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { getApplicantBGs, FirestoreBG } from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { Search, X, CheckCircle2, Building2, Star, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

export default function OffersPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBG, setSelectedBG] = useState<FirestoreBG | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getApplicantBGs(user.uid)
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoadingData(false));
  }, [user]);

  const filtered = applications.filter((bg) =>
    bg.bg_id.toLowerCase().includes(search.toLowerCase()) ||
    bg.beneficiary_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAcceptOffer = async (offer: any) => {
    setAcceptingOffer(offer.offer_id);
    await new Promise((res) => setTimeout(res, 800));
    toast.success(`Offer from ${offer.bank_name} accepted!`);
    setSelectedBG(null);
    setAcceptingOffer(null);
  };

  if (loadingData) {
    return (
      <>
        <PortalHeader title="Offers Inbox" subtitle="Review and accept bank quotes for your BG applications" />
        <div className="portal-content flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="Offers Inbox" subtitle="Review and accept bank quotes for your BG applications" />
      <div className="portal-content space-y-6">

        {applications.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Offers Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Once you submit a BG application, partner banks will review it and send you quotes here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Reference or Beneficiary…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>

            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Reference</TableHeader>
                  <TableHeader>Beneficiary</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Offers</TableHeader>
                  <TableHeader>Action</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableEmpty message="No matching BG applications" icon={<Search size={24} />} />
                ) : (
                  filtered.map((bg) => (
                    <TableRow key={bg.bg_id}>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{bg.beneficiary_name}</p>
                          <p className="text-xs text-gray-400">{bg.tender_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span>
                      </TableCell>
                      <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", bg.offers.length > 0 ? "text-navy-700 dark:text-navy-200" : "text-gray-400")}>
                          {bg.offers.length > 0 && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                          {bg.offers.length} {bg.offers.length === 1 ? "Offer" : "Offers"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {bg.offers.length > 0 ? (
                          <Button size="xs" onClick={() => setSelectedBG(bg)}>View Offers</Button>
                        ) : (
                          <span className="text-xs text-gray-400">Awaiting quotes</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}

        {/* Offer comparison modal */}
        {selectedBG && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedBG(null)}>
            <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between sticky top-0 bg-white dark:bg-navy-900 rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">#{selectedBG.bg_id} – Bank Offers</h2>
                  <p className="text-sm text-gray-500">{selectedBG.beneficiary_name} · {formatINR(selectedBG.amount_inr)}</p>
                </div>
                <button onClick={() => setSelectedBG(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors text-gray-500">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {selectedBG.offers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No offers yet for this application.</div>
                ) : (
                  selectedBG.offers.map((offer: any, i: number) => (
                    <div key={offer.offer_id} className={cn("rounded-xl border p-5 transition-all", offer.status === "ACCEPTED" ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20" : "border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-800")}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-navy-100 dark:bg-navy-700 flex items-center justify-center">
                            <Building2 size={18} className="text-navy-700 dark:text-navy-200" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white">{offer.bank_name}</span>
                              {i === 0 && <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><Star size={9} />Best Rate</span>}
                            </div>
                            <p className="text-xs text-gray-400">Valid till {formatDate(offer.valid_till)}</p>
                          </div>
                        </div>
                        <OfferStatusBadge status={offer.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {[
                          { label: "Commission Rate", value: `${offer.commission_rate}% p.a.` },
                          { label: "FD Margin",       value: `${offer.fd_margin}%` },
                          { label: "Total Cost",      value: formatINR(offer.total_cost_inr, true) },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-700/50">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                      {offer.special_conditions && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-700/30 rounded-lg p-2.5 mb-3">{offer.special_conditions}</p>
                      )}
                      {offer.status === "PENDING" && (
                        <Button className="w-full" onClick={() => handleAcceptOffer(offer)} loading={acceptingOffer === offer.offer_id} icon={<CheckCircle2 size={14} />}>
                          Accept This Offer
                        </Button>
                      )}
                      {offer.status === "ACCEPTED" && (
                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm py-1">
                          <CheckCircle2 size={16} /> Accepted
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
