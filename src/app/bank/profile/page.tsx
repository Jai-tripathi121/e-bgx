"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Shield, Bell, Key, CheckCircle2, Upload, Save } from "lucide-react";
import toast from "react-hot-toast";

const BG_TYPES = ["PERFORMANCE", "FINANCIAL", "ADVANCE_PAYMENT", "BID_BOND", "CUSTOMS", "DEFERRED_PAYMENT"] as const;
const SECTORS = ["Infrastructure", "Defence", "Energy", "Real Estate", "Manufacturing", "IT & Telecom", "FMCG", "Exports", "Imports"];

export default function BankProfilePage() {
  const [saving, setSaving] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["PERFORMANCE", "FINANCIAL", "ADVANCE_PAYMENT"]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>(["Infrastructure", "Defence", "Energy"]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Profile updated successfully.");
    setSaving(false);
  };

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

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
          <Badge variant="success" className="ml-auto shrink-0">Active</Badge>
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
                  <Input label="Bank Name" defaultValue="Canara Bank" required />
                  <Input label="BSR Code" defaultValue="CNRB0001234" />
                  <Input label="IFSC Code" defaultValue="CNRB0001234" required />
                  <Input label="Branch Name" defaultValue="Parliament Street, New Delhi" />
                  <Input label="RBI Registration No." defaultValue="RBI/2024/CB/0012" />
                  <Input label="BG Desk Email" defaultValue="bg.desk@canarabank.com" type="email" required />
                  <Input label="BG Desk Phone" defaultValue="+91 11 2374 5678" type="tel" />
                  <Input label="Head Office Address" defaultValue="112, J.C. Road, Bangalore – 560002" />
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
                    J
                  </div>
                  <Button size="xs" variant="outline" icon={<Upload size={11} />}>Update Photo</Button>
                </div>
                <Input label="Officer Name" defaultValue="Jai – Canara Bank" required />
                <Input label="Designation" defaultValue="Senior Manager – BG Desk" />
                <Input label="Employee ID" defaultValue="CNB-2024-0091" />
                <Input label="Mobile" defaultValue="+91 98765 43210" type="tel" />
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
