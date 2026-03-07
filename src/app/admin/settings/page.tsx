"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Bell, Globe, Save, IndianRupee, CheckCircle2, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { getProcessingFee, setProcessingFee, ProcessingFeeSetting, getPlatformConfig, savePlatformConfig, PlatformConfig } from "@/lib/firestore";

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [saving, setSaving]         = useState(false);
  const [loadingFee, setLoadingFee] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [feeAmount, setFeeAmount]   = useState("");
  const [feeDesc, setFeeDesc]       = useState("Platform processing fee for BG issuance");
  const [feePayLink, setFeePayLink] = useState("");
  const [currentFee, setCurrentFee] = useState<ProcessingFeeSetting | null>(null);

  // Platform Config controlled state
  const [cfgPlatformName, setCfgPlatformName]       = useState("e-BGX");
  const [cfgPlatformUrl, setCfgPlatformUrl]         = useState("https://e-bgx.com");
  const [cfgMinAmount, setCfgMinAmount]             = useState("500000");
  const [cfgMaxValidity, setCfgMaxValidity]         = useState("60");
  const [cfgOfferWindow, setCfgOfferWindow]         = useState("7");

  useEffect(() => {
    getProcessingFee()
      .then((fee) => {
        if (fee) {
          setCurrentFee(fee);
          setFeeAmount(String(fee.amount));
          setFeeDesc(fee.description);
          setFeePayLink(fee.payment_link || "");
        }
      })
      .finally(() => setLoadingFee(false));

    getPlatformConfig()
      .then((cfg) => {
        if (cfg) {
          setCfgPlatformName(cfg.platform_name || "e-BGX");
          setCfgPlatformUrl(cfg.platform_url || "https://e-bgx.com");
          setCfgMinAmount(String(cfg.min_bg_amount || 500000));
          setCfgMaxValidity(String(cfg.max_validity_months || 60));
          setCfgOfferWindow(String(cfg.offer_response_days || 7));
        }
      })
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleSaveConfig = async () => {
    if (!profile?.uid) return;
    if (!cfgPlatformName.trim()) { toast.error("Platform name is required."); return; }
    const minAmt = Number(cfgMinAmount);
    const maxVal = Number(cfgMaxValidity);
    const offerWin = Number(cfgOfferWindow);
    if (isNaN(minAmt) || minAmt < 0) { toast.error("Invalid min BG amount."); return; }
    if (isNaN(maxVal) || maxVal < 1) { toast.error("Invalid max validity."); return; }
    if (isNaN(offerWin) || offerWin < 1) { toast.error("Invalid offer response window."); return; }
    setSavingConfig(true);
    try {
      await savePlatformConfig({
        platform_name: cfgPlatformName.trim(),
        platform_url: cfgPlatformUrl.trim(),
        min_bg_amount: minAmt,
        max_validity_months: maxVal,
        offer_response_days: offerWin,
      }, profile.uid);
      toast.success("Platform configuration saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveFee = async () => {
    if (!feeAmount || isNaN(Number(feeAmount)) || Number(feeAmount) < 0) {
      toast.error("Enter a valid fee amount."); return;
    }
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await setProcessingFee(Number(feeAmount), feeDesc, feePayLink, profile.uid);
      const updated = await getProcessingFee();
      setCurrentFee(updated);
      toast.success("Processing fee updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PortalHeader title="Platform Settings" subtitle="Configure global platform parameters" />
      <div className="portal-content space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Processing Fee */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee size={16} className="text-navy-500" />
                  Processing Fee (Charged to Applicants)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentFee && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        Current Fee: ₹{currentFee.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-green-600 dark:text-green-500 text-xs">{currentFee.description}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fee Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" min="0"
                      className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                      placeholder="e.g. 5000"
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      disabled={loadingFee}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <input
                      className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                      placeholder="Platform processing fee"
                      value={feeDesc}
                      onChange={(e) => setFeeDesc(e.target.value)}
                      disabled={loadingFee}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Link / Account Details
                    <span className="text-xs font-normal text-gray-400 ml-1">(UPI, Razorpay link, or NEFT details)</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 dark:border-navy-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                    placeholder="upi@bankname  or  https://rzp.io/l/...  or  IFSC + A/C details"
                    value={feePayLink}
                    onChange={(e) => setFeePayLink(e.target.value)}
                    disabled={loadingFee}
                  />
                </div>
                <Button icon={<Save size={14} />} onClick={handleSaveFee} loading={saving || loadingFee}>
                  Save Processing Fee
                </Button>
              </CardContent>
            </Card>

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
                  <Input
                    label="Platform Name"
                    value={cfgPlatformName}
                    onChange={(e) => setCfgPlatformName(e.target.value)}
                    disabled={loadingConfig}
                    required
                  />
                  <Input
                    label="Platform URL"
                    value={cfgPlatformUrl}
                    onChange={(e) => setCfgPlatformUrl(e.target.value)}
                    disabled={loadingConfig}
                  />
                  <Input
                    label="Min BG Amount (₹)"
                    type="number"
                    value={cfgMinAmount}
                    onChange={(e) => setCfgMinAmount(e.target.value)}
                    disabled={loadingConfig}
                    hint="₹5 Lakh minimum"
                  />
                  <Input
                    label="Max BG Validity (Months)"
                    type="number"
                    value={cfgMaxValidity}
                    onChange={(e) => setCfgMaxValidity(e.target.value)}
                    disabled={loadingConfig}
                  />
                  <Input
                    label="Offer Response Window (Days)"
                    type="number"
                    value={cfgOfferWindow}
                    onChange={(e) => setCfgOfferWindow(e.target.value)}
                    disabled={loadingConfig}
                    hint="Days banks get to quote"
                  />
                </div>
                <Button icon={<Save size={14} />} onClick={handleSaveConfig} loading={savingConfig || loadingConfig}>
                  Save Configuration
                </Button>
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
                    { event: "New BG Application",    channels: ["Email", "SMS"],             status: "Active" },
                    { event: "Processing Fee Due",     channels: ["Email", "WhatsApp"],       status: "Active" },
                    { event: "FD Payment Requested",   channels: ["Email", "SMS"],            status: "Active" },
                    { event: "Receipt Uploaded",       channels: ["Email"],                   status: "Active" },
                    { event: "BG Issued",              channels: ["Email", "SMS", "WhatsApp"],status: "Active" },
                    { event: "BG Expiry (30 days)",    channels: ["Email", "SMS"],            status: "Draft" },
                  ].map((n) => (
                    <div key={n.event} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-navy-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.event}</p>
                        <div className="flex gap-1 mt-1">
                          {n.channels.map((ch) => <span key={ch} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-navy-800 text-gray-500 rounded">{ch}</span>)}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={16} className="text-navy-500" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Force MFA for Banks",        on: true },
                  { label: "Force MFA for Admins",       on: true },
                  { label: "IP Allowlisting",            on: false },
                  { label: "Document Watermarking",      on: true },
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={16} className="text-navy-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  "Firebase Auth", "Firestore DB", "Firebase Storage", "Razorpay Gateway",
                ].map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{s}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <p className="text-xs font-medium text-green-600">Operational</p>
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
