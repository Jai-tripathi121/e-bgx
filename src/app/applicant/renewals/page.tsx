"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { getApplicantBGs, FirestoreBG } from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { RefreshCw, X, Upload, AlertCircle, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

export default function RenewalsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [amendBG, setAmendBG] = useState<FirestoreBG | null>(null);
  const [extendDate, setExtendDate] = useState(false);
  const [changeAmount, setChangeAmount] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getApplicantBGs(user.uid)
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoadingData(false));
  }, [user]);

  const eligibleBGs = applications.filter((b) => b.status === "ISSUED" || b.status === "AMENDED");

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, 1200));
    toast.success("Amendment request submitted. You will receive new payment instructions from the bank.");
    setAmendBG(null);
    setExtendDate(false);
    setChangeAmount(false);
    setNewDate("");
    setNewAmount("");
    setLoading(false);
  };

  if (loadingData) {
    return (
      <>
        <PortalHeader title="Renewals & Amendments" subtitle="Extend validity or modify value of active BGs" />
        <div className="portal-content flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="Renewals & Amendments" subtitle="Extend validity or modify value of active BGs" />
      <div className="portal-content space-y-6">
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 flex gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Bank fees and FD margins will be recalculated based on your existing commercial terms. You will receive a new payment request upon approval.
          </p>
        </div>

        {eligibleBGs.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Active BGs to Renew</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Issued bank guarantees eligible for renewal or amendment will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Issue Date</TableHeader>
                <TableHeader>BG Reference</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Current Amount</TableHeader>
                <TableHeader>Expires On</TableHeader>
                <TableHeader>Action</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {eligibleBGs.map((bg) => (
                <TableRow key={bg.bg_id}>
                  <TableCell className="text-xs text-gray-400">{bg.issued_at ? formatDate(bg.issued_at) : "—"}</TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</span>
                  </TableCell>
                  <TableCell>{bg.beneficiary_name}</TableCell>
                  <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                  <TableCell>
                    <div>
                      <p>{bg.expiry_date ? formatDate(bg.expiry_date) : "—"}</p>
                      {bg.expiry_date && (new Date(bg.expiry_date).getTime() - Date.now()) / 86400000 <= 30 && (
                        <p className="text-xs text-red-500 font-medium">Expiring soon!</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="xs" variant="outline" icon={<RefreshCw size={12} />} onClick={() => setAmendBG(bg)}>Renew</Button>
                      <Button size="xs" variant="ghost" icon={<RefreshCw size={12} />} onClick={() => setAmendBG(bg)}>Amend</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Amendment Modal */}
        {amendBG && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setAmendBG(null)}>
            <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request Amendment</h2>
                  <p className="text-sm text-gray-500">#{amendBG.bg_id} · {amendBG.beneficiary_name}</p>
                </div>
                <button onClick={() => setAmendBG(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors text-gray-500">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-navy-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                  <input type="checkbox" checked={extendDate} onChange={(e) => setExtendDate(e.target.checked)} className="mt-0.5 accent-navy-800" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Extend Validity</p>
                    <p className="text-xs text-gray-400">Prolong the BG expiry date</p>
                  </div>
                </label>
                {extendDate && (
                  <Input label="New Expiry Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                )}

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-navy-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                  <input type="checkbox" checked={changeAmount} onChange={(e) => setChangeAmount(e.target.checked)} className="mt-0.5 accent-navy-800" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Change Amount</p>
                    <p className="text-xs text-gray-400">Current: {formatINR(amendBG.amount_inr)}</p>
                  </div>
                </label>
                {changeAmount && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="New amount" className="w-full rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-900 dark:text-white pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-200 dark:border-navy-700 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                  <Upload size={20} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Upload Extension Letter / LoI (PDF)</p>
                  <p className="text-xs text-gray-400 mt-1">Optional but recommended</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAmendBG(null)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleSubmit} loading={loading} disabled={!extendDate && !changeAmount}>Submit Request</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
