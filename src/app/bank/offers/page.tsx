"use client";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { OfferStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getBankOffers, BankOffer } from "@/lib/firestore";

export default function BankOffersPage() {
  const { profile } = useAuth();
  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    getBankOffers(profile.uid)
      .then(setOffers)
      .finally(() => setLoading(false));
  }, [profile?.uid]);

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
            {loading ? (
              <TableEmpty message="Loading offers…" />
            ) : offers.length === 0 ? (
              <TableEmpty message="No offers submitted yet" />
            ) : (
              offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="text-xs text-gray-400">{formatDate(offer.submitted_at)}</TableCell>
                  <TableCell><span className="font-mono font-semibold text-navy-700 dark:text-navy-200">#{offer.offer_id}</span></TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
