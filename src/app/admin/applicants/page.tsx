"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { BGStatusBadge } from "@/components/ui/badge";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { Eye, CheckCircle2, XCircle, FileText, User, AlertTriangle, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { BGApplication } from "@/types";

type ViewMode = "list" | "kyc" | "detail";

const PENDING_KYC = [
  { id: "app-p1", company: "HORIZON BUILDERS PVT LTD", pan: "ABCDE1234F", gstin: "07ABCDE1234F1Z2", submitted: new Date("2026-03-04"), docs: "Complete", contact: "Arjun Gupta" },
  { id: "app-p2", company: "GREENFIELD EXPORTS LTD", pan: "PQRST9876Z", gstin: "19PQRST9876Z1A3", submitted: new Date("2026-03-05"), docs: "Partial", contact: "Neha Singh" },
  { id: "app-p3", company: "SKYLINE INFRA CORP", pan: "MNOPQ5678K", gstin: "29MNOPQ5678K1B5", submitted: new Date("2026-03-05"), docs: "Complete", contact: "Vikram Shah" },
];

export default function AdminApplicantsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [selectedBG, setSelectedBG] = useState<BGApplication | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleKYC = async (id: string, action: "approve" | "reject", name: string) => {
    setLoading(`${action}-${id}`);
    await new Promise((r) => setTimeout(r, 900));
    action === "approve" ? toast.success(`${name} KYC approved.`) : toast.error(`${name} KYC rejected.`);
    setLoading(null);
  };

  if (view === "detail" && selectedBG) {
    return (
      <>
        <PortalHeader title="BG Detail" subtitle={`${selectedBG.applicant_name} — #${selectedBG.bg_id}`} />
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
                      ["Applicant", selectedBG.applicant_name],
                      ["Beneficiary", selectedBG.beneficiary_name],
                      ["BG Type", selectedBG.bg_type],
                      ["Amount", formatINR(selectedBG.amount_inr)],
                      ["Validity", `${selectedBG.validity_months} months`],
                      ["Tender No.", selectedBG.tender_number],
                      ["Created", formatDate(selectedBG.created_at)],
                      ["Accepted Bank", selectedBG.accepted_bank_name || "—"],
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
                  {selectedBG.audit_trail.map((ev) => (
                    <div key={ev.event_id} className="flex gap-3 pb-3 mb-3 border-b border-gray-50 dark:border-navy-800 last:border-0 last:mb-0 last:pb-0">
                      <div className="w-6 h-6 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={11} className="text-navy-600 dark:text-navy-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.description}</p>
                          <p className="text-xs text-gray-400">{formatDate(ev.timestamp, "relative")}</p>
                        </div>
                        <p className="text-xs text-gray-400">By {ev.actor} ({ev.actor_role})</p>
                      </div>
                    </div>
                  ))}
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
                  {selectedBG.documents.map((doc) => (
                    <div key={doc.doc_id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-gray-400" />
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{doc.label}</p>
                      </div>
                      <Badge variant="success" size="sm">Uploaded</Badge>
                    </div>
                  ))}
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
              {PENDING_KYC.length > 0 && <span className="ml-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{PENDING_KYC.length}</span>}
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
              {PENDING_KYC.map((a) => (
                <div key={a.id} className="p-4 border border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-sm font-bold text-navy-700 dark:text-navy-200">
                        {a.company[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{a.company}</p>
                        <p className="text-xs text-gray-500">PAN: {a.pan} • GSTIN: {a.gstin}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Contact: {a.contact} • Submitted {formatDate(a.submitted, "relative")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={a.docs === "Complete" ? "success" : "warning"} size="sm">{a.docs} Docs</Badge>
                      <Button size="xs" variant="success" icon={<CheckCircle2 size={11} />} loading={loading === `approve-${a.id}`} onClick={() => handleKYC(a.id, "approve", a.company)}>Approve</Button>
                      <Button size="xs" variant="danger" icon={<XCircle size={11} />} loading={loading === `reject-${a.id}`} onClick={() => handleKYC(a.id, "reject", a.company)}>Reject</Button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-3 pt-3 border-t border-amber-100 dark:border-amber-800">
                    {[
                      { doc: "PAN Card", ok: true },
                      { doc: "GST Certificate", ok: true },
                      { doc: "Board Resolution", ok: a.docs === "Complete" },
                      { doc: "Financials", ok: a.docs === "Complete" },
                    ].map((d) => (
                      <div key={d.doc} className="flex items-center gap-1">
                        {d.ok ? <CheckCircle2 size={12} className="text-green-600" /> : <AlertTriangle size={12} className="text-amber-500" />}
                        <p className="text-xs text-gray-500">{d.doc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>All BG Applications</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>BG Ref.</TableHeader>
                    <TableHeader>Applicant</TableHeader>
                    <TableHeader>Beneficiary</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  {mockBGApplications.map((bg) => (
                    <TableRow key={bg.bg_id}>
                      <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                      <TableCell>
                        <p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                        {bg.official_bg_number && <p className="text-xs text-gray-400">{bg.official_bg_number}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-xs font-bold text-navy-700 dark:text-navy-200">
                            {bg.applicant_name[0]}
                          </div>
                          <p className="text-sm font-medium max-w-[130px] truncate">{bg.applicant_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">{bg.beneficiary_name}</TableCell>
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
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
