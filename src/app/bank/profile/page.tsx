"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Shield, Bell, Key, CheckCircle2, Upload, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/firestore";

const BG_TYPES = ["PERFORMANCE", "FINANCIAL", "ADVANCE_PAYMENT", "BID_BOND", "CUSTOMS", "DEFERRED_PAYMENT"] as const;
const SECTORS = ["Infrastructure", "Defence", "Energy", "Real Estate", "Manufacturing", "IT & Telecom", "FMCG", "Exports", "Imports"];

export default function BankProfilePage() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
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

  // Populate form from profile once loaded
  useEffect(() => {
    if (!profile) return;
    setForm({
      bankName: (profile as any).bankName ?? "",
      branchCode: (profile as any).branchCode ?? "",
      branchEmail: (profile as any).branchEmail ?? profile.email ?? "",
      address: (profile as any).address ?? "",
      officerName: (profile as any).officerName ?? profile.displayName ?? "",
      officerDesignation: (profile as any).officerDesignation ?? "",
      officerMobile: (profile as any).officerMobile ?? profile.mobile ?? "",
    });
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

  return (
    <>
      <PortalHeader
        title="Bank Profile & Settings"
        subtitle="Manage your institution details, preferences, and notifications"
        actions={
          <Button icon={<Save size={14} />} onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        }
      />
      <div className="portal-content space-y-6">

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
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Min Commission Rate (%)" defaultValue="1.25" type="number" hint="Per annum" />
                  <Input label="Max Commission Rate (%)" defaultValue="2.50" type="number" />
                  <Input label="Default FD Margin (%)" defaultValue="100" type="number" hint="% of BG amount" />
                  <Input label="Min BG Amount (₹)" defaultValue="5000000" type="number" hint="₹50 L" />
                  <Input label="Max BG Amount (₹)" defaultValue="500000000" type="number" hint="₹50 Cr" />
                  <Input label="Max Validity (Months)" defaultValue="36" type="number" />
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
      </div>
    </>
  );
}
