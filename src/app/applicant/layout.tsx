"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PortalSidebar } from "@/components/shared/portal-sidebar";
import { useAuth } from "@/lib/auth-context";

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isCompleteProfilePage = pathname === "/applicant/complete-profile";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?portal=applicant");
      return;
    }
    if (profile?.role === "bank") {
      router.replace("/bank/dashboard");
      return;
    }
    if (profile?.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    // Redirect to complete-profile if profile is incomplete (and not already there)
    if (profile && profile.profileComplete === false && !isCompleteProfilePage) {
      router.replace("/applicant/complete-profile");
      return;
    }
  }, [user, profile, loading, router, isCompleteProfilePage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-950">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // For complete-profile page, render without sidebar (standalone layout)
  if (isCompleteProfilePage) {
    return <>{children}</>;
  }

  // Block non-complete-profile pages if profile is incomplete
  if (profile && profile.profileComplete === false) return null;

  return (
    <div className="portal-layout">
      <PortalSidebar
        portal="applicant"
        userName={profile?.displayName || user.email || "User"}
        entityName={profile?.companyName || ""}
      />
      <div className="portal-main">{children}</div>
    </div>
  );
}
