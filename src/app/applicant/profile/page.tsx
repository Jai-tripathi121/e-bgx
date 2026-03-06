"use client";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KYCStatusBadge } from "@/components/ui/badge";
import { CheckCircle2, Upload, AlertCircle, ExternalLink, User, Building2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const KYC_DOCS = [
  { type: "signatory_pan",    label: "Authorised Signatory PAN",    status: "COMPLETED" as const },
  { type: "company_pan",      label: "Company PAN Card",             status: "COMPLETED" as const },
  { type: "board_resolution", label: "Board Resolution / PoA",      status: "COMPLETED" as const },
  { type: "moa",              label: "Memorandum of Association",    status: "COMPLETED" as const },
  { type: "coi",              label: "Certificate of Incorporation", status: "COMPLETED" as const },
  { type: "aoa",              label: "Articles of Association",      status: "PENDING" as const },
];

export default function ApplicantProfilePage() {
  return (
    <>
      <PortalHeader title="Profile & Settings" subtitle="Manage your company KYC and account details" />
      <div className="portal-content space-y-6 max-w-3xl mx-auto">
        {/* Status Widget */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <CheckCircle2 size={20} className="text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Profile Active</p>
            <p className="text-xs text-green-600 dark:text-green-400">Onboarded since Jan 15, 2025 · KYC Approved</p>
          </div>
          <div className="ml-auto">
            <KYCStatusBadge status="APPROVED" />
          </div>
        </div>

        {/* Company Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 size={16} />Company Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Legal Company Name" defaultValue="POSTMAC VENTURES PVT LTD" readOnly />
              </div>
              <Input label="GST Number (GSTIN)" defaultValue="27AABCP1234C1Z5" readOnly />
              <Input label="Company PAN" defaultValue="AABCP1234C" readOnly />
              <Input label="CIN Number" defaultValue="U12345MH2020PTC123456" readOnly />
              <Input label="Industry / Sector" defaultValue="Infrastructure & Trading" />
              <div className="col-span-2">
                <Input label="Registered Address" defaultValue="Plot 45, Industrial Area Phase II, Chandigarh, Punjab 160002" readOnly />
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex gap-2 text-sm">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400">
                To update KYC-verified fields, <a href="#" className="underline font-medium inline-flex items-center gap-1">contact e-BGX Admin <ExternalLink size={11} /></a>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Banking & Financials */}
        <Card>
          <CardHeader>
            <CardTitle>Banking & Financials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Primary Bank Name" defaultValue="Canara Bank" />
              <Input label="Account Number" defaultValue="****4521" readOnly />
              <Input label="IFSC Code" defaultValue="CNRB0001234" />
              <Input label="Account Type" defaultValue="Current" readOnly />
              <Input label="Annual Turnover" defaultValue="₹20 Crore+" />
              <Input label="Business Vintage (Years)" defaultValue="5" />
            </div>
            <Button className="mt-4" variant="outline" size="sm">Update Banking Details</Button>
          </CardContent>
        </Card>

        {/* Key Personnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User size={16} />Key Personnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Authorised Signatory</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Name" defaultValue="Jai Tripathi" />
                  <Input label="Role" defaultValue="Director" />
                  <Input label="Email" defaultValue="jai@postmacventures.com" />
                  <Input label="Mobile" defaultValue="+91 98765 43210" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Admin / Point of Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Name" defaultValue="Jai Tripathi" />
                  <Input label="Email" defaultValue="jai@postmacventures.com" />
                  <Input label="Mobile" defaultValue="+91 98765 43210" />
                </div>
              </div>
            </div>
            <Button className="mt-4">Save Changes</Button>
          </CardContent>
        </Card>

        {/* KYC Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText size={16} />KYC Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {KYC_DOCS.map((doc) => (
                <div key={doc.type} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-navy-800">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", doc.status === "COMPLETED" ? "bg-green-100 dark:bg-green-950" : "bg-gray-100 dark:bg-navy-800")}>
                      {doc.status === "COMPLETED" ? <CheckCircle2 size={14} className="text-green-600" /> : <Upload size={14} className="text-gray-400" />}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <KYCStatusBadge status={doc.status === "COMPLETED" ? "APPROVED" : "PENDING"} />
                    {doc.status === "PENDING" && (
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf" className="hidden" />
                        <span className="text-xs text-navy-600 dark:text-navy-300 font-medium hover:underline">Upload</span>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
