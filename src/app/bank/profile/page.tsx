"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, User, Shield, Bell, Key, CheckCircle2, Upload, Save,
  FileText, Eye, Download, Trash2, DollarSign, FolderOpen, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import {
  updateUserProfile, subscribeToUserDocuments, uploadUserDocument,
  deleteUserDocument, UserDocument, UserDocCategory,
} from "@/lib/firestore";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const BG_TYPES = ["PERFORMANCE", "FINANCIAL", "ADVANCE_PAYMENT", "BID_BOND", "CUSTOMS", "DEFERRED_PAYMENT"] as const;
const SECTORS = ["Infrastructure", "Defence", "Energy", "Real Estate", "Manufacturing", "IT & Telecom", "FMCG", "Exports", "Imports"];

const BANK_DOC_CATEGORIES: { id: UserDocCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "COMPANY",   label: "Institution Docs", icon: <Building2 size={13} />,  color: "blue" },
  { id: "KYC",       label: "KYC",              icon: <Shield size={13} />,      color: "green" },
  { id: "FINANCIAL", label: "Financial",         icon: <DollarSign size={13} />, color: "amber" },
  { id: "OTHERS",    label: "Others",            icon: <FolderOpen size={13} />, color: "gray" },
];

const colorMap: Record<string, string> = {
  blue:  "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  gray:  "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400",
};

