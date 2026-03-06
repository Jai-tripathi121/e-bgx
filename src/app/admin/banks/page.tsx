"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { mockBanks, mockBGApplications } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Building2, CheckCircle2, XCircle, Eye, Shield, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { BankPartner } from "@/types";

const PENDING_BANKS = [
  { id: "bank-pending-1", name: "Axis Bank Ltd", branch_code: "UTIB0001234", address: "Nariman Point, Mumbai", submitted: new Date("2026-03-04"), documents: "Uploaded", officer: "Priya Sharma" },
  { id: "bank-pending-2", name: "IndusInd Bank", branch_code: "INDB0000987", address: "Connaught Place, Delhi", submitted: new Date("2026-03-05"), documents: "Partial", officer: "Rahul Mehta" },
];

export default function AdminBanksPage() {
  const [selectedBank, setSelectedBank] = useState<BankPartner | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (id: string, name: string) => {
    setLoading(`approve-${id}`);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success(`${name} approved and activated.`);
    setLoading(null);
  };

  const handleReject = async (id: string, name: string) => {
    setLoading(`reject-${id}`);
    await new Promise((r) => setTimeout(r, 800));
    toast.error(`${name} registration rejected.`);
    setLoading(null);
  };

  const getBankStats = (bankId: string) => {
    const bgs = mockBGApplications.filter((bg) => bg.accepted_bank_id === bankId);
    const issued = bgs.filter((bg) => bg.status === "ISSUED").length;
    return { bgsIssued: issued, total: bgs.length };
  };

  if (selectedBank) {
    const stats = getBankStats(selectedBank.bank_id);
    return (
      <>
        <PortalHeader title="Bank Detail" subtitle={selectedBank.bank_name} />
        <div className="portal-content space-y-6">
          <button onClick={() => setSelectedBank(null)} className="text-sm text-navy-600 dark:text-navy-300 hover:underline">← Back to Banks</button>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle>Institution Profile</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Bank Name", selectedBank.bank_name],
                      ["Branch Code / IFSC", selectedBank.branch_code],
                      ["Address", selectedBank.address],
                      ["Branch Email", selectedBank.branch_email],
                      ["Officer", `${selectedBank.officer_name} (${selectedBank.officer_designation})`],
                      ["Officer Mobile", selectedBank.officer_mobile],
                      ["Status", selectedBank.status],
                      ["Member Since", formatDate(selectedBank.member_since)],
                    ].map(([k, v]) => (
                      <div key={k} className="border-b border-gray-50 dark:border-navy-800 pb-2.5">
                        <p className="text-xs text-gray-400">{k}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Performance Stats</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      ["BGs Issued", stats.bgsIssued],
                      ["Total BGs", stats.total],
                      ["Success Rate", stats.total > 0 ? `${Math.round((stats.bgsIssued / stats.total) * 100)}%` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="text-center p-3 bg-gray-50 dark:bg-navy-800 rounded-xl">
                        <p className="text-2xl font-black text-navy-900 dark:text-white">{v}</p>
                        <p className="text-xs text-gray-500 mt-1">{k}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield size={15} className="text-navy-500" />Compliance</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { doc: "RBI License", status: "Verified" },
                    { doc: "Board Authorization", status: "Verified" },
                    { doc: "KYC Documents", status: "Verified" },
                    { doc: "BG Policy Document", status: "Pending" },
                  ].map((d) => (
                    <div key={d.doc} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-navy-800 last:border-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{d.doc}</p>
                      <Badge variant={d.status === "Verified" ? "success" : "warning"} size="sm">{d.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  <Button variant="outline" size="sm" className="w-full">Suspend Bank</Button>
                  <Button variant="outline" size="sm" className="w-full">Reset API Key</Button>
                  <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-600">Remove from Platform</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="Bank Management" subtitle="Onboard, verify, and manage all partner banks" />
      <div className="portal-content space-y-6">

        {PENDING_BANKS.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Pending Bank Approvals
                <Badge variant="warning">{PENDING_BANKS.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PENDING_BANKS.map((pb) => (
                  <div key={pb.id} className="flex items-center gap-4 p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl">
                    <Building2 size={18} className="text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{pb.name}</p>
                      <p className="text-xs text-gray-500">{pb.address} • Officer: {pb.officer}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(pb.submitted, "relative")} • Docs: {pb.documents}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="xs" variant="success" icon={<CheckCircle2 size={11} />} loading={loading === `approve-${pb.id}`} onClick={() => handleApprove(pb.id, pb.name)}>Approve</Button>
                      <Button size="xs" variant="danger" icon={<XCircle size={11} />} loading={loading === `reject-${pb.id}`} onClick={() => handleReject(pb.id, pb.name)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Active Bank Partners</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Bank</TableHeader>
                  <TableHeader>Branch Code</TableHeader>
                  <TableHeader>Contact</TableHeader>
                  <TableHeader>Officer</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Member Since</TableHeader>
                  <TableHeader>Action</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {mockBanks.map((bank) => (
                  <TableRow key={bank.bank_id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-navy-100 dark:bg-navy-800 flex items-center justify-center">
                          <Building2 size={14} className="text-navy-600 dark:text-navy-300" />
                        </div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{bank.bank_name}</p>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs font-mono text-gray-600 dark:text-gray-300">{bank.branch_code}</code></TableCell>
                    <TableCell className="text-xs text-gray-500">{bank.branch_email}</TableCell>
                    <TableCell className="text-xs">{bank.officer_name}</TableCell>
                    <TableCell><Badge variant={bank.status === "ACTIVE" ? "success" : "warning"}>{bank.status}</Badge></TableCell>
                    <TableCell className="text-xs text-gray-400">{formatDate(bank.member_since)}</TableCell>
                    <TableCell>
                      <Button size="xs" icon={<Eye size={12} />} onClick={() => setSelectedBank(bank)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
