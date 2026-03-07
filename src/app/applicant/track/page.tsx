"use client";
import { useState, useEffect } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { BGStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  subscribeToApplicantBGs, subscribeToBG, FirestoreBG,
} from "@/lib/firestore";
import { formatINR, formatDate } from "@/lib/utils";
import { Navigation, X, CheckCircle2, Clock, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

// ── Lifecycle step definitions ──────────────────────────────────────────────
const LIFECYCLE = [
  { key: "applied",        label: "Application Submitted",        actor: "Applicant" },
  { key: "fee_paid",       label: "Platform Fee Paid",            actor: "Applicant" },
  { key: "bank_quoting",   label: "Bank Quotes Received",         actor: "Banks" },
  { key: "offer_accepted", label: "Offer Accepted",               actor: "Applicant" },
  { key: "payment_req",    label: "FD / Margin Payment Requested", actor: "Bank" },
  { key: "fee_uploaded",   label: "Payment Receipt Uploaded",     actor: "Applicant" },
  { key: "verified",       label: "Payment Verified by Bank",     actor: "Bank" },
  { key: "draft",          label: "Draft BG Generated",           actor: "Bank" },
  { key: "approved",       label: "Draft BG Approved",            actor: "Applicant" },
  { key: "issued",         label: "Final BG Issued",              actor: "Bank" },
];

// ── Status rank — higher rank = further in pipeline ─────────────────────────
const STATUS_RANK: Record<string, number> = {
  OPEN:           0,
  QUOTED:         1,
  OFFER_ACCEPTED: 2,
  FD_REQUESTED:   3,
  FD_PAID:        4,
  BG_DRAFTING:    5,
  ISSUED:         6,
};

function getCompletedSteps(bg: FirestoreBG): string[] {
  const rank = STATUS_RANK[bg.status] ?? 0;
  const draftApproved = !!(bg as any).draft_bg_approved;
  const steps: string[] = [];

  // Always complete — BG exists means it was applied
  steps.push("applied");

  // Platform fee + bank quoting happen in QUOTED phase
  if (rank >= 1) { steps.push("fee_paid"); steps.push("bank_quoting"); }

  // Applicant accepted an offer
  if (rank >= 2) steps.push("offer_accepted");

  // Bank created payment / FD margin request
  if (rank >= 3) steps.push("payment_req");

  // Applicant uploaded proof (FD_PAID = bank approved the payment)
  if (rank >= 4) steps.push("fee_uploaded");

  // Bank verified payment → BG now in drafting stage
  if (rank >= 5) steps.push("verified");

  // Bank has uploaded the draft BG document
  if (rank >= 5) steps.push("draft");

  // Applicant approved the draft, OR BG is already issued
  if (rank >= 6 || (rank >= 5 && draftApproved)) steps.push("approved");

  // Final BG issued
  if (rank >= 6) steps.push("issued");

  return steps;
}

// ── Current active step (the one in progress right now) ──────────────────────
function getActiveStep(bg: FirestoreBG): string {
  const rank = STATUS_RANK[bg.status] ?? 0;
  const draftApproved = !!(bg as any).draft_bg_approved;

  if (rank === 0) return "applied";
  if (rank === 1) return "bank_quoting";
  if (rank === 2) return "payment_req";
  if (rank === 3) return "fee_uploaded";
  if (rank === 4) return "verified";
  if (rank === 5 && !draftApproved) return "approved";
  if (rank === 5 && draftApproved) return "issued";
  return "issued";
}

export default function TrackBGPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<FirestoreBG[]>([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [trackBG, setTrackBG]           = useState<FirestoreBG | null>(null);

  // ── Real-time BG list ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingData(true);
    const unsub = subscribeToApplicantBGs(user.uid, (data) => {
      setApplications(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoadingData(false);
    });
    return unsub;
  }, [user?.uid]);

  // ── Real-time selected BG in modal ────────────────────────────────────────
  useEffect(() => {
    if (!trackBG?.id) return;
    const unsub = subscribeToBG(trackBG.id, (bg) => {
      if (bg) setTrackBG(bg);
    });
    return unsub;
  }, [trackBG?.id]);

  if (loadingData) {
    return (
      <>
        <PortalHeader title="Track BG" subtitle="Real-time status tracker for all BG applications" />
        <div className="portal-content flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader title="Track BG" subtitle="Real-time status tracker for all BG applications" />
      <div className="portal-content space-y-6">

        {applications.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Applications Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Submit your first BG application to start tracking its progress here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
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
              {applications.map((bg) => (
                <TableRow key={bg.bg_id}>
                  <TableCell className="text-xs text-gray-400">{formatDate(bg.created_at)}</TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">#{bg.bg_id}</span>
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
        )}

        {/* Track Modal */}
        {trackBG && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setTrackBG(null)}
          >
            <div
              className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-950 rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Issuance Lifecycle</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">#{trackBG.bg_id} · {trackBG.beneficiary_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <BGStatusBadge status={trackBG.status} />
                  <button
                    onClick={() => setTrackBG(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="p-6 space-y-0">
                {LIFECYCLE.map((step, i) => {
                  const completed  = getCompletedSteps(trackBG);
                  const activeStep = getActiveStep(trackBG);
                  const isComplete = completed.includes(step.key);
                  const isActive   = !isComplete && step.key === activeStep;
                  const isLast     = i === LIFECYCLE.length - 1;

                  // Find matching audit trail entry
                  const auditEntry = trackBG.audit_trail?.find(
                    (e: any) =>
                      (step.key === "applied"        && e.event_type?.includes("SUBMITTED")) ||
                      (step.key === "fee_paid"        && e.event_type?.includes("PROCESSING_FEE")) ||
                      (step.key === "offer_accepted"  && e.event_type?.includes("OFFER_ACCEPTED")) ||
                      (step.key === "payment_req"     && e.event_type?.includes("FD_REQUESTED")) ||
                      (step.key === "fee_uploaded"    && e.event_type?.includes("FD_UPLOADED")) ||
                      (step.key === "verified"        && e.event_type?.includes("FD_VERIFIED")) ||
                      (step.key === "draft"           && e.event_type?.includes("DRAFT_BG_UPLOADED")) ||
                      (step.key === "approved"        && e.event_type?.includes("DRAFT_BG_APPROVED")) ||
                      (step.key === "issued"          && e.event_type?.includes("ISSUED"))
                  );

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "flex gap-4 pb-5 relative",
                        !isLast && "before:absolute before:left-3 before:top-7 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-white/10"
                      )}
                    >
                      {/* Step indicator */}
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 mt-0.5",
                          isComplete
                            ? "bg-black dark:bg-white"
                            : isActive
                            ? "bg-black dark:bg-white ring-4 ring-black/10 dark:ring-white/10"
                            : "bg-gray-100 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 size={12} className="text-white dark:text-black" />
                        ) : isActive ? (
                          <div className="w-2 h-2 bg-white dark:bg-black rounded-full animate-pulse" />
                        ) : (
                          <Clock size={11} className="text-gray-300 dark:text-white/20" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium",
                            isComplete
                              ? "text-gray-900 dark:text-white"
                              : isActive
                              ? "text-black dark:text-white font-semibold"
                              : "text-gray-300 dark:text-white/25"
                          )}>
                            {step.label}
                            {isActive && (
                              <span className="ml-2 text-[10px] font-semibold bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 rounded-full">
                                IN PROGRESS
                              </span>
                            )}
                          </p>
                          {auditEntry && isComplete && (
                            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                              {formatDate(auditEntry.timestamp, "relative")}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-xs mt-0.5",
                          isComplete || isActive
                            ? "text-gray-400 dark:text-white/40"
                            : "text-gray-200 dark:text-white/15"
                        )}>
                          {auditEntry && isComplete
                            ? `By ${auditEntry.actor}`
                            : step.actor}
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
