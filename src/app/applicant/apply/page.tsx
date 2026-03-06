"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { CheckCircle2, Upload, FileText, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Step = 1 | 2 | 3 | 4;

const STEPS = ["Company & KYC", "Beneficiary & Tender", "Documents", "Review & Submit"];

const BG_TYPES = [
  { value: "PERFORMANCE", label: "Performance BG (Work Completion)" },
  { value: "FINANCIAL",   label: "Financial BG" },
  { value: "STATUTORY",   label: "Statutory BG" },
  { value: "OTHER",       label: "Other" },
];

const VALIDITY_OPTIONS = Array.from({ length: 36 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} Month${i > 0 ? "s" : ""}` }));

interface UploadedDoc {
  name: string;
  size: string;
  type: string;
}

export default function ApplyBGPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [declaration, setDeclaration] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});

  const [form, setForm] = useState({
    // Step 1 (pre-filled from profile)
    companyName: "POSTMAC VENTURES PVT LTD",
    pan: "AABCP1234C",
    gstin: "27AABCP1234C1Z5",
    cin: "U12345MH2020PTC123456",
    address: "Plot 45, Industrial Area Phase II, Chandigarh",
    city: "Chandigarh",
    state: "Punjab",
    pincode: "160002",
    // Step 2
    beneficiaryName: "",
    tenderNumber: "",
    bgType: "",
    amount: "",
    validity: "",
    requiredBy: "",
    beneficiaryAddress: "",
  });

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleFileUpload = (docType: string, file: File) => {
    setUploadedDocs((prev) => ({
      ...prev,
      [docType]: { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, type: docType },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, 1500));
    toast.success("BG Application submitted successfully! We will broadcast it to partner banks.");
    router.push("/applicant/offers");
  };

  const canProceed = step === 2 ?
    form.beneficiaryName && form.tenderNumber && form.bgType && form.amount && form.validity && form.requiredBy && form.beneficiaryAddress
    : step === 3 ? !!uploadedDocs["tender"]
    : step === 4 ? declaration
    : true;

  return (
    <>
      <PortalHeader title="Apply New BG" subtitle="New Bank Guarantee Application" />
      <div className="portal-content max-w-2xl mx-auto">
        {/* Step progress */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((label, i) => {
            const s = (i + 1) as Step;
            const isComplete = s < step;
            const isActive = s === step;
            return (
              <div key={label} className="flex-1 flex items-center">
                <div className={cn("flex items-center gap-2 shrink-0", s < step ? "cursor-pointer" : "")} onClick={() => s < step && setStep(s)}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                    isComplete ? "bg-green-500 border-green-500 text-white" :
                    isActive   ? "bg-navy-900 border-navy-900 text-white" :
                                 "bg-white dark:bg-navy-900 border-gray-200 dark:border-navy-700 text-gray-400",
                  )}>
                    {isComplete ? <CheckCircle2 size={14} /> : s}
                  </div>
                  <span className={cn("text-xs font-medium hidden sm:block", isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500")}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-px mx-3 transition-colors", s < step ? "bg-green-400" : "bg-gray-200 dark:bg-navy-700")} />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Company & KYC */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 flex gap-2 text-sm text-blue-700 dark:text-blue-400">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  Company details are pre-filled from your verified profile. Contact admin to update KYC details.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input label="Company Name" value={form.companyName} readOnly />
                  </div>
                  <Input label="Company PAN" value={form.pan} readOnly />
                  <Input label="GST Number" value={form.gstin} onChange={(e) => update("gstin", e.target.value)} />
                  <Input label="CIN Number" value={form.cin} onChange={(e) => update("cin", e.target.value)} />
                  <Input label="City" value={form.city} onChange={(e) => update("city", e.target.value)} required />
                  <Input label="State" value={form.state} onChange={(e) => update("state", e.target.value)} required />
                  <Input label="PIN Code" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} required />
                  <div className="col-span-2">
                    <Textarea label="Registered Address" value={form.address} onChange={(e) => update("address", e.target.value)} required />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Beneficiary & Tender */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input label="Beneficiary Name" value={form.beneficiaryName} onChange={(e) => update("beneficiaryName", e.target.value)} placeholder="e.g., NHAI, Ministry of Railways" required />
                  </div>
                  <Input label="Tender / Contract Number" value={form.tenderNumber} onChange={(e) => update("tenderNumber", e.target.value)} placeholder="e.g., NH-45/2025" required />
                  <Select label="BG Type" value={form.bgType} onChange={(e) => update("bgType", e.target.value)} options={BG_TYPES} required />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      BG Amount (INR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) => update("amount", e.target.value)}
                        placeholder="50000000"
                        className="w-full rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-gray-900 dark:text-white pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                    </div>
                  </div>
                  <Select label="Validity (Months)" value={form.validity} onChange={(e) => update("validity", e.target.value)} options={VALIDITY_OPTIONS} required />
                  <Input label="Required By Date" type="date" value={form.requiredBy} onChange={(e) => update("requiredBy", e.target.value)} required />
                  <div className="col-span-2">
                    <Textarea label="Beneficiary Address" value={form.beneficiaryAddress} onChange={(e) => update("beneficiaryAddress", e.target.value)} placeholder="Full address of the beneficiary organisation" required rows={3} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Document Upload */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload supporting documents. PDF format required. Max 10 MB per file.</p>
                {[
                  { key: "boardResolution", label: "Board Resolution / Power of Attorney", required: false },
                  { key: "tender",          label: "Tender Document",                      required: true  },
                  { key: "financials",      label: "Financial Statements (Last 2 years)",  required: false },
                  { key: "gstReturns",      label: "GST Returns (Latest 3 months)",        required: false },
                  { key: "other",           label: "Other Supporting Documents",            required: false },
                ].map((doc) => (
                  <div key={doc.key} className={cn("border rounded-xl p-4 transition-colors", uploadedDocs[doc.key] ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20" : doc.required ? "border-red-200 dark:border-red-900" : "border-gray-200 dark:border-navy-700")}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", uploadedDocs[doc.key] ? "bg-green-500" : "bg-gray-100 dark:bg-navy-800")}>
                          {uploadedDocs[doc.key] ? <CheckCircle2 size={18} className="text-white" /> : <FileText size={18} className="text-gray-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.label}
                            {doc.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          {uploadedDocs[doc.key] ? (
                            <p className="text-xs text-green-600 dark:text-green-400">{uploadedDocs[doc.key].name} ({uploadedDocs[doc.key].size})</p>
                          ) : (
                            <p className="text-xs text-gray-400">{doc.required ? "Required for submission" : "Optional"}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {uploadedDocs[doc.key] && (
                          <button onClick={() => setUploadedDocs((p) => { const n = { ...p }; delete n[doc.key]; return n; })} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                        <label className="cursor-pointer">
                          <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(doc.key, f); }} />
                          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all", uploadedDocs[doc.key] ? "border-green-300 text-green-600 hover:bg-green-50" : "border-gray-200 dark:border-navy-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800")}>
                            <Upload size={12} />
                            {uploadedDocs[doc.key] ? "Replace" : "Upload"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-navy-800/50 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Application Summary</h3>
                  {[
                    ["Company", form.companyName],
                    ["BG Type", BG_TYPES.find((t) => t.value === form.bgType)?.label || form.bgType],
                    ["Beneficiary", form.beneficiaryName],
                    ["Tender Number", form.tenderNumber],
                    ["BG Amount", form.amount ? `₹${Number(form.amount).toLocaleString("en-IN")}` : "—"],
                    ["Validity", form.validity ? `${form.validity} Month(s)` : "—"],
                    ["Required By", form.requiredBy],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-100 dark:border-navy-700 pb-2.5 last:border-0 last:pb-0">
                      <span className="text-gray-500 dark:text-gray-400">{k}</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right max-w-[55%]">{v || "—"}</span>
                    </div>
                  ))}
                </div>

                {Object.keys(uploadedDocs).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attached Documents</p>
                    {Object.values(uploadedDocs).map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <FileText size={14} className="text-navy-400 shrink-0" />
                        {doc.name} <span className="text-gray-400">({doc.size})</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 rounded-xl border border-navy-200 dark:border-navy-700 bg-navy-50 dark:bg-navy-800/30">
                  <input
                    type="checkbox"
                    id="declaration"
                    checked={declaration}
                    onChange={(e) => setDeclaration(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-navy-800 cursor-pointer shrink-0"
                  />
                  <label htmlFor="declaration" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    I declare that all information provided is accurate and complete. I authorize e-BGX to share this application with partner banks for the purpose of obtaining bank guarantee quotes.
                  </label>
                </div>
              </div>
            )}
          </CardContent>

          {/* Navigation */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : null} disabled={step === 1}>
              Previous
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>
              {step < 4 ? (
                <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed}>
                  Continue
                </Button>
              ) : (
                <Button onClick={handleSubmit} loading={loading} disabled={!declaration}>
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
