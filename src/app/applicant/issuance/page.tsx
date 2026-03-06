"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { Eye, Download, Navigation, CreditCard, FileText, MessageSquare, Clock, CheckCircle2, Building2, History } from "lucide-react";
import { BGApplication } from "@/types";
import { TxnStatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Bank", "Documents", "Payments", "History", "Messages"] as const;
type Tab = (typeof TABS)[number];

export default function IssuancePage() {
  const [selectedBG, setSelectedBG] = useState<BGApplication | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const WORKFLOW_STEPS = [
    { key: "applied", label: "Applied" },
    { key: "offer_accepted", label: "Offer Accepted" },
    { key: "fees_verified", label: "Fees & FD Verified" },
    { key: "draft", label: "Draft Generated" },
    { key: "issued", label: "Final Issuance" },
  ];

  const getStepStatus = (bg: BGApplication, step: string) => {
    if (bg.status === "ISSUED") return "complete";
    if (step === "applied") return "complete";
    if (step === "offer_accepted" && ["OFFER_ACCEPTED","PROCESSING","PAYMENT_CONFIRMED","ISSUED","IN_PROGRESS"].includes(bg.status)) return "complete";
    if (step === "fees_verified" && ["PAYMENT_CONFIRMED","ISSUED"].includes(bg.status)) return "complete";
    if (step === "applied") return "active";
    return "pending";
  };

  return (
    <>
      <PortalHeader title="Active BGs" subtitle="Track all BG applications in the issuance pipeline" />
      <div className="portal-content space-y-6">
        {!selectedBG ? (
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Issuing Bank</TableHeader>
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
                    <div>
                      <p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                      {bg.official_bg_number && <p className="text-xs text-gray-400">BG: {bg.official_bg_number}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{bg.beneficiary_name}</TableCell>
                  <TableCell>{bg.accepted_bank_name || <span className="text-gray-400 text-xs">—</span>}</TableCell>
                  <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                  <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="xs" variant="outline" icon={<Eye size={12} />} onClick={() => { setSelectedBG(bg); setActiveTab("Overview"); }}>View</Button>
                      {bg.status === "ISSUED" && (
                        <Button size="xs" variant="ghost" icon={<Download size={12} />}>Download</Button>
                      )}
                      {bg.status === "PAY_FEES" && (
                        <Button size="xs" variant="danger" icon={<CreditCard size={12} />}>Pay Now</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          /* BG Detail View */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedBG(null)} className="text-sm text-navy-600 dark:text-navy-300 hover:underline flex items-center gap-1">
                ← Back to list
              </button>
              <span className="text-gray-300 dark:text-navy-600">|</span>
              <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">#{selectedBG.bg_id}</span>
              <BGStatusBadge status={selectedBG.status} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                  )}
                >
                  {tab === "Overview" && <Eye size={13} />}
                  {tab === "Bank" && <Building2 size={13} />}
                  {tab === "Documents" && <FileText size={13} />}
                  {tab === "Payments" && <CreditCard size={13} />}
                  {tab === "History" && <History size={13} />}
                  {tab === "Messages" && <MessageSquare size={13} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
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
                          ["Expiry Date",    selectedBG.expiry_date ? formatDate(selectedBG.expiry_date) : "—"],
                          ["Issuing Bank",   selectedBG.accepted_bank_name || "—"],
                          ["Official BG No.",selectedBG.official_bg_number || "—"],
                        ].map(([k, v]) => (
                          <div key={k} className="border-b border-gray-50 dark:border-navy-800 pb-2.5">
                            <p className="text-xs text-gray-400">{k}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{v}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {selectedBG.offers[0] && (
                    <Card>
                      <CardHeader><CardTitle>Agreed Commercials</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            ["Commission", `${selectedBG.offers[0].commission_rate}% p.a.`],
                            ["FD Margin",  `${selectedBG.offers[0].fd_margin}%`],
                            ["Total Cost", formatINR(selectedBG.offers[0].total_cost_inr, true)],
                          ].map(([k, v]) => (
                            <div key={k} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
                              <p className="text-xs text-gray-400">{k}</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{v}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Workflow steps */}
                <Card>
                  <CardHeader><CardTitle>Issuance Progress</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-0">
                      {WORKFLOW_STEPS.map((ws, i) => {
                        const status = getStepStatus(selectedBG, ws.key);
                        return (
                          <div key={ws.key} className="workflow-step pb-4">
                            <div className={cn("workflow-step-dot", status)}>
                              {status === "complete" ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                            </div>
                            <div className="pt-0.5">
                              <p className={cn("text-sm font-medium", status === "complete" ? "text-green-600 dark:text-green-400" : status === "active" ? "text-gray-900 dark:text-white" : "text-gray-400")}>{ws.label}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "Documents" && (
              <Card>
                <CardHeader><CardTitle>Document Vault</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedBG.documents.map((doc) => (
                      <div key={doc.doc_id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-navy-800 hover:bg-gray-50 dark:hover:bg-navy-800/50 transition-colors">
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
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "Payments" && (
              <Card>
                <CardHeader><CardTitle>Payment & Transaction Ledger</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeader>Date</TableHeader>
                        <TableHeader>Description</TableHeader>
                        <TableHeader>Amount</TableHeader>
                        <TableHeader>Status</TableHeader>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {selectedBG.payments.map((p) => (
                        <TableRow key={p.txn_id}>
                          <TableCell className="text-xs text-gray-400">{formatDate(p.txn_date)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{p.description}</p>
                              <p className="text-xs text-gray-400 font-mono">{p.txn_id}</p>
                            </div>
                          </TableCell>
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
                <CardHeader><CardTitle>Audit Trail & History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {selectedBG.audit_trail.map((ev, i) => (
                      <div key={ev.event_id} className={cn("flex gap-4 pb-4", i < selectedBG.audit_trail.length - 1 ? "border-l-2 border-gray-100 dark:border-navy-800 ml-3.5" : "")}>
                        <div className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 -ml-3.5">
                          <Clock size={12} className="text-navy-600 dark:text-navy-300" />
                        </div>
                        <div className="pb-0 flex-1 pt-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.description}</p>
                            <p className="text-xs text-gray-400 shrink-0 ml-4">{formatDate(ev.timestamp, "relative")}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">By {ev.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "Messages" && (
              <Card>
                <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                    {[
                      { sender: "System", text: "BG Application submitted and broadcasted to partner banks.", time: "Jan 15, 09:00", type: "system" },
                      { sender: "Canara Bank", text: "We have reviewed your application. Please find our commercial offer attached.", time: "Jan 17, 11:00", type: "bank" },
                      { sender: "Jai Tripathi", text: "Thank you. We accept Canara Bank's offer.", time: "Jan 17, 16:00", type: "user" },
                      { sender: "System", text: "Draft BG Generated and uploaded to Document Vault.", time: "Jan 20, 14:00", type: "system" },
                      { sender: "System", text: "Final BG Issued. BG No. w3456789 assigned.", time: "Jan 22, 09:00", type: "system" },
                    ].map((msg, i) => (
                      <div key={i} className={cn("flex", msg.type === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm", msg.type === "system" ? "bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 text-center w-full text-xs" : msg.type === "bank" ? "bg-navy-50 dark:bg-navy-800 text-gray-800 dark:text-gray-200" : "bg-navy-900 text-white")}>
                          {msg.type !== "system" && <p className="text-xs font-semibold mb-1 opacity-60">{msg.sender}</p>}
                          <p>{msg.text}</p>
                          <p className={cn("text-[10px] mt-1 opacity-50", msg.type === "user" ? "text-right" : "")}>{msg.time}</p>
                        </div>
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
