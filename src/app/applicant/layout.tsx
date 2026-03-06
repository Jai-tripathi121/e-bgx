import { PortalSidebar } from "@/components/shared/portal-sidebar";

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <PortalSidebar portal="applicant" userName="Jai Tripathi" entityName="POSTMAC VENTURES PVT LTD" />
      <div className="portal-main">
        {children}
      </div>
    </div>
  );
}
