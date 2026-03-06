"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { getAllBGs, getAllBanks, updateBankStatus, createBankUser, BankUser, FirestoreBG } from "@/lib/firestore";
import { formatDate } from "@/lib/utils";
import { Building2, CheckCircle2, XCircle, Eye, Shield, AlertTriangle, Plus, X, Inbox, Copy } from "lucide-react";
import toast from "react-hot-toast";

const BLANK_FORM = {
  email: "", password: "", bankName: "", branchCode: "", branchEmail: "",
  officerName: "", officerDesignation: "", officerMobile: "", address: "",
};

export default function AdminBanksPage() {
  const [allBanks, setAllBanks] = useState<BankUser[]>([]);
  const [allBGs, setAllBGs] = useState<FirestoreBG[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    Promise.all([
      getAllBanks().catch(() => [] as BankUser[]),
      getAllBGs().catch(() => [] as FirestoreBG[]),
    ]).then(([banks, bgs]) => {
      setAllBanks(banks);
      setAllBGs(bgs);
      setLoading(false);
    });
  }, []);

  const pendingBanks = allBanks.filter((b) => b.status === "PENDING");
  const activeBanks = allBanks.filter((b) => b.status === "ACTIVE");

  const handleApprove = async (uid: string, name: string) => {
    setActionLoading(`approve-${uid}`);
    try {
      await updateBankStatus(uid, "ACTIVE");
      setAllBanks((prev) => prev.map((b) => b.uid === uid ? { ...b, status: "ACTIVE" } : b));
      toast.success(`${name} approved and activated.`);
    } catch { toast.error("Failed to approve bank."); }
    setActionLoading(null);
  };

  const handleReject = async (uid: string, name: string) => {
    setActionLoading(`reject-${uid}`);
    try {
      await updateBankStatus(uid, "REJECTED");
      setAllBanks((prev) => prev.filter((b) => b.uid !== uid));
      toast.error(`${name} registration rejected.`);
    } catch { toast.error("Failed to reject bank."); }
    setActionLoading(null);
  };

  const handleSuspend = async (uid: string, name: string) => {
    setActionLoading(`suspend-${uid}`);
    try {
      await updateBankStatus(uid, "SUSPENDED");
      setAllBanks((prev) => prev.map((b) => b.uid === uid ? { ...b, status: "SUSPENDED" } : b));
      toast.success(`${name} suspended.`);
      setSelectedBank(null);
    } catch { toast.error("Failed to suspend bank."); }
    setActionLoading(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.bankName || !form.branchCode || !form.officerName) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    try {
      await createBankUser(form);
      const newBanks = await getAllBanks();
      setAllBanks(newBanks);
      setCreatedCreds({ email: form.email, password: form.password });
      setForm(BLANK_FORM);
      toast.success(`${form.bankName} account created successfully.`);
    } catch (err: any) {
      const msg = err?.message || "Failed to create bank account.";
      toast.error(msg.replace("Firebase: ", "").replace(/\s*\(.*\)\.?$/, ""));
    }
    setCreating(false);
  };

  const getBankStats = (uid: string) => {
    const bgs = allBGs.filter((bg) => bg.accepted_bank_id === uid || bg.accepted_bank_name === allBanks.find(b => b.uid === uid)?.bankName);
    return { total: bgs.length, issued: bgs.filter((b) => b.status === "ISSUED").length };
  };

  if (selectedBank) {
    const stats = getBankStats(selectedBank.uid);
    return (
      <>
        <PortalHeader title="Bank Detail" subtitle={selectedBank.bankName} />
        <div className="portal-content space-y-6">
          <button onClick={() => setSelectedBank(null)} className="text-sm text-navy-600 dark:text-navy-300 hover:underline">← Back to Banks</button>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle>Institution Profile</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Bank Name", selectedBank.bankName],
                      ["Branch Code / IFSC", selectedBank.branchCode],
                      ["Address", selectedBank.address || "—"],
                      ["Branch Email", selectedBank.branchEmail],
                      ["Officer", selectedBank.officerName],
                      ["Designation", selectedBank.officerDesignation || "—"],
                      ["Officer Mobile", selectedBank.officerMobile || "—"],
                      ["Status", selectedBank.status],
                      ["Login Email", selectedBank.email],
                      ["Member Since", selectedBank.memberSince ? formatDate(selectedBank.memberSince) : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="border-b border-gray-50 dark:border-navy-800 pb-2.5">
                        <p className="text-xs text-gray-400">{k}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Performance Stats</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      ["BGs Issued", stats.issued],
                      ["Total BGs", stats.total],
                      ["Success Rate", stats.total > 0 ? `${Math.round((stats.issued / stats.total) * 100)}%` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="text-center p-3 bg-gray-50 dark:bg-navy-800 rounded-xl">
                        <p className="text-2xl font-black text-navy-900 dark:text-white">{v}</p>
                        <p className="text-xs text-gray-500 mt-1">{k}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield size={15} className="text-navy-500" />Compliance</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { doc: "RBI License", ok: true },
                    { doc: "Board Authorization", ok: true },
                    { doc: "KYC Documents", ok: true },
                    { doc: "BG Policy Document", ok: false },
                  ].map((d) => (
                    <div key={d.doc} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-navy-800 last:border-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{d.doc}</p>
                      <Badge variant={d.ok ? "success" : "warning"} size="sm">{d.ok ? "Verified" : "Pending"}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {selectedBank.status === "ACTIVE" && (
                    <Button
                      variant="outline" size="sm" className="w-full text-amber-600 border-amber-300"
                      loading={actionLoading === `suspend-${selectedBank.uid}`}
                      onClick={() => handleSuspend(selectedBank.uid, selectedBank.bankName)}
                    >
                      Suspend Bank
                    </Button>
                  )}
                  {selectedBank.status === "SUSPENDED" && (
                    <Button
                      variant="success" size="sm" className="w-full"
                      loading={actionLoading === `approve-${selectedBank.uid}`}
                      onClick={() => handleApprove(selectedBank.uid, selectedBank.bankName)}
                    >
                      Reactivate Bank
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-600"
                    loading={actionLoading === `reject-${selectedBank.uid}`}
                    onClick={() => handleReject(selectedBank.uid, selectedBank.bankName)}
                  >
                    Remove from Platform
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader
        title="Bank Management"
        subtitle="Onboard, verify, and manage all partner banks"
        actions={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
            Add Bank
          </Button>
        }
      />
      <div className="portal-content space-y-6">

        {/* Pending approvals */}
        {!loading && pendingBanks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Pending Bank Approvals
                <Badge variant="warning">{pendingBanks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingBanks.map((pb) => (
                  <div key={pb.uid} className="flex items-center gap-4 p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl">
                    <Building2 size={18} className="text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{pb.bankName}</p>
                      <p className="text-xs text-gray-500">{pb.address || "—"} • Officer: {pb.officerName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{pb.branchEmail}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="xs" variant="success" icon={<CheckCircle2 size={11} />}
                        loading={actionLoading === `approve-${pb.uid}`}
                        onClick={() => handleApprove(pb.uid, pb.bankName)}>Approve</Button>
                      <Button size="xs" variant="danger" icon={<XCircle size={11} />}
                        loading={actionLoading === `reject-${pb.uid}`}
                        onClick={() => handleReject(pb.uid, pb.bankName)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Bank Partners */}
        <Card>
          <CardHeader><CardTitle>Bank Partners</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeBanks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Bank Partners Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-4">
                  Create a bank account using the "Add Bank" button above.
                </p>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Add First Bank</Button>
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>Bank</TableHeader>
                    <TableHeader>Branch Code</TableHeader>
                    <TableHeader>Login Email</TableHeader>
                    <TableHeader>Officer</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Member Since</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  {activeBanks.map((bank) => (
                    <TableRow key={bank.uid}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-navy-100 dark:bg-navy-800 flex items-center justify-center">
                            <Building2 size={14} className="text-navy-600 dark:text-navy-300" />
                          </div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{bank.bankName}</p>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs font-mono text-gray-600 dark:text-gray-300">{bank.branchCode}</code></TableCell>
                      <TableCell className="text-xs text-gray-500">{bank.email}</TableCell>
                      <TableCell className="text-xs">{bank.officerName}</TableCell>
                      <TableCell>
                        <Badge variant={bank.status === "ACTIVE" ? "success" : bank.status === "SUSPENDED" ? "warning" : "default"}>
                          {bank.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">{bank.memberSince ? formatDate(bank.memberSince) : "—"}</TableCell>
                      <TableCell>
                        <Button size="xs" icon={<Eye size={12} />} onClick={() => setSelectedBank(bank)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Bank Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { if (!creating) { setShowCreate(false); setCreatedCreds(null); setForm(BLANK_FORM); } }}>
          <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between sticky top-0 bg-white dark:bg-navy-900 rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Bank Account</h2>
                <p className="text-sm text-gray-500">Admin-provisioned bank portal access</p>
              </div>
              <button onClick={() => { setShowCreate(false); setCreatedCreds(null); setForm(BLANK_FORM); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 text-gray-500">
                <X size={16} />
              </button>
            </div>

            {createdCreds ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-4">
                  <CheckCircle2 size={22} />
                  <span className="font-semibold">Bank account created successfully</span>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-navy-800 border border-gray-200 dark:border-navy-700 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Credentials to share with bank</p>
                  {[
                    ["Login Email", createdCreds.email],
                    ["Temporary Password", createdCreds.password],
                    ["Login URL", `${typeof window !== "undefined" ? window.location.origin : ""}/login?portal=bank`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{value}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied!"); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-navy-700 text-gray-400">
                        <Copy size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  ⚠️ Share these credentials securely. The bank should change their password on first login.
                </p>
                <Button className="w-full" onClick={() => { setShowCreate(false); setCreatedCreds(null); setForm(BLANK_FORM); }}>Done</Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Input label="Bank Name *" value={form.bankName} onChange={(e) => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="e.g. HDFC Bank Ltd" required />
                  </div>
                  <Input label="Branch Code / IFSC *" value={form.branchCode} onChange={(e) => setForm(f => ({ ...f, branchCode: e.target.value }))} placeholder="HDFC0001234" required />
                  <Input label="Branch Email" value={form.branchEmail} onChange={(e) => setForm(f => ({ ...f, branchEmail: e.target.value }))} placeholder="branch@bank.com" />
                  <Input label="Officer Name *" value={form.officerName} onChange={(e) => setForm(f => ({ ...f, officerName: e.target.value }))} placeholder="Name" required />
                  <Input label="Designation" value={form.officerDesignation} onChange={(e) => setForm(f => ({ ...f, officerDesignation: e.target.value }))} placeholder="e.g. Deputy Manager" />
                  <Input label="Officer Mobile" value={form.officerMobile} onChange={(e) => setForm(f => ({ ...f, officerMobile: e.target.value }))} placeholder="+91 XXXXXXXXXX" />
                  <div className="col-span-2">
                    <Input label="Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Branch address" />
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-navy-800 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Login Credentials</p>
                  <Input label="Login Email *" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="bank.officer@bank.com" required />
                  <Input label="Temporary Password *" type="text" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" required />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowCreate(false); setForm(BLANK_FORM); }}>Cancel</Button>
                  <Button type="submit" className="flex-1" loading={creating} icon={<Plus size={14} />}>Create Bank Account</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
