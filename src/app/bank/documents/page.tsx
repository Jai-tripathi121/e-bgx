"use client";
import { useState, useEffect, useRef } from "react";
import {
  FileText, Download, Eye, Upload, FolderOpen, Building2,
  Award, Shield, DollarSign, Search, CheckCircle2, Trash2,
} from "lucide-react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  getBGDocumentsForBank,
  uploadUserDocument,
  getUserDocuments,
  deleteUserDocument,
  subscribeToUserDocuments,
  UserDocument,
  UserDocCategory,
  BGDocRecord,
} from "@/lib/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

// ── Category config ───────────────────────────────────────────────────────────

const USER_CATEGORIES: {
  id: UserDocCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  suggestions: string[];
}[] = [
  {
    id: "COMPANY",
    label: "Institution Docs",
    icon: <Building2 size={16} />,
    color: "blue",
    description: "Bank incorporation and regulatory documents",
    suggestions: ["RBI License", "Certificate of Incorporation", "MOA / AOA", "GST Certificate", "Tax Registration"],
  },
  {
    id: "KYC",
    label: "KYC",
    icon: <Shield size={16} />,
    color: "green",
    description: "Officer identity and compliance documents",
    suggestions: ["Officer PAN", "Officer Aadhaar", "Board Resolution", "Authorization Letter"],
  },
  {
    id: "FINANCIAL",
    label: "Financial",
    icon: <DollarSign size={16} />,
    color: "amber",
    description: "Financial statements and audit reports",
    suggestions: ["Annual Report", "Audited Balance Sheet", "P&L Statement", "Capital Adequacy Certificate"],
  },
  {
    id: "OTHERS",
    label: "Others",
    icon: <FolderOpen size={16} />,
    color: "gray",
    description: "Miscellaneous bank documents",
    suggestions: ["Circular", "Internal Policy", "Empanelment Letter"],
  },
];

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  green:  "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200 dark:border-green-800",
  amber:  "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  gray:   "bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

type ActiveTab = UserDocCategory | "BG_ACCEPTED";

// ── Main Component ────────────────────────────────────────────────────────────

