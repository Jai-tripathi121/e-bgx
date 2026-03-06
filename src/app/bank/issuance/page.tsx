"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge, TxnStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { Eye, CheckCircle2, FileText, CreditCard, Building2, History, MessageSquare, Download } from "lucide-react";
import { BGApplication } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const TABS = ["Overview", "Profile", "Documents", "Payments", "History", "Messages"] as const;
type Tab = (typeof TABS)[number];

const WORKFLOW_STEPS = [
  { key: "applied",        label: "Applied" },
  { key: "offer_accepted", label: "Offer Accepted" },
  { key: "fees_verified",  label: "Fees & FD Verified" },
  { key: "draft",          label: "Draft Generated" },
  { key: "issued",         label: "Final Issuance" },
];

export default function BankIssuancePage() {
  const [selectedBG, setSelectedBG] = useState<BGApplication | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState<string | null>(null);

  const accepted = mockBGApplications.filter((b) => b.offers.some((o) => o.status === "ACCEPTED"));

  const handleAction = async (action: string) => {
    setLoading(action);
    await new Promise((res) => setTimeout(res, 1000));
    const msgs: Record<string, string> = {
      payment: "Payment and FD request sent to applicant.",
      draft:   "Draft BG request sent to generation queue.",
      issue:   "Final BG issued successfully! BG number assigned.",
    };
    toast.success(msgs[action] || "Action completed.");
    setLoading(null);
  };

  const getStepStatus = (bg: BGApplication, key: string) => {
    if (bg.status === "ISSUED") return "complete";
    const map: Record<string, string[]> = {
      applied: ["OFFER_ACCEPTED", "IN_PROGRESS", "PROCESSING", "PAYMENT_CONFIRMED", "ISSUED"],
      offer_accepted: ["IN_PROGRESS", "PROCESSING", "PAYMENT_CONFIRMED", "ISSUED"],
      fees_verified: ["PAYMENT_CONFIRMED", "ISSUED"],
      draft: ["ISSUED"],
    };
    if (map[key]?.includes(bg.status)) return "complete";
    return "pending";
  };

  return (
    <>
      <PortalHeader title="BG Issuance Desk" subtitle="Manage the full post-acceptance issuance workflow" />
      <div className="portal-content space-y-6">
        {!selectedBG ? (
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Reference / BG No.</TableHeader>
                <TableHeader>Applicant</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {accepted.map((bg) => (
                <TableRow key={bg.bg_id}>
                  <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                      {bg.official_bg_number && <p className="text-xs text-gray-400">{bg.official_bg_number}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{bg.applicant_name}</TableCell>
                  <TableCell>{bg.beneficiary_name}</TableCell>
                  <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                  <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                  <TableCell>
                    <Button size="xs" icon={<Eye size={12} />} onClick={() => { setSelectedBG(bg); setActiveTab("Overview"); }}>View BG</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedBG(null)} className="text-sm text-navy-600 dark:text-navy-300 hover:underline">← Back</button>
              <span className="font-mono font-semibold text-sm text-gray-700 dark:text-gray-200">#{selectedBG.bg_id}</span>
              <BGStatusBadge status={selectedBG.status} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl overflow-x-auto">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all", activeTab === tab ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700")}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "Overview" && (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Guarantee Snapshot</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          ["Beneficiary",    selectedBG.beneficiary_name],
                          ["Amount",         formatINR(selectedBG.amount_inr)],
                          ["BG Type",        selectedBG.bg_type],
                          ["Validity",       `${selectedBG.validity_months} Months`],
                          ["Tender No.",     selectedBG.tender_number],
                          ["Required By",    formatDate(selectedBG.required_by_date)],
                        ].map(([k, v]) => (
                          <div key={k} className="border-b border-gray-50 dark:border-navy-800 pb-2.5">
                            <p className="text-xs text-gray-400">{k}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{v}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Workflow Actions */}
                  <Card>
                    <CardHeader><CardTitle>Workflow Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-between" variant="outline" icon={<CreditCard size={14} />} iconPosition="right" onClick={() => handleAction("payment")} loading={loading === "payment"}>
                        Request Payment & FD
                      </Button>
                      <Button className="w-full justify-between" variant="outline" icon={<FileText size={14} />} iconPosition="right" onClick={() => handleAction("draft")} loading={loading === "draft"}>
                        Request Draft BG
                      </Button>
                      <Button className="w-full justify-between" variant="success" icon={<CheckCircle2 size={14} />} iconPosition="right" onClick={() => handleAction("issue")} loading={loading === "issue"} disabled={selectedBG.status === "ISSUED"}>
                        {selectedBG.status === "ISSUED" ? "BG Already Issued ✓" : "Issue Final BG"}
                      </Button>
                      <Button className="w-full" variant="ghost" icon={<MessageSquare size={14} />} onClick={() => setActiveTab("Messages")}>
                        Request Clarification
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Workflow Progress */}
                <Card>
                  <CardHeader><CardTitle>Workflow Progress</CardTitle></CardHeader>
                  <CardContent>
                    {WORKFLOW_STEPS.map((ws, i) => {
                      const status = getStepStatus(selectedBG, ws.key);
                      const isLast = i === WORKFLOW_STEPS.length - 1;
                      return (
                        <div key={ws.key} className={cn("flex gap-3 pb-4 relative", !isLast ? "before:absolute before:left-3 before:top-7 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-navy-800" : "")}>
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 mt-0.5", status === "complete" ? "bg-green-500" : "bg-gray-100 dark:bg-navy-800 border-2 border-gray-200 dark:border-navy-700")}>
                            {status === "complete" ? <CheckCircle2 size={12} className="text-white" /> : <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>}
                          </div>
                          <p className={cn("text-sm font-medium pt-0.5", status === "complete" ? "text-gray-900 dark:text-white" : "text-gray-400")}>{ws.label}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "Profile" && (
              <Card>
                <CardHeader><CardTitle>Applicant Profile</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Company", selectedBG.applicant_name],
                      ["Beneficiary", selectedBG.beneficiary_name],
                      ["Tender No.", selectedBG.tender_number],
                      ["BG Amount", formatINR(selectedBG.amount_inr)],
                    ].map(([k, v]) => (
                      <div key={k} className="border-b border-gray-50 dark:border-navy-800 pb-2.5">
                        <p className="text-xs text-gray-400">{k}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "Documents" && (
              <Card>
                <CardHeader><CardTitle>Document Vault</CardTitle></CardHeader>
                <CardContent>
                  {selectedBG.documents.map((doc) => (
                    <div key={doc.doc_id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-navy-800 mb-2">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-navy-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.label}</p>
                          <p className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</p>
                        </div>
                      </div>
                      <Button size="xs" variant="outline" icon={<Download size={12} />}>Download</Button>
                    </div>
                  ))}

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-navy-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Upload BG Document</p>
                    <div className="border-2 border-dashed border-gray-200 dark:border-navy-700 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
                      <FileText size={24} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Upload Draft or Final BG PDF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "Payments" && (
              <Card>
                <CardHeader><CardTitle>Payment Ledger</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeader>Date</TableHeader>
                        <TableHeader>Type</TableHeader>
                        <TableHeader>Amount</TableHeader>
                        <TableHeader>Status</TableHeader>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {selectedBG.payments.map((p) => (
                        <TableRow key={p.txn_id}>
                          <TableCell className="text-xs text-gray-400">{formatDate(p.txn_date)}</TableCell>
                          <TableCell><span className="font-medium">{p.description}</span></TableCell>
                          <TableCell><span className="font-semibold">{formatINR(p.amount_inr, true)}</span></TableCell>
                          <TableCell><TxnStatusBadge status={p.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === "History" && (
              <Card>
                <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
                <CardContent>
                  {selectedBG.audit_trail.map((ev, i) => (
                    <div key={ev.event_id} className="flex gap-4 pb-3 mb-3 border-b border-gray-50 dark:border-navy-800 last:border-0 last:mb-0 last:pb-0">
                      <div className="w-6 h-6 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={11} className="text-navy-600 dark:text-navy-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.description}</p>
                          <p className="text-xs text-gray-400">{formatDate(ev.timestamp, "relative")}</p>
                        </div>
                        <p className="text-xs text-gray-400">By {ev.actor}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === "Messages" && (
              <Card>
                <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64 overflow-y-auto space-y-3 mb-4">
                    {[
                      { text: "Application submitted to marketplace.", sender: "System", type: "system" },
                      { text: "We have submitted our commercial offer.", sender: "Jai – Canara Bank", type: "bank" },
                      { text: "Offer accepted. Please proceed with payment instructions.", sender: "Applicant", type: "applicant" },
                    ].map((msg, i) => (
                      <div key={i} className={cn("max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm", msg.type === "system" ? "bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 mx-auto text-center w-full text-xs" : msg.type === "bank" ? "ml-auto bg-navy-900 text-white" : "bg-navy-50 dark:bg-navy-800")}>
                        {msg.type !== "system" && <p className="text-xs font-semibold mb-1 opacity-60">{msg.sender}</p>}
                        {msg.text}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 dark:border-navy-800 pt-4">
                    <input placeholder="Type a message…" className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    <Button size="sm">Send</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
