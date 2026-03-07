"use client";
import { useEffect, useState, useMemo } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { Search, X, Edit2, Send, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import {
  getMarketFeed,
  getBankOffers,
  getOffersForBGs,
  submitBankOffer,
  updateBankOffer,
  FirestoreBG,
  BankOffer,
} from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function BankRequestsPage() {
  const { profile } = useAuth();
  const [feed, setFeed] = useState<FirestoreBG[]>([]);
  const [myOffers, setMyOffers] = useState<BankOffer[]>([]);
  const [allFeedOffers, setAllFeedOffers] = useState<BankOffer[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [quoteModal, setQuoteModal] = useState<FirestoreBG | null>(null);
  const [editingOffer, setEditingOffer] = useState<BankOffer | null>(null); // existing offer being edited
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ commission: "1.5", fdMargin: "100", validity: "30", conditions: "" });

  // Load market feed + this bank's offers in parallel
  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([getMarketFeed(), getBankOffers(profile.uid)])
      .then(([feedData, bankOfferData]) => {
        setFeed(feedData);
        setMyOffers(bankOfferData);
        // Load offer counts for all feed BGs
        const ids = feedData.map((b) => b.id);
        if (ids.length > 0) {
          getOffersForBGs(ids).then(setAllFeedOffers);
        }
      })
      .finally(() => setLoadingFeed(false));
  }, [profile?.uid]);

  // Maps for quick lookup
  const myOffersMap = useMemo(
    () => Object.fromEntries(myOffers.map((o) => [o.bg_doc_id, o])),
    [myOffers]
  );

  const offerCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of allFeedOffers) {
      m[o.bg_doc_id] = (m[o.bg_doc_id] ?? 0) + 1;
    }
    return m;
  }, [allFeedOffers]);

  const filtered = feed.filter(
    (bg) =>
      bg.bg_id.toLowerCase().includes(search.toLowerCase()) ||
      bg.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
      bg.beneficiary_name.toLowerCase().includes(search.toLowerCase())
  );

  // Open modal — pre-fill if editing existing offer
  const openQuoteModal = (bg: FirestoreBG) => {
    const existing = myOffersMap[bg.id];
    setEditingOffer(existing ?? null);
    setForm(
      existing
        ? {
            commission: String(existing.commission_rate),
            fdMargin: String(existing.fd_margin),
            validity: String(existing.offer_valid_days),
            conditions: existing.conditions ?? "",
          }
        : { commission: "1.5", fdMargin: "100", validity: "30", conditions: "" }
    );
    setQuoteModal(bg);
  };

  const handleSubmit = async () => {
    if (!profile?.uid || !quoteModal) return;
    setSubmitting(true);
    try {
      if (editingOffer) {
        // Update existing offer
        await updateBankOffer(editingOffer.id, {
          commission_rate: parseFloat(form.commission),
          fd_margin: parseFloat(form.fdMargin),
          offer_valid_days: parseInt(form.validity),
          conditions: form.conditions,
        });
        toast.success("Offer updated successfully.");
        // Refresh myOffers
        const refreshed = await getBankOffers(profile.uid);
        setMyOffers(refreshed);
      } else {
        // Submit new offer
        await submitBankOffer({
          bg_id: quoteModal.bg_id,
          bg_doc_id: quoteModal.id,
          bank_id: profile.uid,
          bank_name: profile.bankName ?? profile.displayName ?? "Bank",
          applicant_id: quoteModal.applicant_id,
          applicant_name: quoteModal.applicant_name,
          bg_amount: quoteModal.amount_inr,
          bg_type: quoteModal.bg_type,
          validity_months: quoteModal.validity_months,
          commission_rate: parseFloat(form.commission),
          fd_margin: parseFloat(form.fdMargin),
          offer_valid_days: parseInt(form.validity),
          conditions: form.conditions || undefined,
        });
        toast.success("Term sheet submitted to applicant's Offers Inbox.");
        // Refresh both my offers + feed offer counts
        const [refreshedOffers, refreshedFeedOffers] = await Promise.all([
          getBankOffers(profile.uid),
          getOffersForBGs(feed.map((b) => b.id)),
        ]);
        setMyOffers(refreshedOffers);
        setAllFeedOffers(refreshedFeedOffers);
      }
      setQuoteModal(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const estCost =
    quoteModal
      ? quoteModal.amount_inr * (parseFloat(form.commission || "0") / 100) * (quoteModal.validity_months / 12)
      : 0;

  return (
    <>
      <PortalHeader title="BG Market Feed" subtitle="Active BG requests from applicants — submit or edit your commercial offer" />
      <div className="portal-content space-y-6">

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant, beneficiary, ref…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
        </div>

        <Table>
          <TableHead>
            <tr>
              <TableHeader>RFP ID</TableHeader>
              <TableHeader>Applicant</TableHeader>
              <TableHeader>Beneficiary</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Validity</TableHeader>
              <TableHeader>Quotes</TableHeader>
              <TableHeader>My Offer</TableHeader>
              <TableHeader>Received</TableHeader>
              <TableHeader>Action</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {loadingFeed ? (
              <TableEmpty message="Loading market feed…" />
            ) : filtered.length === 0 ? (
              <TableEmpty message="No active BG requests" />
            ) : (
              filtered.map((bg) => {
                const myOffer = myOffersMap[bg.id];
                const quoteCount = offerCountMap[bg.id] ?? 0;
                return (
                  <TableRow key={bg.id}>
                    <TableCell>
                      <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900 dark:text-white max-w-[140px] truncate">{bg.applicant_name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-[150px] truncate">{bg.beneficiary_name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200 px-2 py-0.5 rounded">
                        {bg.bg_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{bg.validity_months}M</TableCell>

                    {/* Competing quotes count */}
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        quoteCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"
                      )}>
                        <Users size={11} />
                        {quoteCount}
                      </span>
                    </TableCell>

                    {/* This bank's quote */}
                    <TableCell>
                      {myOffer ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {myOffer.commission_rate}% p.a.
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-gray-400">
                      {formatDate(bg.created_at, "relative")}
                    </TableCell>

                    <TableCell>
                      {myOffer ? (
                        <Button
                          size="xs"
                          variant="outline"
                          icon={<Edit2 size={11} />}
                          onClick={() => openQuoteModal(bg)}
                        >
                          Edit Offer
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          icon={<Send size={11} />}
                          onClick={() => openQuoteModal(bg)}
                        >
                          Quote
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Quote / Edit Offer Modal */}
        {quoteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setQuoteModal(null)}
          >
            <div
              className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingOffer ? "Edit Commercial Offer" : "Submit Commercial Offer"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    #{quoteModal.bg_id} · {formatINR(quoteModal.amount_inr)} · {quoteModal.validity_months}M
                  </p>
                </div>
                <button
                  onClick={() => setQuoteModal(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* BG summary */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-navy-800 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">BG Details</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{quoteModal.applicant_name}</p>
                  <p className="text-sm text-gray-500">
                    {quoteModal.beneficiary_name} · {quoteModal.bg_type} · {quoteModal.tender_number}
                  </p>
                </div>

                {editingOffer && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <Edit2 size={13} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      You already submitted an offer at <strong>{editingOffer.commission_rate}% p.a.</strong> — update the terms below.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Commission Rate (% p.a.)"
                    type="number"
                    step="0.1"
                    value={form.commission}
                    onChange={(e) => setForm({ ...form, commission: e.target.value })}
                    required
                  />
                  <Input
                    label="FD Margin (%)"
                    type="number"
                    value={form.fdMargin}
                    onChange={(e) => setForm({ ...form, fdMargin: e.target.value })}
                    required
                  />
                  <Input
                    label="Offer Valid for (Days)"
                    type="number"
                    value={form.validity}
                    onChange={(e) => setForm({ ...form, validity: e.target.value })}
                    required
                  />
                  <div className="flex flex-col justify-end">
                    <p className="text-xs font-medium text-gray-500 mb-1">Est. Commission</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatINR(estCost, true)}
                    </p>
                    <p className="text-xs text-gray-400">for full validity</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Special Conditions</label>
                  <textarea
                    value={form.conditions}
                    onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                    placeholder="Any special conditions or collateral requirements…"
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setQuoteModal(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit} loading={submitting}>
                    {editingOffer ? "Update Offer" : "Submit Offer"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
