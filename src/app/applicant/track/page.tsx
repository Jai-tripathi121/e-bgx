"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { Navigation, X, CheckCircle2, Clock } from "lucide-react";
import { BGApplication } from "@/types";
import { cn } from "@/lib/utils";

const LIFECYCLE = [
  { key: "applied",        label: "Application Submitted",   actor: "Applicant" },
  { key: "fee_paid",       label: "Platform Fee Paid",        actor: "Applicant" },
  { key: "bank_quoting",   label: "Bank Quotes Received",     actor: "Banks" },
  { key: "offer_accepted", label: "Offer Accepted",           actor: "Applicant" },
  { key: "payment_req",    label: "Payment Requested",        actor: "Bank" },
  { key: "fee_uploaded",   label: "BG Fee & FD Proof Uploaded", actor: "Applicant" },
  { key: "verified",       label: "Fees & FD Verified",       actor: "Bank" },
  { key: "draft",          label: "Draft BG Generated",       actor: "Bank" },
  { key: "approved",       label: "Draft Approved",           actor: "Applicant" },
  { key: "issued",         label: "Final BG Issued",          actor: "Bank" },
];

function getCompletedSteps(bg: BGApplication): string[] {
  const base = ["applied", "fee_paid", "bank_quoting"];
  if (bg.status === "OFFER_ACCEPTED" || bg.status === "IN_PROGRESS" || bg.status === "PROCESSING" || bg.status === "PAYMENT_CONFIRMED" || bg.status === "ISSUED") {
    base.push("offer_accepted", "payment_req", "fee_uploaded", "verified");
  }
  if (bg.status === "ISSUED") {
    base.push("draft", "approved", "issued");
  }
  return base;
}

export default function TrackBGPage() {
  const [trackBG, setTrackBG] = useState<BGApplication | null>(null);

  return (
    <>
      <PortalHeader title="Track BG" subtitle="Real-time status tracker for all BG applications" />
      <div className="portal-content space-y-6">
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Date</TableHeader>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Beneficiary</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Offers</TableHeader>
              <TableHeader>Action</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {mockBGApplications.map((bg) => (
              <TableRow key={bg.bg_id}>
                <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                <TableCell>
                  <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{bg.bg_id}</span>
                </TableCell>
                <TableCell>{bg.beneficiary_name}</TableCell>
                <TableCell><span className="font-semibold tabular">{formatINR(bg.amount_inr, true)}</span></TableCell>
                <TableCell><BGStatusBadge status={bg.status} /></TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {bg.offers.length} Quote{bg.offers.length !== 1 ? "s" : ""}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="xs" icon={<Navigation size={12} />} onClick={() => setTrackBG(bg)}>Track</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Track Modal */}
        {trackBG && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setTrackBG(null)}>
            <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between sticky top-0 bg-white dark:bg-navy-900 rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Issuance Lifecycle</h2>
                  <p className="text-sm text-gray-500">#{trackBG.bg_id} · {trackBG.beneficiary_name}</p>
                </div>
                <button onClick={() => setTrackBG(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors text-gray-500">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-0">
                {LIFECYCLE.map((step, i) => {
                  const completed = getCompletedSteps(trackBG);
                  const isComplete = completed.includes(step.key);
                  const isLast = i === LIFECYCLE.length - 1;
                  const auditEvent = trackBG.audit_trail[i];

                  return (
                    <div key={step.key} className={cn("flex gap-4 pb-4 relative", !isLast ? "before:absolute before:left-3 before:top-7 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-navy-800" : "")}>
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 mt-0.5", isComplete ? "bg-green-500" : "bg-gray-100 dark:bg-navy-800 border-2 border-gray-200 dark:border-navy-700")}>
                        {isComplete ? <CheckCircle2 size={12} className="text-white" /> : <Clock size={11} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 pt-0">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-sm font-medium", isComplete ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500")}>
                            {step.label}
                          </p>
                          {auditEvent && isComplete && (
                            <span className="text-xs text-gray-400">{formatDate(auditEvent.timestamp, "relative")}</span>
                          )}
                        </div>
                        <p className={cn("text-xs mt-0.5", isComplete ? "text-gray-400" : "text-gray-300 dark:text-gray-600")}>
                          {auditEvent && isComplete ? `By ${auditEvent.actor}` : step.actor}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
