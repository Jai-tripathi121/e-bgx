"use client";
import { useState, useEffect, useRef } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import {
  Eye, CheckCircle2, FileText, CreditCard, MessageSquare,
  Download, Upload, Send, X, AlertTriangle, ExternalLink,
  FilePlus, Clock, CheckSquare, FileBadge2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  subscribeToIssuanceBGs, subscribeToBG, subscribeToMessages,
  subscribeToFDRequests, subscribeToDocuments,
  FirestoreBG, BGMessage, BGDocRecord, BGPaymentRequest,
  sendMessage, addDocumentRecord,
  createFDRequest, approveFDRequest, rejectFDRequest,
  uploadBGDraft, uploadFinalBG,
} from "@/lib/firestore";

const TABS = ["Overview", "Draft BG", "Messages", "Documents", "Payments", "History"] as const;
type Tab = (typeof TABS)[number];

const WORKFLOW_STEPS = [
  { key: "accepted",     label: "Offer Accepted" },
  { key: "fd_requested", label: "FD & Fees Requested" },
  { key: "fd_paid",      label: "Receipt Uploaded" },
  { key: "drafting",     label: "Draft BG Sent" },
  { key: "issued",       label: "Final BG Issued" },
];

function getStepStatus(bg: FirestoreBG, key: string) {
  const map: Record<string, string[]> = {
    accepted:     ["FD_REQUESTED", "FD_PAID", "BG_DRAFTING", "ISSUED"],
    fd_requested: ["FD_PAID", "BG_DRAFTING", "ISSUED"],
    fd_paid:      ["BG_DRAFTING", "ISSUED"],
    drafting:     ["ISSUED"],
    issued:       ["ISSUED"],
  };
  return map[key]?.includes(bg.status) ? "complete" : "pending";
}

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

