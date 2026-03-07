"use client";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { getMarketFeed, submitBankOffer, FirestoreBG } from "@/lib/firestore";

export default function BankRequestsPage() {
  const { profile } = useAuth();
  const [feed, setFeed] = useState<FirestoreBG[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [search, setSearch] = useState("");
  const [quoteModal, setQuoteModal] = useState<FirestoreBG | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [offer, setOffer] = useState({ commission: "1.5", fdMargin: "100", validity: "30", conditions: "" });

  useEffect(() => {
    getMarketFeed()
      .then(setFeed)
      .finally(() => setLoadingFeed(false));
  }, []);

  const filtered = feed.filter((bg) =>
    bg.bg_id.toLowerCase().includes(search.toLowerCase()) ||
    bg.applicant_name.toLowerCase().includes(search.toLowerCase())
  );

  const submitOffer = async () => {
    if (!profile?.uid || !quoteModal) return;
    setSubmitting(true);
    try {
      await submitBankOffer({
        bg_id: quoteModal.bg_id,
        bg_doc_id: quoteModal.id,
        bank_id: profile.uid,
        bank_name: profile.bankName ?? profile.displayName,
        applicant_id: quoteModal.applicant_id,
        applicant_name: quoteModal.applicant_name,
        bg_amount: quoteModal.amount_inr,
        bg_type: quoteModal.bg_type,
        validity_months: quoteModal.validity_months,
        commission_rate: parseFloat(offer.commission),
        fd_margin: parseFloat(offer.fdMargin),
        offer_valid_days: parseInt(offer.validity),
        conditions: offer.conditions || undefined,
      });
      toast.success("Term sheet submitted to applicant's Offers Inbox.");
      setQuoteModal(null);
      setOffer({ commission: "1.5", fdMargin: "100", validity: "30", conditions: "" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit offer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PortalHeader title="BG Requests" subtitle="All incoming BG requests from applicants" />
      <div className="portal-content space-y-6">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant or reference…"
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
              <TableHeader>Received</TableHeader>
              <TableHeader>Action</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {loadingFeed ? (
              <TableEmpty message="Loading market feed…" />
            ) : filtered.length === 0 ? (
              <TableEmpty message="No BG requests found" />
            ) : (
              filtered.map((bg) => (
                <TableRow key={bg.id}>
                  <TableCell><span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</span></TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-900 dark:text-white max-w-[160px] truncate">{bg.applicant_name}</p>
                  </TableCell>
                  <TableCell>{bg.beneficiary_name}</TableCell>
                  <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                  <TableCell><span className="text-xs bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200 px-2 py-0.5 rounded">{bg.bg_type}</span></TableCell>
                  <TableCell>{bg.validity_months}M</TableCell>
                  <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at, "relative")}</TableCell>
                  <TableCell>
                    <Button size="xs" onClick={() => setQuoteModal(bg)}>Quote</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Quote Modal */}
        {quoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setQuoteModal(null)}>
            <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Submit Commercial Offer</h2>
                  <p className="text-sm text-gray-500">#{quoteModal.bg_id} · {formatINR(quoteModal.amount_inr)} · {quoteModal.validity_months}M</p>
                </div>
                <button onClick={() => setQuoteModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors text-gray-500"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                {/* Applicant Summary */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-navy-800 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{quoteModal.applicant_name}</p>
                  <p className="text-sm text-gray-500">{quoteModal.beneficiary_name} · {quoteModal.bg_type}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Commission Rate (% p.a.)" type="number" value={offer.commission} onChange={(e) => setOffer({ ...offer, commission: e.target.value })} suffix={<span>%</span>} required />
                  <Input label="FD Margin (%)" type="number" value={offer.fdMargin} onChange={(e) => setOffer({ ...offer, fdMargin: e.target.value })} suffix={<span>%</span>} required />
                  <Input label="Offer Valid for (Days)" type="number" value={offer.validity} onChange={(e) => setOffer({ ...offer, validity: e.target.value })} required />
                  <div className="flex flex-col justify-end">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Cost (Est.)</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatINR(quoteModal.amount_inr * (parseFloat(offer.commission || "0") / 100) * (quoteModal.validity_months / 12), true)}
                    </p>
                    <p className="text-xs text-gray-400">Commission only</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Special Conditions</label>
                  <textarea
                    value={offer.conditions}
                    onChange={(e) => setOffer({ ...offer, conditions: e.target.value })}
                    placeholder="Any special conditions or collateral requirements…"
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setQuoteModal(null)}>Cancel</Button>
                  <Button className="flex-1" onClick={submitOffer} loading={submitting}>Submit Offer</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
