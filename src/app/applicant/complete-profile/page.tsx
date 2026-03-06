"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/firestore";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { Building2, User, FileText, MapPin, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function CompleteProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyName: profile?.companyName || "",
    pan: profile?.pan || "",
    gstin: profile?.gstin || "",
    cin: profile?.cin || "",
    mobile: profile?.mobile || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    pincode: profile?.pincode || "",
  });

  const update = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.companyName || !form.pan || !form.mobile) {
      toast.error("Company name, PAN, and mobile are required.");
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        companyName: form.companyName,
        displayName: form.companyName,
        pan: form.pan,
        gstin: form.gstin,
        cin: form.cin,
        mobile: form.mobile,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        profileComplete: true,
        kycStatus: "PENDING",
      });
      await refreshProfile();
      toast.success("Profile submitted! Awaiting KYC approval from admin.");
      router.push("/applicant/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo variant="dark" size="md" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill in your company details to continue. An admin will verify your KYC before you can apply for BGs.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">!</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Profile Incomplete</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Complete the form below to unlock BG applications</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-200 dark:border-navy-700 shadow-sm p-6 space-y-6">

          {/* Company Identity */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-navy-800">
              <Building2 size={15} className="text-navy-600 dark:text-navy-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Company Identity</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Legal Company Name"
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  placeholder="POSTMAC VENTURES PVT LTD"
                  required
                />
              </div>
              <Input
                label="Company PAN"
                value={form.pan}
                onChange={(e) => update("pan", e.target.value.toUpperCase())}
                placeholder="AABCP1234C"
                required
                hint="10-character PAN as on MCA records"
              />
              <Input
                label="GST Number (GSTIN)"
                value={form.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                placeholder="27AABCP1234C1Z5"
              />
              <div className="col-span-2">
                <Input
                  label="CIN Number"
                  value={form.cin}
                  onChange={(e) => update("cin", e.target.value)}
                  placeholder="U12345MH2020PTC123456"
                  hint="Optional — Certificate of Incorporation Number"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-navy-800">
              <User size={15} className="text-navy-600 dark:text-navy-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Contact Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Mobile Number"
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-navy-800">
              <MapPin size={15} className="text-navy-600 dark:text-navy-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Registered Address</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Textarea
                  label="Street Address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Plot 45, Industrial Area Phase II"
                  rows={2}
                />
              </div>
              <Input
                label="City"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Mumbai"
              />
              <Input
                label="State"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="Maharashtra"
              />
              <Input
                label="PIN Code"
                value={form.pincode}
                onChange={(e) => update("pincode", e.target.value)}
                placeholder="400001"
              />
            </div>
          </div>

          {/* KYC Note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <FileText size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <p className="font-semibold mb-0.5">KYC Verification Required</p>
              <p>After submitting, an e-BGX admin will review your details and activate your account within 1–2 business days. You will be notified once approved.</p>
            </div>
          </div>

          <Button type="submit" className="w-full" size="md" loading={loading} icon={<CheckCircle2 size={15} />}>
            Submit Profile for KYC Review
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Having trouble? Email{" "}
          <a href="mailto:support@e-bgx.com" className="text-navy-600 dark:text-navy-300 hover:underline">
            support@e-bgx.com
          </a>
        </p>
      </div>
    </div>
  );
}
