"use client";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { getApplicantBGs, FirestoreBG } from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { Download, Eye, Award, Inbox } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function IssuedBGsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    getApplicantBGs(user.uid)
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoadingData(false));
  }, [user]);

  const issued = applications.filter((b) => b.status === "ISSUED" || b.status === "AMENDED");

  if (loadingData) {
    return (
      <>
        <PortalHeader title="Issued BGs" subtitle="Consolidated registry of all issued bank guarantees" />
        <div className="portal-content flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader
        title="Issued BGs"
        subtitle="Consolidated registry of all issued bank guarantees"
        actions={
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <Award size={14} className="text-green-500" />
            {issued.length} Active BG{issued.length !== 1 ? "s" : ""}
          </span>
        }
      />
      <div className="portal-content space-y-6">

        {issued.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Issued BGs</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Issued bank guarantees will appear here once a bank completes the issuance process.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Issue Date</TableHeader>
                <TableHeader>BG Number</TableHeader>
                <TableHeader>Beneficiary</TableHeader>
                <TableHeader>Issuing Bank</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Expiry Date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {issued.map((bg) => {
                const daysToExpiry = bg.expiry_date
                  ? Math.ceil((new Date(bg.expiry_date).getTime() - Date.now()) / 86400000)
                  : null;

                return (
                  <TableRow key={bg.bg_id}>
                    <TableCell className="text-xs text-gray-400">{bg.issued_at ? formatDate(bg.issued_at) : "—"}</TableCell>
                    <TableCell>
                      <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">{bg.official_bg_number || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{bg.beneficiary_name}</p>
                        <p className="text-xs text-gray-400">{bg.tender_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>{bg.accepted_bank_name || "—"}</TableCell>
                    <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{bg.expiry_date ? formatDate(bg.expiry_date) : "—"}</p>
                        {daysToExpiry !== null && daysToExpiry <= 30 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Expires in {daysToExpiry}d</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" dot>Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="xs" variant="outline" icon={<Eye size={12} />}>Details</Button>
                        <Button size="xs" variant="primary" icon={<Download size={12} />}>Download</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
