"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, FileText, Inbox, CheckSquare, CreditCard, Award,
  Navigation, RefreshCw, User, BarChart3, Settings, Building2,
  ChevronRight, LogOut, Bell, HelpCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface PortalSidebarProps {
  portal: "applicant" | "bank" | "admin";
  userName?: string;
  entityName?: string;
}

const applicantNav: NavItem[] = [
  { label: "Dashboard",       href: "/applicant/dashboard",  icon: <LayoutDashboard size={16} /> },
  { label: "Apply New BG",    href: "/applicant/apply",       icon: <FileText size={16} /> },
  { label: "Offers Inbox",    href: "/applicant/offers",      icon: <Inbox size={16} /> },
  { label: "Active BGs",      href: "/applicant/issuance",    icon: <CheckSquare size={16} /> },
  { label: "Track BG",        href: "/applicant/track",       icon: <Navigation size={16} /> },
  { label: "Issued BGs",      href: "/applicant/issued",      icon: <Award size={16} /> },
  { label: "Payments",        href: "/applicant/payments",    icon: <CreditCard size={16} /> },
  { label: "Renewals",        href: "/applicant/renewals",    icon: <RefreshCw size={16} /> },
  { label: "Profile",         href: "/applicant/profile",     icon: <User size={16} /> },
];

const bankNav: NavItem[] = [
  { label: "Dashboard",       href: "/bank/dashboard",        icon: <LayoutDashboard size={16} /> },
  { label: "BG Requests",     href: "/bank/requests",         icon: <Inbox size={16} /> },
  { label: "Offer Tracker",   href: "/bank/offers",           icon: <CheckSquare size={16} /> },
  { label: "Issuance Desk",   href: "/bank/issuance",         icon: <FileText size={16} /> },
  { label: "Payments",        href: "/bank/payments",         icon: <CreditCard size={16} /> },
  { label: "Analytics",       href: "/bank/analytics",        icon: <BarChart3 size={16} /> },
  { label: "Bank Profile",    href: "/bank/profile",          icon: <Building2 size={16} /> },
];

const adminNav: NavItem[] = [
  { label: "Dashboard",       href: "/admin/dashboard",       icon: <LayoutDashboard size={16} /> },
  { label: "Banks",           href: "/admin/banks",           icon: <Building2 size={16} /> },
  { label: "Applicants",      href: "/admin/applicants",      icon: <User size={16} /> },
  { label: "Issuance Monitor",href: "/admin/issuance",        icon: <FileText size={16} /> },
  { label: "Transactions",    href: "/admin/transactions",    icon: <CreditCard size={16} /> },
  { label: "Settings",        href: "/admin/settings",        icon: <Settings size={16} /> },
];

const navMap = { applicant: applicantNav, bank: bankNav, admin: adminNav };

const portalLabels = {
  applicant: "Applicant Portal",
  bank:      "Bank Portal",
  admin:     "Admin Portal",
};

export function PortalSidebar({ portal, userName = "User", entityName = "" }: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const navItems = navMap[portal];

  const handleLogout = async () => {
    await logout();
    router.push("/login?portal=" + portal);
  };

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-navy-900 dark:bg-navy-950 border-r border-navy-800 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-navy-800">
        <Link href={`/${portal}/dashboard`}>
          <Logo variant="light" size="sm" />
        </Link>
        <p className="text-[10px] text-navy-400 mt-1 font-medium uppercase tracking-wider">
          {portalLabels[portal]}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-navy-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className={cn("shrink-0 transition-colors", isActive ? "text-white" : "text-navy-400 group-hover:text-white")}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="bg-navy-700 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={12} className="text-navy-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user area */}
      <div className="px-3 pb-4 space-y-1 border-t border-navy-800 pt-3">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-navy-300 hover:bg-white/5 hover:text-white text-sm transition-all">
          <Bell size={16} className="text-navy-400" />
          <span>Notifications</span>
        </button>
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-navy-300 hover:bg-white/5 hover:text-white text-sm transition-all">
          <HelpCircle size={16} className="text-navy-400" />
          <span>Help & Support</span>
        </button>

        <div className="mt-2 px-3 py-3 rounded-lg bg-navy-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-navy-400 truncate">{entityName}</p>
            </div>
            <button onClick={handleLogout} className="text-navy-400 hover:text-white transition-colors" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
