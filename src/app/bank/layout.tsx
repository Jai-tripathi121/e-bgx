import { PortalSidebar } from "@/components/shared/portal-sidebar";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <PortalSidebar portal="bank" userName="Jai" entityName="Canara Bank – BG Desk" />
      <div className="portal-main">
        {children}
      </div>
    </div>
  );
}
