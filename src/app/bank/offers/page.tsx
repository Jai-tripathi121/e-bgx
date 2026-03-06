"use client";
import { PortalHeader } from "@/components/shared/portal-header";
import { OfferStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { mockBGApplications } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";

export default function BankOffersPage() {
  const allOffers = mockBGApplications.flatMap((bg) =>
    bg.offers.map((o) => ({
      ...o,
      applicant_name: bg.applicant_name,
      bg_amount: bg.amount_inr,
    })),
  );

  return (
    <>
      <PortalHeader title="Offer Status Tracker" subtitle="Track all submitted commercial offers and their acceptance status" />
      <div className="portal-content">
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Sent On</TableHeader>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Applicant</TableHeader>
              <TableHeader>BG Amount</TableHeader>
              <TableHeader>Comm. Rate</TableHeader>
              <TableHeader>Valid Till</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Action</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {allOffers.map((offer) => (
              <TableRow key={offer.offer_id}>
                <TableCell className="text-xs text-gray-400">{formatDate(offer.submitted_at)}</TableCell>
                <TableCell><span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{offer.bg_id}</span></TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900 dark:text-white max-w-[160px] truncate block">{offer.applicant_name}</span>
                </TableCell>
                <TableCell><span className="font-semibold tabular">{formatINR(offer.bg_amount, true)}</span></TableCell>
                <TableCell><span className="font-semibold">{offer.commission_rate}% p.a.</span></TableCell>
                <TableCell className="text-xs text-gray-500">{formatDate(offer.valid_till)}</TableCell>
                <TableCell><OfferStatusBadge status={offer.status} /></TableCell>
                <TableCell>
                  <Button size="xs" variant="ghost" icon={<Eye size={12} />}>View Term Sheet</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