export default function BankDocumentsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("BG_ACCEPTED");
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [bgDocs, setBgDocs] = useState<(BGDocRecord & { bg_id: string; bg_number?: string; applicant_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [bgFilter, setBgFilter] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeToUserDocuments(user.uid, (docs) => setUserDocs(docs));
    getBGDocumentsForBank(user.uid).then((docs) => {
      setBgDocs(docs);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => unsub();
  }, [user]);

  // Unique applicants from BG docs
  const applicantNames = Array.from(new Set(bgDocs.map((d) => d.applicant_name).filter(Boolean))) as string[];

  const filteredBGDocs = bgDocs.filter((d) => {
    const term = search.toLowerCase();
    const matchesTerm = !term || d.note?.toLowerCase().includes(term) || d.applicant_name?.toLowerCase().includes(term) || d.bg_id?.toLowerCase().includes(term);
    const matchesFilter = !bgFilter || d.applicant_name === bgFilter;
    return matchesTerm && matchesFilter;
  });

  const filteredUserDocs = (cat: UserDocCategory) =>
    userDocs.filter((d) => d.category === cat && (!search || d.label.toLowerCase().includes(search.toLowerCase())));

  const countFor = (tab: ActiveTab) => {
    if (tab === "BG_ACCEPTED") return bgDocs.length;
    return userDocs.filter((d) => d.category === tab).length;
  };

  const handleUpload = async () => {
    if (!user || !uploadFile || !uploadLabel.trim()) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const storage = getStorage();
      const path = `user_documents/${user.uid}/${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, uploadFile);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      await uploadUserDocument(user.uid, {
        category: activeTab as UserDocCategory,
        label: uploadLabel.trim(),
        url,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        notes: uploadNotes.trim() || undefined,
        status: "ACTIVE",
      });
      toast.success("Document uploaded successfully");
      setShowUploadModal(false);
      setUploadLabel("");
      setUploadNotes("");
      setUploadFile(null);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const activeCatConfig = USER_CATEGORIES.find((c) => c.id === activeTab);

  const ALL_TABS: { id: ActiveTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "BG_ACCEPTED", label: "Accepted BGs", icon: <Award size={16} />, color: "purple" },
    ...USER_CATEGORIES.map((c) => ({ id: c.id as ActiveTab, label: c.label, icon: c.icon, color: c.color })),
  ];

  return (
    <>
      <PortalHeader
        title="Document Centre"
        subtitle="View accepted BG documents and manage your institutional documents"
      />

      <div className="portal-content">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">Sections</p>
            {ALL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(""); setBgFilter(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  activeTab === tab.id
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8"
                }`}
              >
                <span className={activeTab === tab.id ? "" : "text-gray-400"}>{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
                {countFor(tab.id) > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-semibold ${
                    activeTab === tab.id ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                  }`}>
                    {countFor(tab.id)}
                  </span>
                )}
              </button>
            ))}

            <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8">
              <p className="text-xs text-gray-400 mb-1">Total Docs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userDocs.length + bgDocs.length}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border mb-1 ${colorMap[ALL_TABS.find(t => t.id === activeTab)?.color ?? "gray"]}`}>
                  {ALL_TABS.find((t) => t.id === activeTab)?.icon}
                  {ALL_TABS.find((t) => t.id === activeTab)?.label}
                </div>
                <p className="text-sm text-gray-500">
                  {activeTab === "BG_ACCEPTED"
                    ? "Documents from accepted Bank Guarantee applications"
                    : activeCatConfig?.description}
                </p>
              </div>
              {activeTab !== "BG_ACCEPTED" && (
                <Button size="sm" onClick={() => setShowUploadModal(true)} className="gap-2">
                  <Upload size={14} /> Upload
                </Button>
              )}
            </div>

            {/* Filters for BG docs */}
            {activeTab === "BG_ACCEPTED" && (
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by applicant, BG ID..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30"
                  />
                </div>
                {applicantNames.length > 0 && (
                  <select
                    value={bgFilter}
                    onChange={(e) => setBgFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="">All Applicants</option>
                    {applicantNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* User doc search */}
            {activeTab !== "BG_ACCEPTED" && (
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search in ${activeCatConfig?.label}...`}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30"
                />
              </div>
            )}

            {/* Suggestions for user doc tabs */}
            {activeTab !== "BG_ACCEPTED" && activeCatConfig && activeCatConfig.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeCatConfig.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setUploadLabel(s); setShowUploadModal(true); }}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 hover:border-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            {/* Document list */}
            {loading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}
              </div>
            ) : activeTab === "BG_ACCEPTED" ? (
              filteredBGDocs.length === 0 ? (
                <EmptyState label="Accepted BG Documents" desc="Documents from accepted BG applications will appear here." />
              ) : (
                /* Group by applicant */
                <div className="space-y-6">
                  {applicantNames.filter((n) => !bgFilter || n === bgFilter).map((applicant) => {
                    const applicantDocs = filteredBGDocs.filter((d) => d.applicant_name === applicant);
                    if (applicantDocs.length === 0) return null;
                    return (
                      <div key={applicant}>
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 size={14} className="text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{applicant}</span>
                          <span className="text-xs text-gray-400">({applicantDocs.length} docs)</span>
                        </div>
                        <div className="grid gap-2 pl-5 border-l-2 border-gray-100 dark:border-white/8">
                          {applicantDocs.map((d) => (
                            <BGDocRow key={d.id} doc={d} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Docs with no applicant name */}
                  {filteredBGDocs.filter(d => !d.applicant_name).map(d => (
                    <BGDocRow key={d.id} doc={d} />
                  ))}
                </div>
              )
            ) : (
              filteredUserDocs(activeTab as UserDocCategory).length === 0 ? (
                <EmptyState label={activeCatConfig?.label ?? ""} desc={activeCatConfig?.description ?? ""} onUpload={() => setShowUploadModal(true)} />
              ) : (
                <div className="grid gap-3">
                  {filteredUserDocs(activeTab as UserDocCategory).map((doc) => (
                    <UserDocRow key={doc.id} doc={doc} onDelete={() => deleteUserDocument(doc.id).then(() => toast.success("Removed"))} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upload Document</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Label *</label>
                  <input
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    placeholder="Document name"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">File *</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${uploadFile ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-gray-200 dark:border-white/10 hover:border-gray-400"}`}
                  >
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 size={16} />
                        <span className="text-sm font-medium">{uploadFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <Upload size={20} className="mx-auto mb-1" />
                        <p className="text-sm">Click to choose file</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                  </div>
                </div>
                {uploading && (
                  <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-black dark:bg-white rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function BGDocRow({ doc }: { doc: BGDocRecord & { bg_id: string; bg_number?: string; applicant_name?: string } }) {
  const label = doc.note || doc.doc_type || "Document";
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 hover:shadow-sm transition group">
      <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-500 shrink-0">
        <FileText size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{doc.bg_number ?? doc.bg_id}</span>
          {doc.doc_type && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-medium">{doc.doc_type}</span>
          )}
          {doc.uploaded_at && (
            <span className="text-xs text-gray-300">{new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
        {doc.file_url && (
          <>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-white transition" title="View"><Eye size={13} /></a>
            <a href={doc.file_url} download className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-white transition" title="Download"><Download size={13} /></a>
          </>
        )}
      </div>
    </div>
  );
}

function UserDocRow({ doc, onDelete }: { doc: UserDocument; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 hover:shadow-sm transition group">
      <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/8 flex items-center justify-center text-gray-400 shrink-0">
        <FileText size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{doc.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 truncate">{doc.file_name}</span>
          {doc.file_size && <span className="text-xs text-gray-300">{(doc.file_size / 1024).toFixed(1)} KB</span>}
          <span className="text-xs text-gray-300">{new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>
        {doc.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{doc.notes}</p>}
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
        {doc.url && (
          <>
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"><Eye size={13} /></a>
            <a href={doc.url} download className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"><Download size={13} /></a>
          </>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-300 hover:text-red-500 transition"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

function EmptyState({ label, desc, onUpload }: { label: string; desc: string; onUpload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-gray-300 dark:text-white/20">
        <FileText size={24} />
      </div>
      <p className="text-gray-900 dark:text-white font-semibold">No {label} yet</p>
      <p className="text-sm text-gray-400 mt-1">{desc}</p>
      {onUpload && <Button size="sm" className="mt-4" onClick={onUpload}><Upload size={14} className="mr-2" />Upload Now</Button>}
    </div>
  );
}
