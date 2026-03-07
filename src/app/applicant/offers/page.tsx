"use client";
import { useState, useEffect, useMemo } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent } from "@/components/ui/card";
import { BGStatusBadge, OfferStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from "@/components/ui/table";
import {
  getApplicantBGs,
  getOffersForApplicant,
  acceptOffer,
  FirestoreBG,
  BankOffer,
} from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { Search, X, CheckCircle2, Building2, Star, Inbox, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

export default function OffersPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [allOffers, setAllOffers] = useState<BankOffer[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBG, setSelectedBG] = useState<FirestoreBG | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState<string | null>(null);

  const loadData = async (uid: string) => {
    const [bgs, offers] = await Promise.all([
      getApplicantBGs(uid),
      getOffersForApplicant(uid),
    ]);
    setApplications(bgs);
    setAllOffers(offers);
  };

  useEffect(() => {
    if (!user) return;
    loadData(user.uid).finally(() => setLoadingData(false));
  }, [user]);

  // Group offers by bg_doc_id, sorted cheapest first (lowest commission = best for applicant)
  const offersByBG = useMemo(() => {
    const map: Record<string, BankOffer[]> = {};
    for (const o of allOffers) {
      if (!map[o.bg_doc_id]) map[o.bg_doc_id] = [];
      map[o.bg_doc_id].push(o);
    }
    // Sort each group: PENDING first, then by commission_rate ascending
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        if (a.status === "ACCEPTED") return -1;
        if (b.status === "ACCEPTED") return 1;
        return a.commission_rate - b.commission_rate;
      });
    }
    return map;
  }, [allOffers]);

  const filtered = applications.filter(
    (bg) =>
      bg.bg_id.toLowerCase().includes(search.toLowerCase()) ||
      bg.beneficiary_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAcceptOffer = async (bg: FirestoreBG, offer: BankOffer) => {
    setAcceptingOffer(offer.id);
    try {
      await acceptOffer(bg.id, offer.id, offer.bank_id, offer.bank_name);
      toast.success(`Offer from ${offer.bank_name} accepted! BG moved to issuance.`);
      // Refresh data
      if (user) await loadData(user.uid);
      setSelectedBG(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to accept offer.");
    } finally {
      setAcceptingOffer(null);
    }
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

  // Offers for the selected BG modal
  const selectedOffers = selectedBG ? (offersByBG[selectedBG.id] ?? []) : [];

  return (
    <>
      <PortalHeader
        title="Offers Inbox"
        subtitle="Review competing bank quotes and accept the best offer for your BG"
      />
      <div className="portal-content space-y-6">

        {applications.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Applications Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Submit a BG application and partner banks will send you competing quotes here.
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
                  placeholder="Search by reference or beneficiary…"
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
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Bank Quotes</TableHeader>
                  <TableHeader>Best Rate</TableHeader>
                  <TableHeader>Action</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableEmpty message="No matching applications" />
                ) : (
                  filtered.map((bg) => {
                    const offers = offersByBG[bg.id] ?? [];
                    const pendingOffers = offers.filter((o) => o.status === "PENDING");
                    const bestRate = pendingOffers.length > 0
                      ? Math.min(...pendingOffers.map((o) => o.commission_rate))
                      : null;
                    const hasNewOffers = pendingOffers.length > 0 && bg.status === "PROCESSING";

                    return (
                      <TableRow key={bg.id}>
                        <TableCell>
                          <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">
                            #{bg.bg_id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white max-w-[160px] truncate">
                              {bg.beneficiary_name}
                            </p>
                            <p className="text-xs text-gray-400">{bg.tender_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200 px-2 py-0.5 rounded">
                            {bg.bg_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <BGStatusBadge status={bg.status} />
                        </TableCell>

                        {/* Quote count */}
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-sm font-semibold",
                            hasNewOffers
                              ? "text-navy-700 dark:text-navy-200"
                              : "text-gray-400"
                          )}>
                            {hasNewOffers && (
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                            {offers.length} {offers.length === 1 ? "Quote" : "Quotes"}
                          </span>
                        </TableCell>

                        {/* Best available rate */}
                        <TableCell>
                          {bestRate !== null ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                              <TrendingDown size={11} />
                              {bestRate}% p.a.
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {offers.length > 0 ? "Offer accepted" : "Awaiting quotes"}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {offers.length > 0 ? (
                            <Button size="xs" onClick={() => setSelectedBG(bg)}>
                              {bg.status === "PROCESSING" ? "Evaluate Offers" : "View Offers"}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">Awaiting quotes</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </>
        )}

        {/* ── Offer Comparison Modal ─────────────────────────────────────────── */}
        {selectedBG && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedBG(null)}
          >
            <div
              className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between sticky top-0 bg-white dark:bg-navy-900 rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    #{selectedBG.bg_id} — Bank Offers
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedBG.beneficiary_name} · {formatINR(selectedBG.amount_inr)} · {selectedBG.validity_months}M
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedOffers.length > 1 && (
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-navy-800 px-2.5 py-1 rounded-full">
                      {selectedOffers.length} competing banks
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedBG(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* BG summary bar */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-navy-800/50 border-b border-gray-100 dark:border-navy-800 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Amount:</span>{" "}
                  <strong className="text-gray-900 dark:text-white">{formatINR(selectedBG.amount_inr)}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>{" "}
                  <strong className="text-gray-900 dark:text-white">{selectedBG.bg_type}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Validity:</span>{" "}
                  <strong className="text-gray-900 dark:text-white">{selectedBG.validity_months} months</strong>
                </div>
              </div>

              {/* Offer cards */}
              <div className="p-6 space-y-4">
                {selectedOffers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No offers yet for this application.
                  </div>
                ) : (
                  selectedOffers.map((offer, i) => {
                    const totalCost = offer.bg_amount * (offer.commission_rate / 100) * (offer.validity_months / 12);
                    const isBest = i === 0 && offer.status !== "ACCEPTED" &&
                      selectedOffers.filter((o) => o.status === "PENDING").length > 1;
                    const isAccepted = offer.status === "ACCEPTED";
                    const isRejected = offer.status === "REJECTED";

                    return (
                      <div
                        key={offer.id}
                        className={cn(
                          "rounded-xl border p-5 transition-all",
                          isAccepted
                            ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20"
                            : isRejected
                            ? "border-gray-100 dark:border-navy-800 bg-gray-50 dark:bg-navy-800/30 opacity-60"
                            : isBest
                            ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/10"
                            : "border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-800"
                        )}
                      >
                        {/* Bank header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-navy-100 dark:bg-navy-700 flex items-center justify-center shrink-0">
                              <Building2 size={18} className="text-navy-700 dark:text-navy-200" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {offer.bank_name}
                                </span>
                                {isBest && (
                                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                                    <Star size={9} />
                                    Best Rate
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Valid till {formatDate(offer.valid_till)}
                              </p>
                            </div>
                          </div>
                          <OfferStatusBadge status={offer.status} />
                        </div>

                        {/* Quote metrics */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {[
                            { label: "Commission Rate", value: `${offer.commission_rate}% p.a.` },
                            { label: "FD Margin", value: `${offer.fd_margin}%` },
                            {
                              label: "Est. Commission",
                              value: formatINR(totalCost, true),
                            },
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-700/50"
                            >
                              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Conditions */}
                        {offer.conditions && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-700/30 rounded-lg p-2.5 mb-3">
                            {offer.conditions}
                          </p>
                        )}

                        {/* Action */}
                        {offer.status === "PENDING" && selectedBG.status === "PROCESSING" && (
                          <Button
                            className="w-full"
                            onClick={() => handleAcceptOffer(selectedBG, offer)}
                            loading={acceptingOffer === offer.id}
                            icon={<CheckCircle2 size={14} />}
                          >
                            Accept This Offer
                          </Button>
                        )}
                        {isAccepted && (
                          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm py-2">
                            <CheckCircle2 size={16} />
                            Offer Accepted — BG moved to issuance
                          </div>
                        )}
                        {isRejected && (
                          <p className="text-center text-xs text-gray-400 py-2">
                            Offer not selected
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
