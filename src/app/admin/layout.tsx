import { PortalSidebar } from "@/components/shared/portal-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <PortalSidebar portal="admin" userName="Jai Tripathi" entityName="e-BGX Admin" />
      <main className="portal-main">{children}</main>
    </div>
  );
}
