"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Bell, CreditCard, Settings, Key, Globe, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    toast.success("Platform settings saved.");
    setSaving(false);
  };

  return (
    <>
      <PortalHeader
        title="Platform Settings"
        subtitle="Configure global platform parameters and integrations"
        actions={
          <Button icon={<Save size={14} />} onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        }
      />
      <div className="portal-content space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Platform Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={16} className="text-navy-500" />
                  Platform Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Platform Name" defaultValue="e-BGX" required />
                  <Input label="Platform URL" defaultValue="https://e-bgx.com" />
                  <Input label="Applicant Portal URL" defaultValue="https://applicant.e-bgx.com" />
                  <Input label="Bank Portal URL" defaultValue="https://bank.e-bgx.com" />
                  <Input label="Platform Fee (%)" defaultValue="1" type="number" hint="% of BG amount (currently 1%)" required />
                  <Input label="Min BG Amount (₹)" defaultValue="500000" type="number" hint="₹5 Lakh minimum" />
                  <Input label="Max BG Validity (Months)" defaultValue="60" type="number" />
                  <Input label="Offer Response Window (Days)" defaultValue="7" type="number" hint="Days banks get to quote" />
                </div>
              </CardContent>
            </Card>

            {/* Payment Gateway */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={16} className="text-navy-500" />
                  Payment Gateway (Razorpay)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Razorpay Key ID" defaultValue="rzp_live_••••••••••" />
                  <Input label="Razorpay Key Secret" defaultValue="••••••••••••••••" type="password" />
                  <Input label="Webhook Secret" defaultValue="wh_••••••••••" />
                  <Input label="Settlement Account IFSC" defaultValue="CNRB0001234" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-green-600 font-medium">Razorpay Connected — Live Mode</p>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={16} className="text-navy-500" />
                  Notification Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { event: "New BG Application", channels: ["Email", "SMS"], status: "Active" },
                    { event: "Platform Fee Due", channels: ["Email", "WhatsApp"], status: "Active" },
                    { event: "Offer Received", channels: ["Email"], status: "Active" },
                    { event: "BG Issued", channels: ["Email", "SMS", "WhatsApp"], status: "Active" },
                    { event: "BG Expiry (30 days)", channels: ["Email", "SMS"], status: "Draft" },
                    { event: "BG Expiry (7 days)", channels: ["Email", "SMS", "WhatsApp"], status: "Draft" },
                  ].map((n) => (
                    <div key={n.event} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-navy-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.event}</p>
                        <div className="flex gap-1 mt-1">
                          {n.channels.map((ch) => (
                            <span key={ch} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-navy-800 text-gray-500 rounded">{ch}</span>
                          ))}
                        </div>
                      </div>
                      <Badge variant={n.status === "Active" ? "success" : "warning"} size="sm">{n.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="space-y-6">
            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={16} className="text-navy-500" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Force MFA for Banks", on: true },
                  { label: "Force MFA for Admins", on: true },
                  { label: "IP Allowlisting", on: false },
                  { label: "Document Watermarking", on: true },
                  { label: "Audit Log Retention (365d)", on: true },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{s.label}</p>
                    <button className={`w-9 h-5 rounded-full transition-colors ${s.on ? "bg-navy-900 dark:bg-navy-600" : "bg-gray-200 dark:bg-navy-700"} relative`}>
                      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${s.on ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key size={16} className="text-navy-500" />
                  API Keys
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Canara Bank", key: "cbk_live_••••••3f1a", created: "Jan 15, 2026" },
                  { name: "HDFC Bank", key: "hdfc_live_••••••8c2b", created: "Feb 03, 2026" },
                ].map((k) => (
                  <div key={k.name} className="p-3 bg-gray-50 dark:bg-navy-800 rounded-xl">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{k.name}</p>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">{k.key}</p>
                    <div className="flex justify-between items-center mt-1.5">
                      <p className="text-[10px] text-gray-400">Created {k.created}</p>
                      <button className="text-[10px] text-red-500 hover:text-red-600 font-medium">Revoke</button>
                    </div>
                  </div>
                ))}
                <Button size="xs" variant="outline" className="w-full">Generate New Key</Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={16} className="text-navy-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { service: "Firebase Auth", status: "Operational" },
                  { service: "Firestore DB", status: "Operational" },
                  { service: "Firebase Storage", status: "Operational" },
                  { service: "Razorpay Gateway", status: "Operational" },
                  { service: "Email (SendGrid)", status: "Degraded" },
                ].map((s) => (
                  <div key={s.service} className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{s.service}</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === "Operational" ? "bg-green-500" : "bg-amber-500"}`} />
                      <p className={`text-xs font-medium ${s.status === "Operational" ? "text-green-600" : "text-amber-600"}`}>{s.status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}
