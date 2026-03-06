"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalSidebar } from "@/components/shared/portal-sidebar";
import { useAuth } from "@/lib/auth-context";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?portal=bank");
    if (!loading && user && profile?.role === "applicant") router.replace("/applicant/dashboard");
    if (!loading && user && profile?.role === "admin") router.replace("/admin/dashboard");
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-950">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="portal-layout">
      <PortalSidebar
        portal="bank"
        userName={profile?.displayName || user.email || "User"}
        entityName={profile?.bankName ? `${profile.bankName} – BG Desk` : ""}
      />
      <div className="portal-main">{children}</div>
    </div>
  );
}
