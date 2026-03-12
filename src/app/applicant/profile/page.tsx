"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KYCStatusBadge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertCircle, ExternalLink, User, Building2,
  Clock, XCircle, FileText, Upload, Download, Eye, Trash2,
  MapPin, Phone, Mail, CreditCard, Banknote, Shield, FolderOpen,
  Award, DollarSign, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile, subscribeToUserDocuments, uploadUserDocument, deleteUserDocument, UserDocument, UserDocCategory } from "@/lib/firestore";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

// ── Tab types ─────────────────────────────────────────────────────────────────

const TABS = ["Profile", "Documents"] as const;
type Tab = (typeof TABS)[number];

// ── Category config ───────────────────────────────────────────────────────────

const DOC_CATEGORIES: { id: UserDocCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "COMPANY",    label: "Company Docs", icon: <Building2 size={13} />, color: "blue" },
  { id: "KYC",        label: "KYC",          icon: <Shield size={13} />,    color: "green" },
  { id: "FINANCIAL",  label: "Financial",    icon: <DollarSign size={13} />,color: "amber" },
  { id: "OTHERS",     label: "Others",       icon: <FolderOpen size={13} />,color: "gray" },
];

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  green:  "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  amber:  "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
  gray:   "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ApplicantProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState({ displayName: "", mobile: "" });

  // Document state
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [activeCat, setActiveCat] = useState<UserDocCategory>("COMPANY");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContact({
      displayName: profile?.displayName || "",
      mobile: (profile as any)?.mobile || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserDocuments(user.uid, setUserDocs);
    return () => unsub();
  }, [user]);

  const kycStatus = profile?.kycStatus || "PENDING";
  const profileComplete = profile?.profileComplete ?? false;
  const p = profile as any;

  // Field row for onboarding details
  const FieldRow = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value || "—"}</p>
    </div>
  );

  const kycBanner = () => {
    if (!profileComplete) {
      return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Profile Incomplete</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Complete your profile to enable KYC verification.</p>
          </div>
          <Button size="sm" onClick={() => router.push("/applicant/complete-profile")}>Complete Profile</Button>
        </div>
      );
    }
    if (kycStatus === "APPROVED") return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
        <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-800 dark:text-green-300 text-sm">KYC Verified</p>
          <p className="text-xs text-green-600 dark:text-green-400">You are verified and can apply for BGs.</p>
        </div>
        <KYCStatusBadge status="APPROVED" />
      </div>
    );
    if (kycStatus === "REJECTED") return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
        <XCircle size={20} className="text-red-500 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-red-800 dark:text-red-300 text-sm">KYC Rejected</p>
          <p className="text-xs text-red-600 dark:text-red-400">Your KYC was not approved. Please contact admin.</p>
        </div>
        <KYCStatusBadge status="REJECTED" />
      </div>
    );
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
        <Clock size={20} className="text-blue-500 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">KYC Under Review</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Admin is reviewing your profile. Approval within 1–2 business days.</p>
        </div>
        <KYCStatusBadge status="PENDING" />
      </div>
    );
  };

  const handleSaveContact = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: contact.displayName, mobile: contact.mobile });
      await refreshProfile();
      toast.success("Contact details saved.");
    } catch { toast.error("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

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

  const docsForCat = (cat: UserDocCategory) => userDocs.filter((d) => d.category === cat);

  return (
    <>
      <PortalHeader title="Profile & Settings" subtitle="Manage your company KYC, onboarding details and documents" />

      {/* Tab Bar */}
      <div className="border-b border-gray-100 dark:border-white/8 px-6">
        <div className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
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

      <div className="portal-content space-y-6 max-w-3xl mx-auto">

        {/* ── PROFILE TAB ──────────────────────────────────────────────────── */}
        {activeTab === "Profile" && (
          <>
            {kycBanner()}

            {/* Company Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 size={16} />Company Identity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <FieldRow label="Legal Company Name" value={p?.companyName} />
                  <FieldRow label="Company PAN" value={p?.pan} />
                  <FieldRow label="GST Number (GSTIN)" value={p?.gstin} />
                  <FieldRow label="CIN Number" value={p?.cin} />
                  <FieldRow label="Email" value={p?.email} />
                  <FieldRow label="Mobile" value={p?.mobile} />
                  {(p?.address || p?.city) && (
                    <div className="col-span-2">
                      <FieldRow
                        label="Registered Address"
                        value={[p?.address, p?.city, p?.state, p?.pincode].filter(Boolean).join(", ")}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex gap-2 text-sm">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-amber-700 dark:text-amber-400">
                    To update KYC-verified fields,{" "}
                    <a href="mailto:support@e-bgx.com" className="underline font-medium inline-flex items-center gap-1">
                      contact e-BGX Admin <ExternalLink size={11} />
                    </a>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Banking Details */}
            {(p?.primaryBank || p?.accountNumber || p?.ifscCode) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Banknote size={16} />Banking Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <FieldRow label="Primary Bank" value={p?.primaryBank} />
                    <FieldRow label="Account Type" value={p?.accountType} />
                    <FieldRow label="Account Number" value={p?.accountNumber ? "••••••" + String(p.accountNumber).slice(-4) : undefined} />
                    <FieldRow label="IFSC Code" value={p?.ifscCode} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Business Info */}
            {(p?.annualTurnover || p?.industrysector || p?.businessVintage) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CreditCard size={16} />Business Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <FieldRow label="Annual Turnover" value={p?.annualTurnover} />
                    <FieldRow label="Business Vintage" value={p?.businessVintage ? `${p.businessVintage} years` : undefined} />
                    <FieldRow label="Industry Sector" value={p?.industrySecter ?? p?.industrySecter} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Authorized Signatory */}
            {(p?.authorizedSignatoryName || p?.authorizedSignatoryEmail) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User size={16} />Authorized Signatory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <FieldRow label="Name" value={p?.authorizedSignatoryName} />
                    <FieldRow label="Designation" value={p?.authorizedSignatoryRole} />
                    <FieldRow label="Email" value={p?.authorizedSignatoryEmail} />
                    <FieldRow label="Mobile" value={p?.authorizedSignatoryMobile} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Details (editable) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User size={16} />Contact Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input label="Display Name" value={contact.displayName} onChange={(e) => setContact((c) => ({ ...c, displayName: e.target.value }))} placeholder="Your name or company contact name" />
                  </div>
                  <Input label="Mobile Number" value={contact.mobile} onChange={(e) => setContact((c) => ({ ...c, mobile: e.target.value }))} placeholder="+91 98765 43210" />
                  <Input label="Email" value={p?.email || ""} readOnly hint="Cannot be changed" />
                </div>
                <Button className="mt-4" onClick={handleSaveContact} loading={saving}>Save Changes</Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div><p className="text-xs text-gray-400 mb-1">Role</p><p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{p?.role || "—"}</p></div>
                  <div><p className="text-xs text-gray-400 mb-1">KYC Status</p><KYCStatusBadge status={kycStatus as any} /></div>
                  <div><p className="text-xs text-gray-400 mb-1">Profile Complete</p><p className="text-sm font-medium text-gray-900 dark:text-white">{profileComplete ? "Yes" : "No"}</p></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── DOCUMENTS TAB ────────────────────────────────────────────────── */}
        {activeTab === "Documents" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              {DOC_CATEGORIES.map((cat) => {
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

            {/* Active Category Panel */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {DOC_CATEGORIES.find((c) => c.id === activeCat)?.icon}
                  {DOC_CATEGORIES.find((c) => c.id === activeCat)?.label}
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
                      <Upload size={12} className="mr-1.5" /> Add First Document
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

            {/* Link to full documents page */}
            <div className="flex justify-end">
              <button
                onClick={() => router.push("/applicant/documents")}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              >
                Open full Document Vault <ChevronRight size={14} />
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
                  <input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} placeholder="e.g. PAN Card" className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30" />
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
