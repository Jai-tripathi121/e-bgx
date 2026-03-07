"use client";
import { useState } from "react";
import { PortalHeader } from "@/components/shared/portal-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle, Loader2, Database, Trash2 } from "lucide-react";

type LogLine = { ok: boolean; msg: string };

export default function SeedPage() {
  const { user, profile } = useAuth();
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);

  const addLog = (ok: boolean, msg: string) =>
    setLog((prev) => [...prev, { ok, msg }]);

  const handleSeed = async () => {
    if (!user || !profile) return toast.error("Not signed in.");
    setRunning(true);
    setLog([]);

    try {
      // ── Find bank user ──────────────────────────────────────────────────────
      addLog(true, "Looking for bank user…");
      let bankUid  = "";
      let bankName = "";
      const bankSnap = await getDocs(query(collection(db, "users"), where("role", "==", "bank")));
      if (!bankSnap.empty) {
        const bd = bankSnap.docs[0].data();
        bankUid  = bankSnap.docs[0].id;
        bankName = bd.bankName ?? bd.displayName ?? "HDFC Bank";
        addLog(true, `Bank found: ${bankName} (${bankUid})`);
      } else {
        addLog(false, "No bank user found — issuance/offers data will be skipped.");
      }

      const now = new Date();
      const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

      const auditEvent = (bg_id: string, desc: string, actor: string, ts: Date) => ({
        event_id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        bg_id, event_type: "STATUS_CHANGE", description: desc, actor, timestamp: ts,
      });

      // ── BG data builder ─────────────────────────────────────────────────────
      interface BGSpec {
        docId: string; bg_id: string; appName: string; appPan: string; appGstin: string;
        beneficiary: string; tender: string; amount: number; type: string; validity: number;
        status: string; days: number; bankAccepted?: boolean;
      }

      const makeAudit = (bg_id: string, appName: string, status: string, days: number) => {
        const trail = [auditEvent(bg_id, "BG Application submitted and broadcasted to partner banks.", appName, daysAgo(days))];
        if (["OFFER_ACCEPTED","IN_PROGRESS","PAYMENT_CONFIRMED","ISSUED"].includes(status))
          trail.push(auditEvent(bg_id, "Bank offer accepted by applicant.", appName, daysAgo(days - 2)));
        if (["PAYMENT_CONFIRMED","ISSUED"].includes(status))
          trail.push(auditEvent(bg_id, "Platform fee & FD confirmed.", bankName || "Admin", daysAgo(days - 5)));
        if (status === "ISSUED")
          trail.push(auditEvent(bg_id, "Final BG issued and delivered to applicant.", bankName || "Admin", daysAgo(days - 8)));
        return trail;
      };

      const bgSpecs: BGSpec[] = [
        { docId:"bg-seed-001", bg_id:"BG-1001", appName:"POSTMAC VENTURES PVT LTD",  appPan:"AABCP1234M", appGstin:"07AABCP1234M1Z5", beneficiary:"NHAI",                   tender:"TND/NHAI/2026/001",  amount:38_000_000, type:"PERFORMANCE",    validity:24, status:"PROCESSING",        days:10 },
        { docId:"bg-seed-002", bg_id:"BG-1002", appName:"APEX INFRA SOLUTIONS LTD",   appPan:"AAXCI5678N", appGstin:"27AAXCI5678N1ZP", beneficiary:"PWD Gujarat",             tender:"TND/PWD/GJ/2026/014",amount:12_500_000, type:"FINANCIAL",      validity:18, status:"PROCESSING",        days:8  },
        { docId:"bg-seed-003", bg_id:"BG-1003", appName:"METRO BUILD CORP PVT LTD",   appPan:"AAGCM9012K", appGstin:"29AAGCM9012K1Z1", beneficiary:"Ministry of Railways",    tender:"TND/MOR/2026/088",  amount:55_000_000, type:"PERFORMANCE",    validity:36, status:"PROCESSING",        days:6  },
        { docId:"bg-seed-004", bg_id:"BG-1004", appName:"SUNRIZE EXPORTS PVT LTD",    appPan:"ABCDS3456P", appGstin:"19ABCDS3456P1ZR", beneficiary:"DGFT Exports Division",   tender:"TND/DGFT/2026/044", amount:7_500_000,  type:"FINANCIAL",      validity:12, status:"PROCESSING",        days:4  },
        { docId:"bg-seed-005", bg_id:"BG-1005", appName:"APEX INFRA SOLUTIONS LTD",   appPan:"AAXCI5678N", appGstin:"27AAXCI5678N1ZP", beneficiary:"BMRCL Bangalore Metro",   tender:"TND/BMRCL/2026/007",amount:82_000_000, type:"PERFORMANCE",    validity:30, status:"OFFER_ACCEPTED",    days:14, bankAccepted:true },
        { docId:"bg-seed-006", bg_id:"BG-1006", appName:"METRO BUILD CORP PVT LTD",   appPan:"AAGCM9012K", appGstin:"29AAGCM9012K1Z1", beneficiary:"MNRE",                    tender:"TND/MNRE/2026/021", amount:21_000_000, type:"ADVANCE_PAYMENT",validity:24, status:"OFFER_ACCEPTED",    days:12, bankAccepted:true },
        { docId:"bg-seed-007", bg_id:"BG-1007", appName:"POSTMAC VENTURES PVT LTD",   appPan:"AABCP1234M", appGstin:"07AABCP1234M1Z5", beneficiary:"DCGI Drug Controller",    tender:"TND/DCGI/2026/003", amount:5_000_000,  type:"STATUTORY",      validity:18, status:"IN_PROGRESS",       days:18, bankAccepted:true },
        { docId:"bg-seed-008", bg_id:"BG-1008", appName:"APEX INFRA SOLUTIONS LTD",   appPan:"AAXCI5678N", appGstin:"27AAXCI5678N1ZP", beneficiary:"JNPA Port Trust",         tender:"TND/JNPA/2026/015", amount:18_000_000, type:"FINANCIAL",      validity:12, status:"IN_PROGRESS",       days:20, bankAccepted:true },
        { docId:"bg-seed-009", bg_id:"BG-1009", appName:"METRO BUILD CORP PVT LTD",   appPan:"AAGCM9012K", appGstin:"29AAGCM9012K1Z1", beneficiary:"Ministry of Defence",     tender:"TND/MOD/2026/002",  amount:43_000_000, type:"PERFORMANCE",    validity:36, status:"PAYMENT_CONFIRMED",  days:22, bankAccepted:true },
        { docId:"bg-seed-010", bg_id:"BG-1010", appName:"POSTMAC VENTURES PVT LTD",   appPan:"AABCP1234M", appGstin:"07AABCP1234M1Z5", beneficiary:"NHAI NH-58 Expansion",    tender:"TND/NHAI/2026/022", amount:120_000_000,type:"PERFORMANCE",    validity:48, status:"ISSUED",            days:30, bankAccepted:true },
      ];

      // ── Write BG Applications ──────────────────────────────────────────────
      addLog(true, "Creating 10 BG applications…");
      for (const s of bgSpecs) {
        const docData: Record<string, any> = {
          bg_id:               s.bg_id,
          applicant_id:        user.uid,  // admin UID (rules allow isAdmin() create)
          applicant_name:      s.appName,
          applicant_pan:       s.appPan,
          applicant_gstin:     s.appGstin,
          bg_type:             s.type,
          amount_inr:          s.amount,
          beneficiary_name:    s.beneficiary,
          beneficiary_address: "New Delhi – 110001",
          tender_number:       s.tender,
          validity_months:     s.validity,
          required_by_date:    new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0],
          status:              s.status,
          created_at:          daysAgo(s.days),
          updated_at:          now,
          submitted_at:        daysAgo(s.days),
          platform_fee_paid:   ["PAYMENT_CONFIRMED","ISSUED"].includes(s.status),
          offers:              [],
          documents:           [],
          payments:            [],
          audit_trail:         makeAudit(s.bg_id, s.appName, s.status, s.days),
          accepted_bank_id:    s.bankAccepted && bankUid ? bankUid : null,
          accepted_bank_name:  s.bankAccepted && bankName ? bankName : null,
          official_bg_number:  s.status === "ISSUED" ? `BG-ISSUED-${s.bg_id}` : null,
          issued_at:           s.status === "ISSUED" ? daysAgo(s.days - 8) : null,
        };
        await setDoc(doc(db, "bg_applications", s.docId), docData);
        addLog(true, `✓ ${s.bg_id} — ${s.appName.slice(0,30)} — ${s.status}`);
      }

      // ── Write BG Offers ────────────────────────────────────────────────────
      if (bankUid) {
        addLog(true, "Creating bank offers…");
        const offerSpecs = [
          { id:"OFR-SEED-001", bgDoc:"bg-seed-005", bg_id:"BG-1005", appName:"APEX INFRA SOLUTIONS LTD",  amount:82_000_000, type:"PERFORMANCE",    validity:30, comm:1.5,  fd:100, status:"ACCEPTED", days:12 },
          { id:"OFR-SEED-002", bgDoc:"bg-seed-006", bg_id:"BG-1006", appName:"METRO BUILD CORP PVT LTD",  amount:21_000_000, type:"ADVANCE_PAYMENT",validity:24, comm:1.75, fd:100, status:"ACCEPTED", days:10 },
          { id:"OFR-SEED-003", bgDoc:"bg-seed-007", bg_id:"BG-1007", appName:"POSTMAC VENTURES PVT LTD",  amount:5_000_000,  type:"STATUTORY",      validity:18, comm:1.8,  fd:110, status:"ACCEPTED", days:16 },
          { id:"OFR-SEED-004", bgDoc:"bg-seed-008", bg_id:"BG-1008", appName:"APEX INFRA SOLUTIONS LTD",  amount:18_000_000, type:"FINANCIAL",      validity:12, comm:2.0,  fd:100, status:"ACCEPTED", days:18 },
          { id:"OFR-SEED-005", bgDoc:"bg-seed-009", bg_id:"BG-1009", appName:"METRO BUILD CORP PVT LTD",  amount:43_000_000, type:"PERFORMANCE",    validity:36, comm:1.6,  fd:100, status:"ACCEPTED", days:20 },
          { id:"OFR-SEED-006", bgDoc:"bg-seed-010", bg_id:"BG-1010", appName:"POSTMAC VENTURES PVT LTD",  amount:120_000_000,type:"PERFORMANCE",    validity:48, comm:1.5,  fd:100, status:"ACCEPTED", days:28 },
          { id:"OFR-SEED-007", bgDoc:"bg-seed-001", bg_id:"BG-1001", appName:"POSTMAC VENTURES PVT LTD",  amount:38_000_000, type:"PERFORMANCE",    validity:24, comm:1.9,  fd:100, status:"PENDING",  days:5  },
          { id:"OFR-SEED-008", bgDoc:"bg-seed-002", bg_id:"BG-1002", appName:"APEX INFRA SOLUTIONS LTD",  amount:12_500_000, type:"FINANCIAL",      validity:18, comm:1.7,  fd:100, status:"PENDING",  days:3  },
        ];
        for (const o of offerSpecs) {
          await setDoc(doc(db, "bg_offers", o.id), {
            offer_id:        o.id,
            bg_id:           o.bg_id,
            bg_doc_id:       o.bgDoc,
            bank_id:         bankUid,
            bank_name:       bankName,
            applicant_id:    user.uid,
            applicant_name:  o.appName,
            bg_amount:       o.amount,
            bg_type:         o.type,
            validity_months: o.validity,
            commission_rate: o.comm,
            fd_margin:       o.fd,
            offer_valid_days:30,
            conditions:      "Standard bank guarantee terms apply. FD to be pledged before issuance.",
            submitted_at:    daysAgo(o.days),
            valid_till:      new Date(Date.now() + 30 * 86_400_000).toISOString(),
            status:          o.status,
          });
          addLog(true, `✓ ${o.id} — ${o.bg_id} — ${o.status}`);
        }
      }

      addLog(true, "🎉 Seed complete! Refresh the bank portal to see live data.");
      toast.success("10 BGs + 8 offers seeded successfully!");
    } catch (err: any) {
      addLog(false, `Error: ${err.message}`);
      toast.error(err.message ?? "Seed failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    setLog([]);
    try {
      addLog(true, "Deleting seed BG applications…");
      for (let i = 1; i <= 10; i++) {
        const id = `bg-seed-00${i}`.replace("bg-seed-0010","bg-seed-010");
        try {
          const { deleteDoc, doc: fsDoc } = await import("firebase/firestore");
          await deleteDoc(fsDoc(db, "bg_applications", `bg-seed-00${String(i).padStart(1,"0")}`));
        } catch {}
      }
      addLog(true, "Deleting seed offers…");
      for (let i = 1; i <= 8; i++) {
        try {
          const { deleteDoc, doc: fsDoc } = await import("firebase/firestore");
          await deleteDoc(fsDoc(db, "bg_offers", `OFR-SEED-00${String(i).padStart(1,"0")}`));
        } catch {}
      }
      addLog(true, "✓ All seed data deleted.");
      toast.success("Seed data cleared.");
    } catch (err: any) {
      addLog(false, `Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PortalHeader
        title="Database Seeder"
        subtitle="Create 10 realistic BG applications + bank offers in Firestore"
      />
      <div className="portal-content space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={16} className="text-navy-500" />
              Seed 10 BG Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-navy-800 rounded-xl">
              <div>• 4 × <strong>PROCESSING</strong> — visible in bank market feed</div>
              <div>• 2 × <strong>OFFER_ACCEPTED</strong> — bank issuance desk</div>
              <div>• 2 × <strong>IN_PROGRESS</strong> — issuance in progress</div>
              <div>• 1 × <strong>PAYMENT_CONFIRMED</strong> — ready to issue</div>
              <div>• 1 × <strong>ISSUED</strong> — completed BG</div>
              <div>• 8 × Bank offers (6 ACCEPTED + 2 PENDING)</div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSeed} loading={running} icon={<Database size={14} />}>
                Run Seed
              </Button>
              <Button variant="outline" onClick={handleDelete} loading={deleting} icon={<Trash2 size={14} />}>
                Clear Seed Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log output */}
        {log.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Seed Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono text-xs">
                {log.map((line, i) => (
                  <div key={i} className={`flex items-start gap-2 ${line.ok ? "text-gray-700 dark:text-gray-300" : "text-red-600"}`}>
                    {line.ok
                      ? <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
                      : <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                    }
                    {line.msg}
                  </div>
                ))}
                {running && (
                  <div className="flex items-center gap-2 text-navy-500">
                    <Loader2 size={12} className="animate-spin" />
                    Writing to Firestore…
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