export default function BankIssuancePage() {
  const { profile } = useAuth();
  const [bgs, setBgs]               = useState<FirestoreBG[]>([]);
  const [loadingBGs, setLoadingBGs] = useState(true);
  const [selectedBG, setSelectedBG] = useState<FirestoreBG | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>("Overview");

  // Messages
  const [messages, setMessages]     = useState<BGMessage[]>([]);
  const [msgText, setMsgText]       = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Documents
  const [docs, setDocs]             = useState<BGDocRecord[]>([]);
  const [docFile, setDocFile]       = useState<File | null>(null);
  const [docNote, setDocNote]       = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  // Draft BG
  const [draftFile, setDraftFile]   = useState<File | null>(null);
  const [uploadingDraft, setUploadingDraft] = useState(false);
  const draftFileRef = useRef<HTMLInputElement>(null);

  // Final BG
  const [finalFile, setFinalFile]   = useState<File | null>(null);
  const [finalBGNumber, setFinalBGNumber] = useState("");
  const [uploadingFinal, setUploadingFinal] = useState(false);
  const finalFileRef = useRef<HTMLInputElement>(null);

  // FD Payment Requests
  const [payRequests, setPayRequests] = useState<BGPaymentRequest[]>([]);
  const [showFDModal, setShowFDModal] = useState(false);
  const [fdForm, setFdForm]           = useState({ description: "", amount: "", payment_link: "" });
  const [submittingFD, setSubmittingFD] = useState(false);
  const [approvingId, setApprovingId]  = useState<string | null>(null);

  // ── Real-time: BG list ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.uid) return;
    setLoadingBGs(true);
    const unsub = subscribeToIssuanceBGs(profile.uid, (data) => {
      setBgs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoadingBGs(false);
    });
    return unsub;
  }, [profile?.uid]);

  // ── Real-time: selected BG status ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedBG?.id) return;
    const unsub = subscribeToBG(selectedBG.id, (bg) => {
      if (bg) setSelectedBG(bg);
    });
    return unsub;
  }, [selectedBG?.id]);

  // ── Real-time: messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBG?.id || activeTab !== "Messages") return;
    const unsub = subscribeToMessages(selectedBG.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [selectedBG?.id, activeTab]);

  // ── Real-time: documents ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBG?.id || (activeTab !== "Documents" && activeTab !== "Draft BG")) return;
    const unsub = subscribeToDocuments(selectedBG.id, setDocs);
    return unsub;
  }, [selectedBG?.id, activeTab]);

  // ── Real-time: FD requests ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBG?.id || activeTab !== "Payments") return;
    const unsub = subscribeToFDRequests(selectedBG.id, setPayRequests);
    return unsub;
  }, [selectedBG?.id, activeTab]);

  const handleSelectBG = (bg: FirestoreBG) => {
    setSelectedBG(bg);
    setActiveTab("Overview");
    setMessages([]); setDocs([]); setPayRequests([]);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMsg = async () => {
    if (!msgText.trim() || !selectedBG || !profile) return;
    setSendingMsg(true);
    try {
      await sendMessage(selectedBG.id, profile.uid, profile.displayName || "Bank", "bank", msgText.trim());
      setMsgText("");
    } catch { toast.error("Failed to send message."); }
    finally { setSendingMsg(false); }
  };

  // ── Upload general document ───────────────────────────────────────────────
  const handleUploadDoc = async () => {
    if (!docFile || !docNote.trim()) { toast.error("File and note are both required."); return; }
    if (!selectedBG || !profile) return;
    setUploadingDoc(true);
    try {
      const path = `bg_docs/${selectedBG.id}/${Date.now()}_${docFile.name}`;
      const url  = await uploadFile(docFile, path);
      await addDocumentRecord({
        bg_doc_id: selectedBG.id,
        uploader_id: profile.uid,
        uploader_name: profile.displayName || "Bank",
        uploader_role: "bank",
        file_name: docFile.name,
        file_url: url,
        file_size: docFile.size,
        note: docNote.trim(),
        uploaded_at: new Date().toISOString(),
        doc_type: "GENERAL",
      });
      toast.success("Document uploaded.");
      setDocFile(null); setDocNote("");
      if (docFileRef.current) docFileRef.current.value = "";
    } catch (err: any) { toast.error(err.message || "Upload failed."); }
    finally { setUploadingDoc(false); }
  };

  // ── Upload Draft BG ───────────────────────────────────────────────────────
  const handleUploadDraft = async () => {
    if (!draftFile) { toast.error("Select a draft BG file."); return; }
    if (!selectedBG || !profile) return;
    setUploadingDraft(true);
    try {
      const path = `bg_docs/${selectedBG.id}/draft_${Date.now()}_${draftFile.name}`;
      const url  = await uploadFile(draftFile, path);
      await uploadBGDraft(selectedBG.id, profile.uid, profile.displayName || "Bank", url, draftFile.name);
      toast.success("Draft BG uploaded. Applicant will now review and approve.");
      setDraftFile(null);
      if (draftFileRef.current) draftFileRef.current.value = "";
    } catch (err: any) { toast.error(err.message || "Upload failed."); }
    finally { setUploadingDraft(false); }
  };

  // ── Upload Final BG → ISSUED ──────────────────────────────────────────────
  const handleUploadFinal = async () => {
    if (!finalFile) { toast.error("Select the final BG file."); return; }
    if (!finalBGNumber.trim()) { toast.error("Enter the official BG number."); return; }
    if (!selectedBG || !profile) return;
    setUploadingFinal(true);
    try {
      const path = `bg_docs/${selectedBG.id}/final_${Date.now()}_${finalFile.name}`;
      const url  = await uploadFile(finalFile, path);
      await uploadFinalBG(selectedBG.id, profile.uid, profile.displayName || "Bank", url, finalFile.name, finalBGNumber.trim());
      toast.success("Final BG issued successfully! 🎉");
      setFinalFile(null); setFinalBGNumber("");
      if (finalFileRef.current) finalFileRef.current.value = "";
    } catch (err: any) { toast.error(err.message || "Failed to issue BG."); }
    finally { setUploadingFinal(false); }
  };

  // ── Create FD request ─────────────────────────────────────────────────────
  const handleSubmitFDRequest = async () => {
    if (!fdForm.description.trim() || !fdForm.amount || !fdForm.payment_link.trim()) {
      toast.error("All fields are required."); return;
    }
    if (!selectedBG || !profile) return;
    setSubmittingFD(true);
    try {
      await createFDRequest({
        bg_doc_id: selectedBG.id,
        bank_id: profile.uid,
        bank_name: profile.displayName || "Bank",
        applicant_id: selectedBG.applicant_id,
        description: fdForm.description,
        amount: Number(fdForm.amount),
        payment_link: fdForm.payment_link,
      });
      toast.success("Payment request sent to applicant.");
      setShowFDModal(false);
      setFdForm({ description: "", amount: "", payment_link: "" });
    } catch (err: any) { toast.error(err.message || "Failed to create request."); }
    finally { setSubmittingFD(false); }
  };

  // ── Approve / Reject receipt ──────────────────────────────────────────────
  const handleApproveReceipt = async (req: BGPaymentRequest) => {
    if (!selectedBG || !profile) return;
    setApprovingId(req.id);
    try {
      await approveFDRequest(req.id, selectedBG.id, profile.displayName || "Bank");
      toast.success("Receipt approved. BG moved to Drafting phase.");
    } catch (err: any) { toast.error(err.message || "Approval failed."); }
    finally { setApprovingId(null); }
  };

  const handleRejectReceipt = async (req: BGPaymentRequest) => {
    if (!selectedBG || !profile) return;
    setApprovingId(req.id);
    try {
      await rejectFDRequest(req.id, selectedBG.id, profile.displayName || "Bank");
      toast.success("Receipt rejected. Applicant will re-upload.");
    } catch (err: any) { toast.error(err.message || "Failed."); }
    finally { setApprovingId(null); }
  };

  // ── Draft BG state helpers ────────────────────────────────────────────────
  const draftBGApproved = (selectedBG as any)?.draft_bg_approved === true;
  const draftBGDoc      = docs.find((d) => d.doc_type === "DRAFT_BG");
  const finalBGDoc      = docs.find((d) => d.doc_type === "FINAL_BG");

  return (
    <>
      <PortalHeader title="BG Issuance Desk" subtitle="Manage the full post-acceptance issuance workflow" />

      {/* ── FD Request Modal ── */}
      {showFDModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Request FD & Fees</h2>
              <button onClick={() => setShowFDModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="e.g. FD Margin (25%) + Commission (1.5%)"
                  value={fdForm.description}
                  onChange={(e) => setFdForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1"
                  className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="e.g. 250000"
                  value={fdForm.amount}
                  onChange={(e) => setFdForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Link <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="UPI ID / NEFT details / payment gateway link"
                  value={fdForm.payment_link}
                  onChange={(e) => setFdForm((f) => ({ ...f, payment_link: e.target.value }))}
                />
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Applicant will see this request in their Issuance Desk and must upload payment proof.
              </div>
              <Button className="w-full" onClick={handleSubmitFDRequest} loading={submittingFD} icon={<Send size={14} />}>
                Send Payment Request
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="portal-content space-y-6">
        {!selectedBG ? (
          /* ── BG List ── */
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Applicant</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {loadingBGs ? (
                <TableEmpty message="Loading issuance queue…" />
              ) : bgs.length === 0 ? (
                <TableEmpty message="No accepted BGs in pipeline yet" />
              ) : (
                bgs.map((bg) => (
                  <TableRow key={bg.id}>
                    <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                    <TableCell>
                      <p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p>
                      {bg.official_bg_number && <p className="text-xs text-gray-400">{bg.official_bg_number}</p>}
                    </TableCell>
                    <TableCell>{bg.applicant_name}</TableCell>
                    <TableCell>{bg.beneficiary_name}</TableCell>
                    <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                    <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                    <TableCell>
                      <Button size="xs" icon={<Eye size={12} />} onClick={() => handleSelectBG(bg)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          /* ── Detail View ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedBG(null)} className="text-sm text-navy-600 dark:text-navy-300 hover:underline">← Back</button>
                <span className="font-mono font-semibold text-sm text-gray-700 dark:text-gray-200">#{selectedBG.bg_id}</span>
                <BGStatusBadge status={selectedBG.status} />
                {selectedBG.official_bg_number && (
                  <span className="text-xs text-gray-400 font-mono">· {selectedBG.official_bg_number}</span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-xl overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab
                      ? "bg-white dark:bg-navy-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  {tab === "Draft BG"  && <FileBadge2 size={13} />}
                  {tab === "Messages"  && <MessageSquare size={13} />}
                  {tab === "Documents" && <FileText size={13} />}
                  {tab === "Payments"  && <CreditCard size={13} />}
                  {tab === "History"   && <Clock size={13} />}
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
                          ["Applicant", selectedBG.applicant_name],
                          ["Beneficiary", selectedBG.beneficiary_name],
                          ["Amount", formatINR(selectedBG.amount_inr)],
                          ["BG Type", selectedBG.bg_type],
                          ["Validity", `${selectedBG.validity_months} Months`],
                          ["Tender No.", selectedBG.tender_number],
                          ["PAN", selectedBG.applicant_pan],
                          ["GSTIN", selectedBG.applicant_gstin ?? "—"],
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
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {!["FD_REQUESTED", "FD_PAID", "BG_DRAFTING", "ISSUED"].includes(selectedBG.status) && (
                        <Button className="w-full justify-start" variant="outline" icon={<CreditCard size={14} />} onClick={() => setShowFDModal(true)}>
                          Request FD & Fees from Applicant
                        </Button>
                      )}
                      {selectedBG.status === "BG_DRAFTING" && (
                        <Button className="w-full justify-start" variant="outline" icon={<FileBadge2 size={14} />} onClick={() => setActiveTab("Draft BG")}>
                          Manage Draft BG
                        </Button>
                      )}
                      <Button className="w-full justify-start" variant="ghost" icon={<MessageSquare size={14} />} onClick={() => setActiveTab("Messages")}>
                        Message Applicant
                      </Button>
                      <Button className="w-full justify-start" variant="ghost" icon={<FilePlus size={14} />} onClick={() => setActiveTab("Documents")}>
                        Upload Document
                      </Button>
                      {!["FD_REQUESTED", "FD_PAID", "BG_DRAFTING", "ISSUED"].includes(selectedBG.status) && (
                        <Button className="w-full justify-start" variant="outline" icon={<CreditCard size={14} />} onClick={() => setShowFDModal(true)}>
                          New Payment Request
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Workflow progress */}
                <Card>
                  <CardHeader><CardTitle>Workflow Progress</CardTitle></CardHeader>
                  <CardContent>
                    {WORKFLOW_STEPS.map((ws, i) => {
                      const done = getStepStatus(selectedBG, ws.key) === "complete";
                      return (
                        <div key={ws.key} className={cn("flex gap-3 pb-4 relative", i < WORKFLOW_STEPS.length - 1 ? "before:absolute before:left-3 before:top-7 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-navy-800" : "")}>
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 mt-0.5", done ? "bg-green-500" : "bg-gray-100 dark:bg-navy-800 border-2 border-gray-200 dark:border-navy-700")}>
                            {done ? <CheckCircle2 size={12} className="text-white" /> : <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>}
                          </div>
                          <p className={cn("text-sm font-medium pt-0.5", done ? "text-gray-900 dark:text-white" : "text-gray-400")}>{ws.label}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── DRAFT BG ── */}
            {activeTab === "Draft BG" && (
              <div className="space-y-4">
                {selectedBG.status === "ISSUED" ? (
                  /* Already issued — show final BG */
                  <Card>
                    <CardContent className="pt-5">
                      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-700 dark:text-green-400">Bank Guarantee Issued</p>
                          <p className="text-xs text-green-600 mt-0.5">BG No: {selectedBG.official_bg_number ?? "—"} · Issued {formatDate(selectedBG.issued_at ?? "", "relative")}</p>
                        </div>
                        {finalBGDoc && (
                          <a href={finalBGDoc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="xs" variant="outline" icon={<Download size={12} />}>Download Final BG</Button>
                          </a>
                        )}
                      </div>
                      {draftBGDoc && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-navy-800 rounded-xl">
                          <FileText size={14} className="text-gray-400 shrink-0" />
                          <p className="text-xs text-gray-500 flex-1">Draft BG on file: {draftBGDoc.file_name}</p>
                          <a href={draftBGDoc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="xs" variant="ghost" icon={<Download size={11} />}>Download</Button>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : selectedBG.status !== "BG_DRAFTING" ? (
                  /* Not in drafting phase yet */
                  <Card>
                    <CardContent className="pt-5">
                      <div className="py-10 text-center">
                        <FileBadge2 size={32} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Draft BG not available yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Complete payment approval first. Current status: <span className="font-semibold">{selectedBG.status}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* BG_DRAFTING — main workflow */
                  <>
                    {/* Step 1: Upload Draft BG */}
                    <Card className={cn(draftBGApproved ? "opacity-60" : "")}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", draftBGApproved ? "bg-green-500 text-white" : "bg-navy-900 text-white")}>
                            {draftBGApproved ? "✓" : "1"}
                          </span>
                          Upload Draft BG for Applicant Review
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {draftBGDoc ? (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <FileText size={16} className="text-blue-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">{draftBGDoc.file_name}</p>
                              <p className="text-xs text-blue-500">Uploaded {formatDate(draftBGDoc.uploaded_at, "relative")}</p>
                            </div>
                            <a href={draftBGDoc.file_url} target="_blank" rel="noopener noreferrer">
                              <Button size="xs" variant="outline" icon={<Download size={12} />}>View</Button>
                            </a>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500">Upload the draft BG PDF. The applicant will review and approve or reject it.</p>
                            <div>
                              <input
                                ref={draftFileRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                                className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                              />
                              {draftFile && <p className="text-xs text-gray-400 mt-1">{draftFile.name} · {(draftFile.size / 1024).toFixed(0)} KB</p>}
                            </div>
                            <Button icon={<Upload size={14} />} onClick={handleUploadDraft} loading={uploadingDraft} disabled={!draftFile}>
                              Upload Draft BG
                            </Button>
                          </>
                        )}
                        {draftBGApproved && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Applicant has approved the draft BG ✓</p>
                          </div>
                        )}
                        {draftBGDoc && !draftBGApproved && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <Clock size={16} className="text-amber-600" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">Waiting for applicant to approve draft…</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Step 2: Upload Final BG (only when draft approved) */}
                    <Card className={cn(!draftBGApproved ? "opacity-40 pointer-events-none" : "")}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                          Issue Final Bank Guarantee
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!draftBGApproved && (
                          <p className="text-xs text-gray-400">Waiting for applicant to approve the draft BG first.</p>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Official BG Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                            placeholder="e.g. BG/2026/03/00123"
                            value={finalBGNumber}
                            onChange={(e) => setFinalBGNumber(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Final BG Document <span className="text-red-500">*</span>
                            <span className="text-xs font-normal text-gray-400 ml-1">(PDF)</span>
                          </label>
                          <input
                            ref={finalFileRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFinalFile(e.target.files?.[0] || null)}
                            className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-700 file:text-white hover:file:bg-green-600 cursor-pointer"
                          />
                          {finalFile && <p className="text-xs text-gray-400 mt-1">{finalFile.name} · {(finalFile.size / 1024).toFixed(0)} KB</p>}
                        </div>
                        <Button
                          variant="success"
                          icon={<CheckSquare size={14} />}
                          onClick={handleUploadFinal}
                          loading={uploadingFinal}
                          disabled={!finalFile || !finalBGNumber.trim() || !draftBGApproved}
                        >
                          Issue Final BG & Mark ISSUED
                        </Button>
                        <p className="text-xs text-gray-400">This will upload the final BG, record the official BG number, and mark the guarantee as ISSUED.</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* ── MESSAGES ── */}
            {activeTab === "Messages" && (
              <Card>
                <CardHeader><CardTitle>BG Issuance Messages</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72 overflow-y-auto space-y-3 mb-4 pr-1">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">No messages yet.</div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === profile?.uid;
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
                        placeholder="e.g. KYC copy, Board resolution, Counter-guarantee…"
                        value={docNote}
                        onChange={(e) => setDocNote(e.target.value)}
                      />
                    </div>
                    <div>
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
                              <FileText size={16} className={cn("mt-0.5 shrink-0", d.doc_type === "DRAFT_BG" ? "text-amber-500" : d.doc_type === "FINAL_BG" ? "text-green-600" : "text-navy-400")} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{d.file_name}</p>
                                  {d.doc_type === "DRAFT_BG" && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">DRAFT</span>}
                                  {d.doc_type === "FINAL_BG" && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded font-semibold">FINAL</span>}
                                </div>
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
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">FD & Fee Payment Requests</h3>
                  {!["BG_DRAFTING", "ISSUED"].includes(selectedBG.status) && (
                    <Button size="sm" icon={<CreditCard size={13} />} onClick={() => setShowFDModal(true)}>New Request</Button>
                  )}
                </div>

                {payRequests.length === 0 ? (
                  <Card>
                    <CardContent>
                      <div className="py-10 text-center">
                        <CreditCard size={28} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No payment requests yet.</p>
                        <Button className="mt-4" size="sm" variant="outline" icon={<CreditCard size={13} />} onClick={() => setShowFDModal(true)}>
                          Request FD & Fees
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  payRequests.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="pt-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{req.description}</p>
                            <p className="text-xl font-bold text-navy-700 dark:text-navy-200 mt-0.5">{formatINR(req.amount)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Requested {formatDate(req.created_at, "relative")}</p>
                          </div>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", PAY_STATUS_COLORS[req.status])}>
                            {req.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-navy-800 rounded-xl">
                          <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Payment Link / Details</p>
                          <p className="text-sm text-gray-700 dark:text-gray-200 break-all">{req.payment_link}</p>
                        </div>

                        {req.status === "RECEIPT_UPLOADED" && (
                          <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                              <Upload size={14} /> Payment Receipt Uploaded by Applicant
                            </p>
                            {req.receipt_note && (
                              <p className="text-xs text-gray-500 bg-gray-50 dark:bg-navy-800 rounded-lg p-2">"{req.receipt_note}"</p>
                            )}
                            <div className="flex gap-2 flex-wrap">
                              <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button variant="outline" size="sm" className="w-full" icon={<ExternalLink size={13} />}>View Receipt</Button>
                              </a>
                              <Button variant="success" size="sm" className="flex-1" icon={<CheckCircle2 size={13} />} loading={approvingId === req.id} onClick={() => handleApproveReceipt(req)}>Approve</Button>
                              <Button variant="danger" size="sm" className="flex-1" loading={approvingId === req.id} onClick={() => handleRejectReceipt(req)}>Reject</Button>
                            </div>
                          </div>
                        )}

                        {req.status === "APPROVED" && (
                          <div className="flex items-center justify-between gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-green-600" />
                              <p className="text-sm text-green-700 dark:text-green-400 font-medium">Approved — Payment confirmed.</p>
                            </div>
                            {req.receipt_url && (
                              <a href={req.receipt_url} target="_blank" rel="noopener noreferrer">
                                <Button size="xs" variant="outline" icon={<Download size={12} />}>Receipt</Button>
                              </a>
                            )}
                          </div>
                        )}

                        {req.status === "REJECTED" && (
                          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <AlertTriangle size={16} className="text-red-600" />
                            <p className="text-sm text-red-700 dark:text-red-400">Receipt rejected. Waiting for applicant to re-upload.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {activeTab === "History" && (
              <Card>
                <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
                <CardContent>
                  {(selectedBG.audit_trail ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">No audit events yet.</p>
                  ) : (
                    (selectedBG.audit_trail as any[]).slice().reverse().map((ev: any, i: number) => (
                      <div key={ev.event_id ?? i} className="flex gap-4 pb-3 mb-3 border-b border-gray-50 dark:border-navy-800 last:border-0 last:mb-0 last:pb-0">
                        <div className="w-6 h-6 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={11} className="text-navy-600 dark:text-navy-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.description}</p>
                            <p className="text-xs text-gray-400 shrink-0">{formatDate(ev.timestamp, "relative")}</p>
                          </div>
                          <p className="text-xs text-gray-400">By {ev.actor}</p>
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
