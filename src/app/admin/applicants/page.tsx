"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { BGStatusBadge } from "@/components/ui/badge";
import { getAllBGs, getPendingKYCApplicants, updateKYCStatus, ApplicantUser, FirestoreBG } from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { Eye, CheckCircle2, XCircle, FileText, AlertTriangle, Inbox } from "lucide-react";
import toast from "react-hot-toast";

type ViewMode = "list" | "kyc" | "detail";

export default function AdminApplicantsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [allBGs, setAllBGs] = useState<FirestoreBG[]>([]);
  const [pendingKYC, setPendingKYC] = useState<ApplicantUser[]>([]);
  const [loadingBGs, setLoadingBGs] = useState(true);
  const [loadingKYC, setLoadingKYC] = useState(true);
  const [selectedBG, setSelectedBG] = useState<FirestoreBG | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    getAllBGs()
      .then(setAllBGs)
      .catch(() => setAllBGs([]))
      .finally(() => setLoadingBGs(false));

    getPendingKYCApplicants()
      .then(setPendingKYC)
      .catch(() => setPendingKYC([]))
      .finally(() => setLoadingKYC(false));
  }, []);

  const handleKYC = async (uid: string, action: "approve" | "reject", name: string) => {
    setLoading(`${action}-${uid}`);
    try {
      await updateKYCStatus(uid, action === "approve" ? "APPROVED" : "REJECTED");
      setPendingKYC((prev) => prev.filter((a) => a.uid !== uid));
      action === "approve"
        ? toast.success(`${name} KYC approved.`)
        : toast.error(`${name} KYC rejected.`);
    } catch {
      toast.error("Failed to update KYC status.");
    } finally {
      setLoading(null);
    }
  };

  if (view === "detail" && selectedBG) {
    return (
      <>
        <PortalHeader title="BG Detail" subtitle={`#${selectedBG.bg_id} — ${selectedBG.beneficiary_name}`} />
        <div className="portal-content space-y-6">
          <button onClick={() => { setView("list"); setSelectedBG(null); }} className="text-sm text-navy-600 dark:text-navy-300 hover:underline">← Back</button>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle>Guarantee Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["BG Reference", `#${selectedBG.bg_id}`],
                      ["Status", selectedBG.status],
                      ["Beneficiary", selectedBG.beneficiary_name],
                      ["BG Type", selectedBG.bg_type],
                      ["Amount", formatINR(selectedBG.amount_inr)],
                      ["Validity", `${selectedBG.validity_months} months`],
                      ["Tender No.", selectedBG.tender_number],
                      ["Created", formatDate(selectedBG.created_at)],
                      ["Accepted Bank", selectedBG.accepted_bank_name || "—"],
                      ["Official BG No.", selectedBG.official_bg_number || "—"],
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
                <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
                <CardContent>
                  {selectedBG.audit_trail.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No audit trail available.</p>
                  ) : (
                    selectedBG.audit_trail.map((ev: any) => (
                      <div key={ev.event_id} className="flex gap-3 pb-3 mb-3 border-b border-gray-50 dark:border-navy-800 last:border-0 last:mb-0 last:pb-0">
                        <div className="w-6 h-6 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={11} className="text-navy-600 dark:text-navy-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.description}</p>
                            <p className="text-xs text-gray-400">{formatDate(ev.timestamp, "relative")}</p>
                          </div>
                          <p className="text-xs text-gray-400">By {ev.actor}{ev.actor_role ? ` (${ev.actor_role})` : ""}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Admin Controls</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  <Button variant="outline" size="sm" className="w-full">Override Status</Button>
                  <Button variant="outline" size="sm" className="w-full">Waive Platform Fee</Button>
                  <Button variant="outline" size="sm" className="w-full">Re-broadcast to Banks</Button>
                  <Button variant="outline" size="sm" className="w-full">Download Full Report</Button>
                  <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-600">Cancel BG Request</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {selectedBG.documents.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No documents uploaded.</p>
                  ) : (
                    selectedBG.documents.map((doc: any) => (
                      <div key={doc.doc_id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-gray-400" />
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{doc.label}</p>
                        </div>
                        <Badge variant="success" size="sm">Uploaded</Badge>
                      </div>
                    ))
                  )}
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
        title="Applicant Management"
        subtitle="Review KYC, manage BG pipeline, and oversee all applicants"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant={view === "list" ? "primary" : "outline"} onClick={() => setView("list")}>BG Pipeline</Button>
            <Button size="sm" variant={view === "kyc" ? "primary" : "outline"} onClick={() => setView("kyc")}>
              KYC Queue
              {pendingKYC.length > 0 && (
                <span className="ml-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingKYC.length}</span>
              )}
            </Button>
          </div>
        }
      />
      <div className="portal-content space-y-6">

        {view === "kyc" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                KYC Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingKYC ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pendingKYC.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
                    <CheckCircle2 size={20} className="text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">All Clear</p>
                  <p className="text-xs text-gray-400">No pending KYC applications.</p>
                </div>
              ) : (
                pendingKYC.map((a) => (
                  <div key={a.uid} className="p-4 border border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-sm font-bold text-navy-700 dark:text-navy-200">
                          {(a.companyName || a.displayName || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.companyName || a.displayName || "Unknown"}</p>
                          <p className="text-xs text-gray-500">
                            {a.pan ? `PAN: ${a.pan}` : "PAN: —"}
                            {a.gstin ? ` • GSTIN: ${a.gstin}` : ""}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {a.email}
                            {a.createdAt ? ` • Submitted ${formatDate(a.createdAt, "relative")}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="xs"
                          variant="success"
                          icon={<CheckCircle2 size={11} />}
                          loading={loading === `approve-${a.uid}`}
                          onClick={() => handleKYC(a.uid, "approve", a.companyName || a.displayName || "Applicant")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          icon={<XCircle size={11} />}
                          loading={loading === `reject-${a.uid}`}
                          onClick={() => handleKYC(a.uid, "reject", a.companyName || a.displayName || "Applicant")}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-3 pt-3 border-t border-amber-100 dark:border-amber-800">
                      {[
                        { doc: "PAN Card", ok: !!a.pan },
                        { doc: "GSTIN", ok: !!a.gstin },
                        { doc: "Mobile", ok: !!a.mobile },
                        { doc: "Address", ok: !!a.companyName },
                      ].map((d) => (
                        <div key={d.doc} className="flex items-center gap-1">
                          {d.ok
                            ? <CheckCircle2 size={12} className="text-green-600" />
                            : <AlertTriangle size={12} className="text-amber-500" />}
                          <p className="text-xs text-gray-500">{d.doc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>All BG Applications</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loadingBGs ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : allBGs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                    <Inbox size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No BG Applications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    BG applications from all applicants will appear here once submitted.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeader>Date</TableHeader>
                      <TableHeader>BG Ref.</TableHeader>
                      <TableHeader>Beneficiary</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Amount</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Action</TableHeader>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {allBGs.map((bg) => (
                      <TableRow key={bg.bg_id}>
                        <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                        <TableCell>
                          <p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                          {bg.official_bg_number && <p className="text-xs text-gray-400">{bg.official_bg_number}</p>}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{bg.beneficiary_name}</TableCell>
                        <TableCell>
                          <span className="text-xs bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200 px-2 py-0.5 rounded font-medium">{bg.bg_type}</span>
                        </TableCell>
                        <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                        <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                        <TableCell>
                          <Button size="xs" icon={<Eye size={12} />} onClick={() => { setSelectedBG(bg); setView("detail"); }}>View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
