"use client";
import { useState, useEffect, useRef } from "react";
import {
  FolderOpen, Upload, Trash2, Download, Eye, FileText,
  Building2, User, DollarSign, Award, MoreHorizontal, Search,
  CheckCircle2, Clock, AlertCircle, File, Shield,
} from "lucide-react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  uploadUserDocument,
  getUserDocuments,
  deleteUserDocument,
  subscribeToUserDocuments,
  getBGDocumentsForApplicant,
  UserDocument,
  UserDocCategory,
  BGDocRecord,
} from "@/lib/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: {
  id: UserDocCategory | "BG_DOWNLOADED";
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  suggestions: string[];
}[] = [
  {
    id: "COMPANY",
    label: "Company Docs",
    icon: <Building2 size={16} />,
    color: "blue",
    description: "Corporate registration and legal documents",
    suggestions: ["Certificate of Incorporation", "MOA / AOA", "Trade License", "Tax Registration Certificate", "GST Certificate"],
  },
  {
    id: "KYC",
    label: "KYC",
    icon: <Shield size={16} />,
    color: "green",
    description: "Identity and compliance verification documents",
    suggestions: ["PAN Card", "GSTIN Certificate", "Director Aadhaar", "Director PAN", "Board Resolution"],
  },
  {
    id: "FINANCIAL",
    label: "Financial",
    icon: <DollarSign size={16} />,
    color: "amber",
    description: "Financial statements and bank records",
    suggestions: ["Bank Statement (6 months)", "ITR — Last 3 Years", "Audited Balance Sheet", "P&L Statement", "CA Certificate", "CIBIL Report"],
  },
  {
    id: "BG_DOWNLOADED",
    label: "BG Downloaded",
    icon: <Award size={16} />,
    color: "purple",
    description: "Issued Bank Guarantee certificates",
    suggestions: [],
  },
  {
    id: "OTHERS",
    label: "Others",
    icon: <FolderOpen size={16} />,
    color: "gray",
    description: "Miscellaneous supporting documents",
    suggestions: ["Project Contract", "Tender Document", "Work Order", "NOC Letter"],
  },
];

