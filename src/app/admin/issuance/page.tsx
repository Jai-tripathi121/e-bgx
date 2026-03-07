"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import {
  Eye, MessageSquare, FileText, CreditCard, CheckCircle2,
  Send, Clock, Upload, ExternalLink, AlertTriangle, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import {
  getAllIssuanceBGs, FirestoreBG,
  sendMessage, getMessages, BGMessage,
  getDocumentRecords, BGDocRecord,
  addDocumentRecord,
  getProcessingFeePayment, approveProcessingFeePayment, ProcessingFeePayment,
} from "@/lib/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const TABS = ["Overview", "Messages", "Documents", "Processing Fee"] as const;
type Tab = (typeof TABS)[number];

const FEE_STATUS_COLORS: Record<string, string> = {
  PENDING:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECEIPT_UPLOADED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

async function uploadFile(file: File, path: string): Promise<string> {
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, file);
  return getDownloadURL(sRef);
}

export default function AdminIssuancePage() {
  const { profile } = useAuth();
  const [bgs, setBgs]           = useState<FirestoreBG[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedBG, setSelectedBG] = useState<FirestoreBG | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>("Overview");

  const [messages, setMessages]     = useState<BGMessage[]>([]);
  const [msgText, setMsgText]       = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const [docs, setDocs]           = useState<BGDocRecord[]>([]);
  const [docFile, setDocFile]     = useState<File | null>(null);
  const [docNote, setDocNote]     = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  const [procFee, setProcFee]       = useState<ProcessingFeePayment | null>(null);
  const [approvingFee, setApprovingFee] = useState(false);

  useEffect(() => {
    getAllIssuanceBGs()
      .then(setBgs)
      .finally(() => setLoading(false));
  }, []);

  const loadTabData = useCallback(async (tab: Tab, bg: FirestoreBG) => {
    if (tab === "Messages") {
      const msgs = await getMessages(bg.id);
      setMessages(msgs);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    if (tab === "Documents") {
      setDocs(await getDocumentRecords(bg.id));
    }
    if (tab === "Processing Fee") {
      setProcFee(await getProcessingFeePayment(bg.id));
    }
  }, []);

  const handleSelect = (bg: FirestoreBG) => {
    setSelectedBG(bg);
    setActiveTab("Overview");
    setMessages([]); setDocs([]); setProcFee(null);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (selectedBG) loadTabData(tab, selectedBG);
  };

  const handleSendMsg = async () => {
    if (!msgText.trim() || !selectedBG || !profile) return;
    setSendingMsg(true);
    try {
      await sendMessage(selectedBG.id, profile.uid, "e-BGX Admin", "admin", msgText.trim());
      setMsgText("");
      setMessages(await getMessages(selectedBG.id));
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { toast.error("Failed to send."); }
    finally { setSendingMsg(false); }
  };

  const handleUploadDoc = async () => {
    if (!docFile || !docNote.trim()) { toast.error("File and note required."); return; }
    if (!selectedBG || !profile) return;
    setUploadingDoc(true);
    try {
      const path = `bg_docs/${selectedBG.id}/${Date.now()}_${docFile.name}`;
      const url  = await uploadFile(docFile, path);
      await addDocumentRecord({
        bg_doc_id: selectedBG.id,
        uploader_id: profile.uid,
        uploader_name: "e-BGX Admin",
        uploader_role: "admin",
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

  const handleApproveFee = async () => {
    if (!selectedBG || !profile || !procFee) return;
    setApprovingFee(true);
    try {
      await approveProcessingFeePayment(selectedBG.id, profile.uid);
      toast.success("Processing fee approved.");
      setProcFee(await getProcessingFeePayment(selectedBG.id));
    } catch (err: any) { toast.error(err.message || "Approval failed."); }
    finally { setApprovingFee(false); }
  };

  return (
    <>
      <PortalHeader title="Issuance Monitor" subtitle="View, message, and approve processing fees for all active BGs" />
      <div className="portal-content space-y-6">
        {!selectedBG ? (
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Applicant</TableHeader>
                <TableHeader>Bank</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableEmpty message="Loading…" />
              ) : bgs.length === 0 ? (
                <TableEmpty message="No BGs in issuance pipeline" />
              ) : (
                bgs.map((bg) => (
                  <TableRow key={bg.id}>
                    <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                    <TableCell><p className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</p></TableCell>
                    <TableCell>{bg.applicant_name}</TableCell>
                    <TableCell>{bg.accepted_bank_name || "—"}</TableCell>
                    <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                    <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                    <TableCell>
                      <Button size="xs" icon={<Eye size={12} />} onClick={() => handleSelect(bg)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedBG(null)} className="text-sm text-navy-600 dark:text-navy-300 hover:underline">← Back</button>
              <span className="font-mono font-semibold text-sm text-gray-700 dark:text-gray-200">#{selectedBG.bg_id}</span>
              <BGStatusBadge status={selectedBG.status} />
            </div>

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
                  {tab === "Messages"        && <MessageSquare size={13} />}
                  {tab === "Documents"       && <FileText size={13} />}
                  {tab === "Processing Fee"  && <CreditCard size={13} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeTab === "Overview" && (
              <Card>
                <CardHeader><CardTitle>BG Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ["Applicant",    selectedBG.applicant_name],
                      ["Beneficiary",  selectedBG.beneficiary_name],
                      ["Amount",       formatINR(selectedBG.amount_inr)],
                      ["BG Type",      selectedBG.bg_type],
                      ["Validity",     `${selectedBG.validity_months} Months`],
                      ["Issuing Bank", selectedBG.accepted_bank_name || "—"],
                      ["PAN",          selectedBG.applicant_pan],
                      ["Tender No.",   selectedBG.tender_number],
                      ["Status",       selectedBG.status],
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

            {/* MESSAGES */}
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

            {/* DOCUMENTS */}
            {activeTab === "Documents" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Document Note <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                        placeholder="e.g. Admin verification letter, Compliance document…"
                        value={docNote}
                        onChange={(e) => setDocNote(e.target.value)}
                      />
                    </div>
                    <input
                      ref={docFileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.docx"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="block text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                    />
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

            {/* PROCESSING FEE */}
            {activeTab === "Processing Fee" && (
              <Card>
                <CardHeader><CardTitle>e-BGX Processing Fee Status</CardTitle></CardHeader>
                <CardContent>
                  {!procFee ? (
                    <div className="py-10 text-center text-gray-400 text-sm">
                      No processing fee record. Applicant has not initiated payment yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Processing Fee</p>
                          <p className="text-2xl font-bold text-navy-700 dark:text-navy-200 mt-0.5">{formatINR(procFee.amount)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Applicant: {procFee.applicant_name}</p>
                        </div>
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", FEE_STATUS_COLORS[procFee.status])}>
                          {procFee.status.replace("_", " ")}
                        </span>
                      </div>

                      {procFee.status === "RECEIPT_UPLOADED" && (
                        <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <Upload size={14} /> Payment Receipt Uploaded by Applicant
                          </p>
                          {procFee.receipt_note && (
                            <p className="text-xs text-gray-500 bg-gray-50 dark:bg-navy-800 rounded-lg p-2">
                              "{procFee.receipt_note}"
                            </p>
                          )}
                          <div className="flex gap-2">
                            <a href={procFee.receipt_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button variant="outline" size="sm" className="w-full" icon={<ExternalLink size={13} />}>View Receipt</Button>
                            </a>
                            <Button
                              variant="success"
                              size="sm"
                              className="flex-1"
                              icon={<CheckCircle2 size={13} />}
                              loading={approvingFee}
                              onClick={handleApproveFee}
                            >
                              Approve Payment
                            </Button>
                          </div>
                        </div>
                      )}

                      {procFee.status === "PENDING" && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                          <Clock size={16} className="text-amber-600" />
                          <p className="text-sm text-amber-700 dark:text-amber-400">Awaiting applicant to upload payment receipt.</p>
                        </div>
                      )}

                      {procFee.status === "APPROVED" && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                          <CheckCircle2 size={16} className="text-green-600" />
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">Processing fee approved on {formatDate(procFee.approved_at, "relative")}.</p>
                        </div>
                      )}
                    </div>
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