export default function BankProfilePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Profile" | "Documents">("Profile");
  const [saving, setSaving] = useState(false);
  // Document state
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [activeCat, setActiveCat] = useState<UserDocCategory>("COMPANY");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  // Editable institution fields
  const [form, setForm] = useState({
    bankName: "",
    branchCode: "",
    branchEmail: "",
    address: "",
    officerName: "",
    officerDesignation: "",
    officerMobile: "",
  });

  // Commission defaults (controlled)
  const [commMin, setCommMin]       = useState("1.25");
  const [commMax, setCommMax]       = useState("2.50");
  const [fdMargin, setFdMargin]     = useState("100");
  const [minBGAmt, setMinBGAmt]     = useState("5000000");
  const [maxBGAmt, setMaxBGAmt]     = useState("500000000");
  const [maxValidity, setMaxValidity] = useState("36");

  // Populate form from profile once loaded
  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setForm({
      bankName: p.bankName ?? "",
      branchCode: p.branchCode ?? "",
      branchEmail: p.branchEmail ?? profile.email ?? "",
      address: p.address ?? "",
      officerName: p.officerName ?? profile.displayName ?? "",
      officerDesignation: p.officerDesignation ?? "",
      officerMobile: p.officerMobile ?? (profile as any).mobile ?? "",
    });
    // Load commission defaults
    if (p.commMin !== undefined) setCommMin(String(p.commMin));
    if (p.commMax !== undefined) setCommMax(String(p.commMax));
    if (p.fdMargin !== undefined) setFdMargin(String(p.fdMargin));
    if (p.minBGAmt !== undefined) setMinBGAmt(String(p.minBGAmt));
    if (p.maxBGAmt !== undefined) setMaxBGAmt(String(p.maxBGAmt));
    if (p.maxValidity !== undefined) setMaxValidity(String(p.maxValidity));
    // Load BG types and sectors
    if (Array.isArray(p.selectedTypes)) setSelectedTypes(p.selectedTypes);
    if (Array.isArray(p.selectedSectors)) setSelectedSectors(p.selectedSectors);
  }, [profile]);

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        bankName: form.bankName,
        branchCode: form.branchCode,
        branchEmail: form.branchEmail,
        address: form.address,
        officerName: form.officerName,
        officerDesignation: form.officerDesignation,
        officerMobile: form.officerMobile,
        displayName: form.officerName || form.bankName,
        // Commission defaults
        commMin: Number(commMin) || 1.25,
        commMax: Number(commMax) || 2.50,
        fdMargin: Number(fdMargin) || 100,
        minBGAmt: Number(minBGAmt) || 5000000,
        maxBGAmt: Number(maxBGAmt) || 500000000,
        maxValidity: Number(maxValidity) || 36,
        // Preferences
        selectedTypes,
        selectedSectors,
      });
      toast.success("Profile updated successfully.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const initials = form.officerName
    ? form.officerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : form.bankName?.[0]?.toUpperCase() ?? "B";

  // Document helpers
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserDocuments(user.uid, setUserDocs);
    return () => unsub();
  }, [user]);

  const docsForCat = (cat: UserDocCategory) => userDocs.filter((d) => d.category === cat);

  const handleUpload = async () => {
    if (!user || !uploadFile || !uploadLabel.trim()) return;
    setUploading(true); setUploadProgress(0);
    try {
      const storage = getStorage();
      const path = `user_documents/${user.uid}/${Date.now()}_${uploadFile.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, uploadFile);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", (s) => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)), reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      await uploadUserDocument(user.uid, { category: activeCat, label: uploadLabel.trim(), url, file_name: uploadFile.name, file_size: uploadFile.size, status: "ACTIVE" });
      toast.success("Uploaded successfully");
      setShowUploadModal(false); setUploadLabel(""); setUploadFile(null);
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };

  return (
    <>
      <PortalHeader
        title="Bank Profile & Settings"
        subtitle="Manage your institution details, preferences, and documents"
        actions={
          activeTab === "Profile" ? (
            <Button icon={<Save size={14} />} onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          ) : undefined
        }
      />

      {/* Tab Bar */}
      <div className="border-b border-gray-100 dark:border-white/8 px-6">
        <div className="flex gap-1 -mb-px">
          {(["Profile", "Documents"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab
                  ? "border-black dark:border-white text-gray-900 dark:text-white"
                  : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              {tab}
              {tab === "Documents" && userDocs.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                  {userDocs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="portal-content space-y-6">

        {/* ── PROFILE TAB ──────────────────────────────────────────────── */}
        {activeTab === "Profile" && <>

        {/* Status Banner */}
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Verified Bank Partner</p>
            <p className="text-xs text-green-600 dark:text-green-400">Your institution is fully verified and active on e-BGX marketplace.</p>
          </div>
          <Badge variant="success" className="ml-auto shrink-0">
            {(profile as any)?.bankStatus ?? "Active"}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Institution Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={16} className="text-navy-500" />
                  Institution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Bank Name" value={form.bankName} onChange={(e) => setForm(f => ({ ...f, bankName: e.target.value }))} required />
                  <Input label="Branch Code / IFSC" value={form.branchCode} onChange={(e) => setForm(f => ({ ...f, branchCode: e.target.value }))} />
                  <Input label="BG Desk Email" value={form.branchEmail} onChange={(e) => setForm(f => ({ ...f, branchEmail: e.target.value }))} type="email" required />
                  <Input label="Head Office / Branch Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            {/* BG Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>BG Types Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Select the types of bank guarantees your institution can issue:</p>
                <div className="flex flex-wrap gap-2">
                  {BG_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleItem(selectedTypes, setSelectedTypes, t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedTypes.includes(t) ? "bg-navy-900 dark:bg-navy-700 text-white border-navy-900 dark:border-navy-600" : "bg-white dark:bg-navy-900 text-gray-500 border-gray-200 dark:border-navy-700 hover:border-navy-400"}`}
                    >
                      {t.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sector Focus */}
            <Card>
              <CardHeader>
                <CardTitle>Preferred Sectors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Select sectors you prefer to serve (affects market feed priority):</p>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleItem(selectedSectors, setSelectedSectors, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedSectors.includes(s) ? "bg-navy-900 dark:bg-navy-700 text-white border-navy-900 dark:border-navy-600" : "bg-white dark:bg-navy-900 text-gray-500 border-gray-200 dark:border-navy-700 hover:border-navy-400"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Commission Defaults */}
            <Card>
              <CardHeader>
                <CardTitle>Default Commission Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">These defaults pre-fill your offer quotes. You can still change them per-offer.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Min Commission Rate (%)"
                    type="number"
                    value={commMin}
                    onChange={(e) => setCommMin(e.target.value)}
                    hint="Per annum"
                  />
                  <Input
                    label="Max Commission Rate (%)"
                    type="number"
                    value={commMax}
                    onChange={(e) => setCommMax(e.target.value)}
                  />
                  <Input
                    label="Default FD Margin (%)"
                    type="number"
                    value={fdMargin}
                    onChange={(e) => setFdMargin(e.target.value)}
                    hint="% of BG amount"
                  />
                  <Input
                    label="Min BG Amount (₹)"
                    type="number"
                    value={minBGAmt}
                    onChange={(e) => setMinBGAmt(e.target.value)}
                    hint="₹50 L"
                  />
                  <Input
                    label="Max BG Amount (₹)"
                    type="number"
                    value={maxBGAmt}
                    onChange={(e) => setMaxBGAmt(e.target.value)}
                    hint="₹50 Cr"
                  />
                  <Input
                    label="Max Validity (Months)"
                    type="number"
                    value={maxValidity}
                    onChange={(e) => setMaxValidity(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Officer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={16} className="text-navy-500" />
                  Authorized Officer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-50 dark:border-navy-800">
                  <div className="w-16 h-16 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-2xl font-bold text-navy-700 dark:text-navy-200">
                    {initials}
                  </div>
                  <Button size="xs" variant="outline" icon={<Upload size={11} />}>Update Photo</Button>
                </div>
                <Input label="Officer Name" value={form.officerName} onChange={(e) => setForm(f => ({ ...f, officerName: e.target.value }))} required />
                <Input label="Designation" value={form.officerDesignation} onChange={(e) => setForm(f => ({ ...f, officerDesignation: e.target.value }))} />
                <Input label="Mobile" value={form.officerMobile} onChange={(e) => setForm(f => ({ ...f, officerMobile: e.target.value }))} type="tel" />
              </CardContent>
            </Card>

            {/* Document Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={16} className="text-navy-500" />
                  Institution Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { label: "RBI License", status: "Verified" },
                  { label: "SEBI Registration", status: "Verified" },
                  { label: "Board Authorization", status: "Verified" },
                  { label: "Bank Guarantee Policy", status: "Pending Upload" },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-navy-800 last:border-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{doc.label}</p>
                    <Badge variant={doc.status === "Verified" ? "success" : "warning"} size="sm">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
                <Button size="xs" variant="outline" icon={<Upload size={11} />} className="w-full mt-2">
                  Upload Document
                </Button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={16} className="text-navy-500" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "New BG Request", sub: "Alert when new BG posted", on: true },
                  { label: "Offer Accepted", sub: "When applicant accepts", on: true },
                  { label: "Payment Received", sub: "FD & fee confirmations", on: true },
                  { label: "BG Expiry Alerts", sub: "30/7 days before expiry", on: false },
                  { label: "Daily Digest", sub: "Summary at 9 AM", on: false },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{n.label}</p>
                      <p className="text-[10px] text-gray-400">{n.sub}</p>
                    </div>
                    <button className={`w-9 h-5 rounded-full transition-colors ${n.on ? "bg-navy-900 dark:bg-navy-600" : "bg-gray-200 dark:bg-navy-700"} relative`}>
                      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${n.on ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key size={16} className="text-navy-500" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full">Change Password</Button>
                <Button variant="outline" size="sm" className="w-full">Enable Two-Factor Auth</Button>
                <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-600">Revoke All Sessions</Button>
              </CardContent>
            </Card>

          </div>
        </div>

        </> /* end Profile tab */}

        {/* ── DOCUMENTS TAB ─────────────────────────────────────────────── */}
        {activeTab === "Documents" && (
          <>
            {/* Category summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {BANK_DOC_CATEGORIES.map((cat) => {
                const count = docsForCat(cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(cat.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      activeCat === cat.id
                        ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-white/8"
                        : "border-gray-100 dark:border-white/8 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div className={`inline-flex p-1.5 rounded-lg mb-2 ${colorMap[cat.color]}`}>{cat.icon}</div>
                    <p className="text-xs text-gray-400">{cat.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
                  </button>
                );
              })}
            </div>

            {/* Active category panel */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {BANK_DOC_CATEGORIES.find((c) => c.id === activeCat)?.icon}
                  {BANK_DOC_CATEGORIES.find((c) => c.id === activeCat)?.label}
                </CardTitle>
                <Button size="sm" onClick={() => setShowUploadModal(true)} className="gap-2">
                  <Upload size={13} /> Upload
                </Button>
              </CardHeader>
              <CardContent>
                {docsForCat(activeCat).length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-200 dark:text-white/15 mb-3">
                      <FileText size={18} />
                    </div>
                    <p className="text-sm text-gray-400">No documents in this category yet.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowUploadModal(true)}>
                      <Upload size={12} className="mr-1.5" /> Add Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docsForCat(activeCat).map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 group">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/8 flex items-center justify-center text-gray-400 shrink-0">
                          <FileText size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.label}</p>
                          <p className="text-xs text-gray-400">{doc.file_name} &bull; {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"><Eye size={13} /></a>
                          <a href={doc.url} download className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"><Download size={13} /></a>
                          <button onClick={() => deleteUserDocument(doc.id).then(() => toast.success("Removed"))} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-300 hover:text-red-500 transition"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Link to full document centre */}
            <div className="flex justify-end">
              <button
                onClick={() => router.push("/bank/documents")}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              >
                Open Document Centre <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}

      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upload Document</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Label *</label>
                  <input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} placeholder="e.g. RBI License" className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">File *</label>
                  <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${uploadFile ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-gray-200 dark:border-white/10 hover:border-gray-400"}`}>
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 size={15} /><span className="text-sm font-medium">{uploadFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-400"><Upload size={18} className="mx-auto mb-1" /><p className="text-sm">Click to choose file</p></div>
                    )}
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                  </div>
                </div>
                {uploading && (
                  <div><div className="flex justify-between text-xs text-gray-400 mb-1"><span>Uploading...</span><span>{uploadProgress}%</span></div><div className="h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden"><div className="h-full bg-black dark:bg-white rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div></div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadLabel(""); }} disabled={uploading}>Cancel</Button>
                <Button className="flex-1" onClick={handleUpload} loading={uploading} disabled={!uploadFile || !uploadLabel.trim()}>Upload</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