type AnyDoc = (UserDocument | (BGDocRecord & { bg_id: string })) & { _source: "user" | "bg" };

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  green:  "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200 dark:border-green-800",
  amber:  "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  gray:   "bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ApplicantDocumentsPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<UserDocCategory | "BG_DOWNLOADED">("COMPANY");
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [bgDocs, setBgDocs] = useState<(BGDocRecord & { bg_id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [suggestLabel, setSuggestLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Real-time subscription for user documents
    const unsub = subscribeToUserDocuments(user.uid, (docs) => {
      setUserDocs(docs);
    });

    // One-time load for BG documents
    getBGDocumentsForApplicant(user.uid).then((docs) => {
      setBgDocs(docs);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => unsub();
  }, [user]);

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory)!;

  // Filter docs for active category
  const filteredDocs = (): AnyDoc[] => {
    const term = search.toLowerCase();
    if (activeCategory === "BG_DOWNLOADED") {
      return bgDocs
        .filter((d) => d.doc_type === "FINAL_BG" || d.doc_type === "DRAFT_BG")
        .filter((d) => !term || d.note?.toLowerCase().includes(term) || d.bg_id?.toLowerCase().includes(term))
        .map((d) => ({ ...d, _source: "bg" as const }));
    }
    return userDocs
      .filter((d) => d.category === activeCategory)
      .filter((d) => !term || d.label.toLowerCase().includes(term) || d.file_name.toLowerCase().includes(term))
      .map((d) => ({ ...d, _source: "user" as const }));
  };

  // Count per category
  const countFor = (catId: UserDocCategory | "BG_DOWNLOADED") => {
    if (catId === "BG_DOWNLOADED")
      return bgDocs.filter((d) => d.doc_type === "FINAL_BG" || d.doc_type === "DRAFT_BG").length;
    return userDocs.filter((d) => d.category === catId).length;
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
        task.on(
          "state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve()
        );
      });
      const url = await getDownloadURL(task.snapshot.ref);
      await uploadUserDocument(user.uid, {
        category: activeCategory as UserDocCategory,
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
      setSuggestLabel("");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Remove this document from your vault?")) return;
    await deleteUserDocument(docId);
    toast.success("Document removed.");
  };

  const docs = filteredDocs();

  return (
    <>
      <PortalHeader
        title="Document Vault"
        subtitle="Manage and organise all your company documents in one place"
      />

      <div className="portal-content">
        <div className="flex gap-6">
          {/* Left: Category sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">Categories</p>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  activeCategory === cat.id
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8"
                }`}
              >
                <span className={activeCategory === cat.id ? "" : "text-gray-400"}>{cat.icon}</span>
                <span className="flex-1">{cat.label}</span>
                {countFor(cat.id) > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-semibold ${
                    activeCategory === cat.id ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                  }`}>
                    {countFor(cat.id)}
                  </span>
                )}
              </button>
            ))}

            {/* Total summary */}
            <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8">
              <p className="text-xs text-gray-400 mb-1">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userDocs.length + bgDocs.filter((d) => d.doc_type === "FINAL_BG" || d.doc_type === "DRAFT_BG").length}
              </p>
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border mb-1 ${colorMap[activeCat.color]}`}>
                  {activeCat.icon}
                  {activeCat.label}
                </div>
                <p className="text-sm text-gray-500">{activeCat.description}</p>
              </div>
              {activeCategory !== "BG_DOWNLOADED" && (
                <Button
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                  className="gap-2"
                >
                  <Upload size={14} /> Upload Document
                </Button>
              )}
            </div>

            {/* Suggestions */}
            {activeCategory !== "BG_DOWNLOADED" && activeCat.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeCat.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSuggestLabel(s);
                      setUploadLabel(s);
                      setShowUploadModal(true);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 hover:border-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search in ${activeCat.label}...`}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30"
              />
            </div>

            {/* Document list */}
            {loading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-gray-300 dark:text-white/20">
                  <FileText size={24} />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold">No {activeCat.label} yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  {activeCategory === "BG_DOWNLOADED"
                    ? "Issued BG certificates will appear here automatically."
                    : "Upload your first document using the button above."}
                </p>
                {activeCategory !== "BG_DOWNLOADED" && (
                  <Button size="sm" className="mt-4" onClick={() => setShowUploadModal(true)}>
                    <Upload size={14} className="mr-2" /> Upload Now
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {docs.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onDelete={doc._source === "user" ? () => handleDelete(doc.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Upload to {activeCat.label}
              </h2>
              <p className="text-sm text-gray-500 mb-5">{activeCat.description}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Document Label *
                  </label>
                  <input
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    placeholder="e.g. Certificate of Incorporation"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30"
                  />
                  {activeCat.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeCat.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => setUploadLabel(s)}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    File *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      uploadFile
                        ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25"
                    }`}
                  >
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 size={18} />
                        <div className="text-left">
                          <p className="text-sm font-medium">{uploadFile.name}</p>
                          <p className="text-xs opacity-70">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <Upload size={22} className="mx-auto mb-2" />
                        <p className="text-sm">Click to choose file</p>
                        <p className="text-xs mt-0.5">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Notes (optional)
                  </label>
                  <textarea
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    rows={2}
                    placeholder="Any notes about this document..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/30"
                  />
                </div>

                {uploading && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadLabel(""); setUploadNotes(""); }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!uploadFile || !uploadLabel.trim()}
                >
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── DocCard ───────────────────────────────────────────────────────────────────

function DocCard({ doc, onDelete }: { doc: AnyDoc; onDelete?: () => void }) {
  const isBG = doc._source === "bg";
  const bgDocRecord = isBG ? (doc as BGDocRecord & { bg_id: string }) : null;
  const label = isBG
    ? (bgDocRecord?.note || bgDocRecord?.doc_type || "Document")
    : (doc as UserDocument).label;
  const date = (doc as any).uploaded_at ?? (doc as any).created_at ?? "";
  const url = isBG ? bgDocRecord?.file_url : (doc as UserDocument).url;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 hover:shadow-sm transition-all group">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/8 flex items-center justify-center text-gray-400 shrink-0">
        <FileText size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{label}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {bgDocRecord && (
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              {bgDocRecord.bg_id}
            </span>
          )}
          {!isBG && (doc as UserDocument).file_name && (
            <span className="text-xs text-gray-400 truncate">{(doc as UserDocument).file_name}</span>
          )}
          {isBG && bgDocRecord?.file_name && (
            <span className="text-xs text-gray-400 truncate">{bgDocRecord.file_name}</span>
          )}
          {date && (
            <span className="text-xs text-gray-300">
              {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        {!isBG && (doc as UserDocument).notes && (
          <p className="text-xs text-gray-400 mt-1 italic">{(doc as UserDocument).notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {url && (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
              title="View"
            >
              <Eye size={14} />
            </a>
            <a
              href={url}
              download
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
              title="Download"
            >
              <Download size={14} />
            </a>
          </>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-300 hover:text-red-500 transition"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
