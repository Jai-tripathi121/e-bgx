"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import {
  Eye, Download, MessageSquare, FileText, CreditCard,
  CheckCircle2, Send, Upload, ExternalLink, AlertTriangle,
  Clock, Inbox, Building2, History, FilePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  getApplicantBGs, FirestoreBG,
  sendMessage, getMessages, BGMessage,
  addDocumentRecord, getDocumentRecords, BGDocRecord,
  getFDRequests, uploadFDReceipt, BGPaymentRequest,
  ensureProcessingFeePayment, getProcessingFeePayment,
  uploadProcessingFeeReceipt, ProcessingFeePayment,
} from "@/lib/firestore";

const TABS = ["Overview", "Messages", "Documents", "Payments", "History"] as const;
type Tab = (typeof TABS)[number];

async function uploadFile(file: File, path: string): Promise<string> {
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, file);
  return getDownloadURL(sRef);
}

const PAY_STATUS_COLORS: Record<string, string> = {
  PENDING:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECEIPT_UPLOADED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const WORKFLOW_STEPS = [
  { key: "applied",     label: "Applied" },
  { key: "offer",       label: "Offer Accepted" },
  { key: "fd",          label: "FD & Fees Paid" },
  { key: "drafting",    label: "BG Drafting" },
  { key: "issued",      label: "BG Issued" },
];

function getStepStatus(bg: FirestoreBG, key: string) {
  const map: Record<string, string[]> = {
    applied:  ["PROCESSING", "OFFER_ACCEPTED", "FD_REQUESTED", "FD_PAID", "BG_DRAFTING", "ISSUED"],
    offer:    ["OFFER_ACCEPTED", "FD_REQUESTED", "FD_PAID", "BG_DRAFTING", "ISSUED"],
    fd:       ["BG_DRAFTING", "ISSUED"],
    drafting: ["ISSUED"],
    issued:   ["ISSUED"],
  };
  return map[key]?.includes(bg.status) ? "complete" : "pending";
}

export default function ApplicantIssuancePage() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedBG, setSelectedBG]   = useState<FirestoreBG | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>("Overview");

  // Messages
  const [messages, setMessages]   = useState<BGMessage[]>([]);
  const [msgText, setMsgText]     = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Documents
  const [docs, setDocs]         = useState<BGDocRecord[]>([]);
  const [docFile, setDocFile]   = useState<File | null>(null);
  const [docNote, setDocNote]   = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  // FD payment requests from bank
  const [fdRequests, setFdRequests] = useState<BGPaymentRequest[]>([]);
  const [receiptFile, setReceiptFile] = useState<{ [reqId: string]: File }>({});
  const [receiptNote, setReceiptNote] = useState<{ [reqId: string]: string }>({});
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  // Processing fee (e-BGX)
  const [procFee, setProcFee] = useState<ProcessingFeePayment | null>(null);
  const [pfReceiptFile, setPfReceiptFile] = useState<File | null>(null);
  const [pfReceiptNote, setPfReceiptNote] = useState("");
  const [uploadingPF, setUploadingPF] = useState(false);
  const pfFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getApplicantBGs(user.uid)
      .then((bgs) => {
        setApplications(bgs);
        // Auto-select BG if ?bg=<bg_id> query param is present (deep link from dashboard)
        const bgParam = searchParams.get("bg");
        if (bgParam) {
          const match = bgs.find((b) => b.bg_id === bgParam || b.id === bgParam);
          if (match) {
            setSelectedBG(match);
            setActiveTab("Overview");
          }
        }
      })
      .catch(() => setApplications([]))
      .finally(() => setLoadingData(false));
  }, [user, searchParams]);

  const loadTabData = useCallback(async (tab: Tab, bg: FirestoreBG) => {
    if (tab === "Messages") {
      const msgs = await getMessages(bg.id);
      setMessages(msgs);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    if (tab === "Documents") {
      setDocs(await getDocumentRecords(bg.id));
    }
    if (tab === "Payments") {
      const [reqs, pf] = await Promise.all([
        getFDRequests(bg.id),
        ensureProcessingFeePayment(bg.id, user!.uid, profile?.displayName || "Applicant"),
      ]);
      setFdRequests(reqs);
      setProcFee(pf);
    }
  }, [user, profile?.displayName]);

  const handleSelectBG = (bg: FirestoreBG) => {
    setSelectedBG(bg);
    setActiveTab("Overview");
    setMessages([]); setDocs([]); setFdRequests([]); setProcFee(null);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (selectedBG) loadTabData(tab, selectedBG);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMsg = async () => {
    if (!msgText.trim() || !selectedBG || !user) return;
    setSendingMsg(true);
    try {
      await sendMessage(selectedBG.id, user.uid, profile?.displayName || "Applicant", "applicant", msgText.trim());
      setMsgText("");
      setMessages(await getMessages(selectedBG.id));
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { toast.error("Failed to send message."); }
    finally { setSendingMsg(false); }
  };

  // ── Upload document ───────────────────────────────────────────────────────
  const handleUploadDoc = async () => {
    if (!docFile || !docNote.trim()) { toast.error("File and note are both required."); return; }
    if (!selectedBG || !user) return;
    setUploadingDoc(true);
    try {
      const path = `bg_docs/${selectedBG.id}/${Date.now()}_${docFile.name}`;
      const url  = await uploadFile(docFile, path);
      await addDocumentRecord({
        bg_doc_id: selectedBG.id,
        uploader_id: user.uid,
        uploader_name: profile?.displayName || "Applicant",
        uploader_role: "applicant",
        file_name: docFile.name,
        file_url: url,
        file_size: docFile.size,
        note: docNote.trim(),
        uploaded_at: new Date().toISOString(),
      });
      toast.success("Document uploaded.");
      setDocFile(null); setDocNote("");
      if (docFileRef.current) docFileRef.current.value = "";
      setDocs(await getDocumentRecords(selectedBG.id));
    } catch (err: any) { toast.error(err.message || "Upload failed."); }
    finally { setUploadingDoc(false); }
  };

  // ── Upload FD receipt ─────────────────────────────────────────────────────
  const handleUploadFDReceipt = async (req: BGPaymentRequest) => {
    const file = receiptFile[req.id];
    const note = receiptNote[req.id] || "";
    if (!file) { toast.error("Please select a receipt file."); return; }
    if (!selectedBG || !user) return;
    setUploadingReceipt(req.id);
    try {
      const path = `receipts/${selectedBG.id}/fd_${req.id}_${Date.now()}_${file.name}`;
      const url  = await uploadFile(file, path);
      await uploadFDReceipt(req.id, selectedBG.id, user.uid, url, note);
      toast.success("Receipt uploaded. Awaiting bank approval.");
      setReceiptFile((p) => { const n = { ...p }; delete n[req.id]; return n; });
      setReceiptNote((p) => { const n = { ...p }; delete n[req.id]; return n; });
      setFdRequests(await getFDRequests(selectedBG.id));
    } catch (err: any) { toast.error(err.message || "Upload failed."); }
    finally { setUploadingReceipt(null); }
  };

  // ── Upload processing fee receipt ─────────────────────────────────────────
  const handleUploadPFReceipt = async () => {
    if (!pfReceiptFile) { toast.error("Please select a receipt file."); return; }
    if (!selectedBG || !user) return;
    setUploadingPF(true);
    try {
      const path = `receipts/${selectedBG.id}/pf_${Date.now()}_${pfReceiptFile.name}`;
      const url  = await uploadFile(pfReceiptFile, path);
      await uploadProcessingFeeReceipt(selectedBG.id, url, pfReceiptNote);
      toast.success("Processing fee receipt uploaded. Awaiting admin approval.");
      setPfReceiptFile(null); setPfReceiptNote("");
      if (pfFileRef.current) pfFileRef.current.value = "";
      setProcFee(await getProcessingFeePayment(selectedBG.id));
    } catch (err: any) { toast.error(err.message || "Upload failed."); }
    finally { setUploadingPF(false); }
  };

  if (loadingData) {
    return (
      <>
        <PortalHeader title="Active BGs" subtitle="Track all BG applications in the issuance pipeline" />
        <div className="portal-content flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="Active BGs" subtitle="Track all BG applications in the issuance pipeline" />
      <div className="portal-content space-y-6">
        {!selectedBG ? (
          applications.length === 0 ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                    <Inbox size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Active BGs</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    BG applications in the issuance pipeline will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                {applications.map((bg) => (
                  <TableRow key={bg.id}>
                    <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                    <TableCell>
                      <p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                      {bg.official_bg_number && <p className="text-xs text-gray-400">{bg.official_bg_number}</p>}
                    </TableCell>
                    <TableCell>{bg.beneficiary_name}</TableCell>
                    <TableCell>{bg.accepted_bank_name || <span className="text-gray-400 text-xs">—</span>}</TableCell>
                    <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                    <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                    <TableCell>
                      <Button size="xs" variant="outline" icon={<Eye size={12} />} onClick={() => handleSelectBG(bg)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
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
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab
                      ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  {tab === "Overview"  && <Eye size={13} />}
                  {tab === "Messages"  && <MessageSquare size={13} />}
                  {tab === "Documents" && <FileText size={13} />}
                  {tab === "Payments"  && <CreditCard size={13} />}
                  {tab === "History"   && <History size={13} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
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
                          ["Issuing Bank",   selectedBG.accepted_bank_name || "—"],
                          ["Official BG No.",selectedBG.official_bg_number || "—"],
                          ["Issued At",      selectedBG.issued_at ? formatDate(selectedBG.issued_at) : "—"],
                        ].map(([k, v]) => (
                          <div key={k} className="border-b border-gray-50 dark:border-navy-800 pb-2.5">
                            <p className="text-xs text-gray-400">{k}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{v}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {selectedBG.status === "FD_REQUESTED" && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex gap-3">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Action Required: FD & Fees Payment</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Your bank has requested FD margin and fees. Go to the Payments tab to view details and upload your payment receipt.</p>
                        <Button size="xs" className="mt-2" variant="outline" onClick={() => handleTabChange("Payments")}>Go to Payments →</Button>
                      </div>
                    </div>
                  )}
                </div>

                <Card>
                  <CardHeader><CardTitle>Issuance Progress</CardTitle></CardHeader>
                  <CardContent>
                    {WORKFLOW_STEPS.map((ws, i) => {
                      const done = getStepStatus(selectedBG, ws.key) === "complete";
                      return (
                        <div key={ws.key} className={cn("flex gap-3 pb-4 relative", i < WORKFLOW_STEPS.length - 1 ? "before:absolute before:left-3 before:top-7 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-navy-800" : "")}>
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 mt-0.5", done ? "bg-green-500" : "bg-gray-100 dark:bg-navy-800 border-2 border-gray-200 dark:border-navy-700")}>
                            {done ? <CheckCircle2 size={12} className="text-white" /> : <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>}
                          </div>
                          <p className={cn("text-sm font-medium pt-0.5", done ? "text-green-600 dark:text-green-400" : "text-gray-400")}>{ws.label}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── MESSAGES ── */}
            {activeTab === "Messages" && (
              <Card>
                <CardHeader><CardTitle>BG Issuance Messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72 overflow-y-auto space-y-3 mb-4 pr-1">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">No messages yet. Start the conversation.</div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === user?.uid;
                        return (
                          <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm", isMe ? "bg-navy-900 dark:bg-navy-700 text-white rounded-br-sm" : "bg-gray-100 dark:bg-navy-800 text-gray-800 dark:text-gray-200 rounded-bl-sm")}>
                              {!isMe && <p className="text-[10px] font-semibold mb-1 opacity-60 capitalize">{msg.sender_role} · {msg.sender_name}</p>}
                              <p>{msg.message}</p>
                              <p className={cn("text-[10px] mt-1 opacity-50", isMe ? "text-right" : "")}>{formatDate(msg.created_at, "relative")}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={msgEndRef} />
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 dark:border-navy-800 pt-4">
                    <input
                      placeholder="Type a message…"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSendMsg(); }}
                      className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500 text-gray-900 dark:text-white"
                    />
                    <Button size="sm" icon={<Send size={13} />} onClick={handleSendMsg} loading={sendingMsg} disabled={!msgText.trim()}>Send</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── DOCUMENTS ── */}
            {activeTab === "Documents" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Document Note <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-400 ml-1">(describe what you are uploading)</span>
                      </label>
                      <input
                        className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                        placeholder="e.g. Audited financials, Company PAN card, Tender document…"
                        value={docNote}
                        onChange={(e) => setDocNote(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select File <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-400 ml-1">(PDF, JPG, PNG — max 20 MB)</span>
                      </label>
                      <input
                        ref={docFileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                        className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {docFile && <p className="text-xs text-gray-400 mt-1">{docFile.name} · {(docFile.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <Button icon={<Upload size={14} />} onClick={handleUploadDoc} loading={uploadingDoc} disabled={!docFile || !docNote.trim()}>
                      Upload Document
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Document Vault</CardTitle></CardHeader>
                  <CardContent>
                    {docs.length === 0 ? (
                      <p className="text-sm text-gray-400 py-6 text-center">No documents uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map((d) => (
                          <div key={d.id} className="flex items-start justify-between p-3 rounded-xl border border-gray-100 dark:border-navy-800">
                            <div className="flex items-start gap-3">
                              <FileText size={16} className="text-navy-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{d.file_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{d.note}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{d.uploader_role} · {formatDate(d.uploaded_at, "relative")}</p>
                              </div>
                            </div>
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                              <Button size="xs" variant="outline" icon={<Download size={12} />}>Download</Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── PAYMENTS ── */}
            {activeTab === "Payments" && (
              <div className="space-y-4">

                {/* Processing Fee (e-BGX) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 size={15} className="text-navy-500" />
                      e-BGX Platform Processing Fee
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!procFee ? (
                      <div className="py-6 text-center text-gray-400 text-sm">
                        No processing fee configured. Contact e-BGX admin.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Platform Processing Fee</p>
                            <p className="text-2xl font-bold text-navy-700 dark:text-navy-200 mt-0.5">{formatINR(procFee.amount)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Pay to e-BGX before BG can be issued</p>
                          </div>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", PAY_STATUS_COLORS[procFee.status])}>
                            {procFee.status.replace("_", " ")}
                          </span>
                        </div>

                        {procFee.payment_link && procFee.status === "PENDING" && (
                          <a href={procFee.payment_link} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full" icon={<ExternalLink size={14} />}>
                              Pay Processing Fee Online
                            </Button>
                          </a>
                        )}

                        {procFee.status === "PENDING" || procFee.status === "RECEIPT_UPLOADED" ? (
                          procFee.status !== "RECEIPT_UPLOADED" ? (
                            <div className="space-y-3 border-t border-gray-100 dark:border-navy-800 pt-4">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload Payment Receipt</p>
                              <p className="text-xs text-gray-400">Transfer to e-BGX account / UPI and upload the confirmation screenshot or bank receipt.</p>
                              <input
                                type="text"
                                placeholder="Note (e.g. NEFT from SBI, UTR: 123456789)"
                                className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                                value={pfReceiptNote}
                                onChange={(e) => setPfReceiptNote(e.target.value)}
                              />
                              <input
                                ref={pfFileRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setPfReceiptFile(e.target.files?.[0] || null)}
                                className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                              />
                              <Button icon={<Upload size={14} />} onClick={handleUploadPFReceipt} loading={uploadingPF} disabled={!pfReceiptFile}>
                                Upload Processing Fee Receipt
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                              <Clock size={16} className="text-blue-600" />
                              <p className="text-sm text-blue-700 dark:text-blue-400">Receipt submitted. Awaiting admin approval.</p>
                            </div>
                          )
                        ) : procFee.status === "APPROVED" ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Processing fee approved by e-BGX.</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* FD & Bank Fee Requests */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CreditCard size={15} className="text-navy-500" />
                    Bank FD & Fee Requests
                  </h3>
                  {fdRequests.length === 0 ? (
                    <Card>
                      <CardContent>
                        <div className="py-8 text-center text-gray-400 text-sm">
                          <CreditCard size={24} className="mx-auto mb-2 text-gray-300" />
                          No FD/fee requests from bank yet. The bank will send a payment request once your offer is accepted.
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    fdRequests.map((req) => (
                      <Card key={req.id} className="mb-3">
                        <CardContent className="pt-5 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{req.description}</p>
                              <p className="text-xl font-bold text-navy-700 dark:text-navy-200 mt-0.5">{formatINR(req.amount)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">From {req.bank_name} · {formatDate(req.created_at, "relative")}</p>
                            </div>
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", PAY_STATUS_COLORS[req.status])}>
                              {req.status.replace("_", " ")}
                            </span>
                          </div>

                          {/* Payment link */}
                          <div className="p-3 bg-gray-50 dark:bg-navy-800 rounded-xl">
                            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Payment Link / Details</p>
                            <p className="text-sm text-gray-700 dark:text-gray-200 break-all">{req.payment_link}</p>
                            {req.payment_link.startsWith("http") && (
                              <a href={req.payment_link} target="_blank" rel="noopener noreferrer">
                                <Button size="xs" variant="outline" className="mt-2" icon={<ExternalLink size={12} />}>Pay Now</Button>
                              </a>
                            )}
                          </div>

                          {/* Upload receipt */}
                          {req.status === "PENDING" && (
                            <div className="space-y-3 border-t border-gray-100 dark:border-navy-800 pt-4">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload Payment Receipt</p>
                              <input
                                type="text"
                                placeholder="Note (e.g. NEFT from HDFC, UTR: 987654321)"
                                className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                                value={receiptNote[req.id] || ""}
                                onChange={(e) => setReceiptNote((p) => ({ ...p, [req.id]: e.target.value }))}
                              />
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) setReceiptFile((p) => ({ ...p, [req.id]: f }));
                                }}
                                className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                              />
                              <Button
                                icon={<Upload size={14} />}
                                onClick={() => handleUploadFDReceipt(req)}
                                loading={uploadingReceipt === req.id}
                                disabled={!receiptFile[req.id]}
                              >
                                Upload Receipt
                              </Button>
                            </div>
                          )}

                          {req.status === "RECEIPT_UPLOADED" && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                              <Clock size={16} className="text-blue-600" />
                              <p className="text-sm text-blue-700 dark:text-blue-400">Receipt submitted. Awaiting bank approval.</p>
                            </div>
                          )}

                          {req.status === "APPROVED" && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                              <CheckCircle2 size={16} className="text-green-600" />
                              <p className="text-sm text-green-700 dark:text-green-400 font-medium">Payment approved. Bank is drafting your BG.</p>
                            </div>
                          )}

                          {req.status === "REJECTED" && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                <AlertTriangle size={16} className="text-red-600" />
                                <p className="text-sm text-red-700 dark:text-red-400">Receipt rejected. Please re-upload.</p>
                              </div>
                              <div className="space-y-3 pt-2">
                                <input
                                  type="text"
                                  placeholder="Note (re-upload reason / UTR)"
                                  className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                                  value={receiptNote[req.id] || ""}
                                  onChange={(e) => setReceiptNote((p) => ({ ...p, [req.id]: e.target.value }))}
                                />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setReceiptFile((p) => ({ ...p, [req.id]: f }));
                                  }}
                                  className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                                />
                                <Button icon={<Upload size={14} />} onClick={() => handleUploadFDReceipt(req)} loading={uploadingReceipt === req.id} disabled={!receiptFile[req.id]}>
                                  Re-Upload Receipt
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORY ── */}
            {activeTab === "History" && (
              <Card>
                <CardHeader><CardTitle>Audit Trail & History</CardTitle></CardHeader>
                <CardContent>
                  {selectedBG.audit_trail.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No audit trail available.</div>
                  ) : (
                    (selectedBG.audit_trail as any[]).map((ev: any, i: number) => (
                      <div key={ev.event_id ?? i} className={cn("flex gap-4 pb-4", i < selectedBG.audit_trail.length - 1 ? "border-l-2 border-gray-100 dark:border-navy-800 ml-3.5" : "")}>
                        <div className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 -ml-3.5">
                          <Clock size={12} className="text-navy-600 dark:text-navy-300" />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.description}</p>
                            <p className="text-xs text-gray-400 shrink-0 ml-4">{formatDate(ev.timestamp, "relative")}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">By {ev.actor}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
