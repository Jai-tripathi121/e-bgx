"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KYCStatusBadge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ExternalLink, User, Building2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/firestore";
import toast from "react-hot-toast";

export default function ApplicantProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [contact, setContact] = useState({
    displayName: profile?.displayName || "",
    mobile: profile?.mobile || "",
  });

  const handleSaveContact = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: contact.displayName,
        mobile: contact.mobile,
      });
      await refreshProfile();
      toast.success("Contact details saved.");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // KYC status helpers
  const kycStatus = profile?.kycStatus || "PENDING";
  const profileComplete = profile?.profileComplete ?? false;

  const kycBanner = () => {
    if (!profileComplete) {
      return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Profile Incomplete</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Complete your profile to enable KYC verification.</p>
          </div>
          <Button size="sm" onClick={() => router.push("/applicant/complete-profile")}>
            Complete Profile
          </Button>
        </div>
      );
    }
    if (kycStatus === "APPROVED") {
      return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <CheckCircle2 size={20} className="text-green-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Profile Active</p>
            <p className="text-xs text-green-600 dark:text-green-400">KYC verified — you can apply for BGs.</p>
          </div>
          <KYCStatusBadge status="APPROVED" />
        </div>
      );
    }
    if (kycStatus === "REJECTED") {
      return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <XCircle size={20} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 dark:text-red-300 text-sm">KYC Rejected</p>
            <p className="text-xs text-red-600 dark:text-red-400">Your KYC was not approved. Please contact admin.</p>
          </div>
          <KYCStatusBadge status="REJECTED" />
        </div>
      );
    }
    // PENDING
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

  return (
    <>
      <PortalHeader title="Profile & Settings" subtitle="Manage your company KYC and account details" />
      <div className="portal-content space-y-6 max-w-3xl mx-auto">

        {/* KYC Status Widget */}
        {kycBanner()}

        {/* Company Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 size={16} />Company Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Legal Company Name"
                  value={profile?.companyName || "—"}
                  readOnly
                />
              </div>
              <Input
                label="GST Number (GSTIN)"
                value={profile?.gstin || "—"}
                readOnly
              />
              <Input
                label="Company PAN"
                value={profile?.pan || "—"}
                readOnly
              />
              <Input
                label="CIN Number"
                value={profile?.cin || "—"}
                readOnly
              />
              <Input
                label="Email"
                value={profile?.email || "—"}
                readOnly
              />
              {(profile?.address || profile?.city) && (
                <div className="col-span-2">
                  <Input
                    label="Registered Address"
                    value={[profile?.address, profile?.city, profile?.state, profile?.pincode].filter(Boolean).join(", ") || "—"}
                    readOnly
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

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User size={16} />Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Display Name"
                  value={contact.displayName}
                  onChange={(e) => setContact((c) => ({ ...c, displayName: e.target.value }))}
                  placeholder="Your name or company contact name"
                />
              </div>
              <Input
                label="Mobile Number"
                value={contact.mobile}
                onChange={(e) => setContact((c) => ({ ...c, mobile: e.target.value }))}
                placeholder="+91 98765 43210"
              />
              <Input
                label="Email"
                value={profile?.email || ""}
                readOnly
                hint="Email cannot be changed"
              />
            </div>
            <Button className="mt-4" onClick={handleSaveContact} loading={saving}>
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Role</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{profile?.role || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">KYC Status</p>
                <KYCStatusBadge status={kycStatus as any} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Profile Complete</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profileComplete ? "Yes" : "No"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
