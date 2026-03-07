/**
 * e-BGX — Seed 10 BG Applications + Bank Offers
 *
 * Usage:
 *   node scripts/seed-bgs.mjs <admin_email> <admin_password>
 *
 * Requires the admin user to have role:"admin" in Firestore users collection.
 */

const PROJECT_ID = "e-bgxcom";
const API_KEY    = "AIzaSyDDAjt2ljkc97WR3p6I1rfoA_Db-GdDsCA";

const ADMIN_EMAIL    = process.argv[2];
const ADMIN_PASSWORD = process.argv[3];

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Usage: node scripts/seed-bgs.mjs <admin_email> <admin_password>");
  process.exit(1);
}

// ── Firebase Auth REST ────────────────────────────────────────────────────────

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Auth failed: ${err.error?.message}`);
  }
  const data = await res.json();
  return { idToken: data.idToken, uid: data.localId };
}

// ── Firestore REST ────────────────────────────────────────────────────────────

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fsGet(path, idToken) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fsQuery(collection, filters, idToken) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: filters.map(([field, op, value]) => ({
            fieldFilter: {
              field: { fieldPath: field },
              op,
              value,
            },
          })),
        },
      },
      limit: 20,
    },
  };
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => r.document);
}

async function fsPatch(path, fields, idToken) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Firestore write failed (${path}): ${JSON.stringify(err.error?.message)}`);
  }
  return res.json();
}

// ── Value helpers (Firestore REST format) ─────────────────────────────────────

const sv  = (v) => ({ stringValue: v });
const nv  = (v) => ({ integerValue: String(v) });
const dv  = (v) => ({ doubleValue: v });
const bv  = (v) => ({ booleanValue: v });
const tsv = (d) => ({ timestampValue: new Date(d).toISOString() });
const arrV = (vals) => ({ arrayValue: { values: vals } });
const nullV = () => ({ nullValue: null });

function auditEvent(bg_id, desc, actor, ts) {
  return {
    mapValue: {
      fields: {
        event_id: sv(`EVT-${Date.now()}-${Math.random().toString(36).slice(2,6)}`),
        bg_id:    sv(bg_id),
        event_type: sv("STATUS_CHANGE"),
        description: sv(desc),
        actor: sv(actor),
        timestamp: tsv(ts),
      },
    },
  };
}

// ── Seed Data ────────────────────────────────────────────────────────────────

// 3  PROCESSING  — appear in market feed
// 1  PROCESSING  — bank will also have a PENDING offer for it
// 2  OFFER_ACCEPTED — bank has won these, in issuance desk
// 2  IN_PROGRESS    — issuance in progress
// 1  PAYMENT_CONFIRMED — ready to issue
// 1  ISSUED         — completed

function bgData(docId, bg_id, applicant_id, applicant_name, pan, gstin,
  beneficiary, tender, amount, type, validity, status, bankUid, bankName, days) {

  const now   = new Date().toISOString();
  const base  = new Date(Date.now() - days * 86_400_000).toISOString();

  const auditTrail = [
    auditEvent(bg_id, "BG Application submitted and broadcasted to partner banks.", applicant_name, base),
  ];
  if (["OFFER_ACCEPTED","IN_PROGRESS","PAYMENT_CONFIRMED","ISSUED"].includes(status)) {
    auditTrail.push(auditEvent(bg_id, "Offer accepted by applicant.", applicant_name,
      new Date(Date.now() - (days - 2) * 86_400_000).toISOString()));
  }
  if (["PAYMENT_CONFIRMED","ISSUED"].includes(status)) {
    auditTrail.push(auditEvent(bg_id, "Payment & FD confirmed.", bankName,
      new Date(Date.now() - (days - 5) * 86_400_000).toISOString()));
  }
  if (status === "ISSUED") {
    auditTrail.push(auditEvent(bg_id, "Final BG issued and delivered.", bankName,
      new Date(Date.now() - (days - 8) * 86_400_000).toISOString()));
  }

  const fields = {
    bg_id:              sv(bg_id),
    applicant_id:       sv(applicant_id),
    applicant_name:     sv(applicant_name),
    applicant_pan:      sv(pan),
    applicant_gstin:    sv(gstin),
    bg_type:            sv(type),
    amount_inr:         nv(amount),
    beneficiary_name:   sv(beneficiary),
    beneficiary_address: sv("New Delhi – 110001"),
    tender_number:      sv(tender),
    validity_months:    nv(validity),
    required_by_date:   sv(new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0]),
    status:             sv(status),
    created_at:         tsv(base),
    updated_at:         tsv(now),
    platform_fee_paid:  bv(["PAYMENT_CONFIRMED","ISSUED"].includes(status)),
    offers:             arrV([]),
    documents:          arrV([]),
    payments:           arrV([]),
    audit_trail:        arrV(auditTrail),
    official_bg_number: status === "ISSUED" ? sv(`BG-ISSUED-${bg_id}`) : nullV(),
    issued_at:          status === "ISSUED" ? tsv(new Date(Date.now() - (days - 8) * 86_400_000).toISOString()) : nullV(),
    submitted_at:       tsv(base),
  };

  if (bankUid) {
    fields.accepted_bank_id   = sv(bankUid);
    fields.accepted_bank_name = sv(bankName);
  } else {
    fields.accepted_bank_id   = nullV();
    fields.accepted_bank_name = nullV();
  }

  return { docId, fields };
}

function offerData(offerId, bgDocId, bg_id, bankId, bankName, appId, appName,
  bgAmount, bgType, validityMonths, commRate, fdMargin, status, daysAgo) {
  const submitted = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const validTill = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    docId: offerId,
    fields: {
      offer_id:        sv(offerId),
      bg_id:           sv(bg_id),
      bg_doc_id:       sv(bgDocId),
      bank_id:         sv(bankId),
      bank_name:       sv(bankName),
      applicant_id:    sv(appId),
      applicant_name:  sv(appName),
      bg_amount:       nv(bgAmount),
      bg_type:         sv(bgType),
      validity_months: nv(validityMonths),
      commission_rate: dv(commRate),
      fd_margin:       dv(fdMargin),
      offer_valid_days: nv(30),
      conditions:      sv("Standard bank guarantee terms apply. FD to be pledged before issuance."),
      submitted_at:    tsv(submitted),
      valid_till:      sv(validTill),
      status:          sv(status),
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔐 Signing in as admin…");
  const { idToken, uid: adminUid } = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`   ✅ Admin UID: ${adminUid}`);

  // Find a bank user
  console.log("\n🏦 Looking for bank user in Firestore…");
  let bankUid = "";
  let bankName = "";
  const bankDocs = await fsQuery("users", [["role","EQUAL",sv("bank")]], idToken);
  if (bankDocs.length > 0) {
    const bd = bankDocs[0];
    bankUid   = bd.name.split("/").pop();
    bankName  = bd.fields?.bankName?.stringValue || bd.fields?.displayName?.stringValue || "HDFC Bank";
    console.log(`   ✅ Bank: ${bankName} (${bankUid})`);
  } else {
    console.log("   ⚠️  No bank user found — issuance desk data will be skipped.");
  }

  // Use adminUid as a shared applicant_id placeholder so rules pass (isAdmin bypasses check)
  const APP = {
    id:   adminUid, // admin creates on behalf of applicants
    name: "POSTMAC VENTURES PVT LTD",
    pan:  "AABCP1234M",
    gstin: "07AABCP1234M1Z5",
  };
  const APP2 = { id: adminUid, name: "APEX INFRA SOLUTIONS", pan: "AAXCI5678N", gstin: "27AAXCI5678N1ZP" };
  const APP3 = { id: adminUid, name: "METRO BUILD CORP",    pan: "AAGCM9012K", gstin: "29AAGCM9012K1Z1" };

  // 10 BG Applications
  const bgs = [
    bgData("bg-seed-001","BG-1001",APP.id, APP.name, APP.pan, APP.gstin,
      "NHAI – National Highways Authority","TND/NHAI/2026/001",38_000_000,"PERFORMANCE",24,"PROCESSING",null,null,10),
    bgData("bg-seed-002","BG-1002",APP2.id,APP2.name,APP2.pan,APP2.gstin,
      "PWD Gujarat","TND/PWD/GJ/2026/014",12_500_000,"FINANCIAL",18,"PROCESSING",null,null,8),
    bgData("bg-seed-003","BG-1003",APP3.id,APP3.name,APP3.pan,APP3.gstin,
      "Ministry of Railways","TND/MOR/2026/088",55_000_000,"PERFORMANCE",36,"PROCESSING",null,null,6),
    bgData("bg-seed-004","BG-1004",APP.id, APP.name, APP.pan, APP.gstin,
      "DGFT – Exports Division","TND/DGFT/2026/044",7_500_000,"FINANCIAL",12,"PROCESSING",null,null,4),
    // Accepted by bank
    bgData("bg-seed-005","BG-1005",APP2.id,APP2.name,APP2.pan,APP2.gstin,
      "BMRCL – Bangalore Metro","TND/BMRCL/2026/007",82_000_000,"PERFORMANCE",30,"OFFER_ACCEPTED",bankUid,bankName,14),
    bgData("bg-seed-006","BG-1006",APP3.id,APP3.name,APP3.pan,APP3.gstin,
      "MNRE – Ministry of New & Renewable Energy","TND/MNRE/2026/021",21_000_000,"ADVANCE_PAYMENT",24,"OFFER_ACCEPTED",bankUid,bankName,12),
    bgData("bg-seed-007","BG-1007",APP.id, APP.name, APP.pan, APP.gstin,
      "DCGI – Drug Controller","TND/DCGI/2026/003",5_000_000,"STATUTORY",18,"IN_PROGRESS",bankUid,bankName,18),
    bgData("bg-seed-008","BG-1008",APP2.id,APP2.name,APP2.pan,APP2.gstin,
      "JNPA – Jawaharlal Nehru Port","TND/JNPA/2026/015",18_000_000,"FINANCIAL",12,"IN_PROGRESS",bankUid,bankName,20),
    bgData("bg-seed-009","BG-1009",APP3.id,APP3.name,APP3.pan,APP3.gstin,
      "Ministry of Defence","TND/MOD/2026/002",43_000_000,"PERFORMANCE",36,"PAYMENT_CONFIRMED",bankUid,bankName,22),
    bgData("bg-seed-010","BG-1010",APP.id, APP.name, APP.pan, APP.gstin,
      "NHAI – NH-58 Expansion","TND/NHAI/2026/022",120_000_000,"PERFORMANCE",48,"ISSUED",bankUid,bankName,30),
  ];

  // Bank Offers (only if bank user found)
  const offers = bankUid ? [
    offerData("OFR-SEED-001","bg-seed-005","BG-1005",bankUid,bankName,APP2.id,APP2.name,82_000_000,"PERFORMANCE",30,1.5,100,"ACCEPTED",12),
    offerData("OFR-SEED-002","bg-seed-006","BG-1006",bankUid,bankName,APP3.id,APP3.name,21_000_000,"ADVANCE_PAYMENT",24,1.75,100,"ACCEPTED",10),
    offerData("OFR-SEED-003","bg-seed-007","BG-1007",bankUid,bankName,APP.id, APP.name, 5_000_000,"STATUTORY",18,1.8,110,"ACCEPTED",16),
    offerData("OFR-SEED-004","bg-seed-008","BG-1008",bankUid,bankName,APP2.id,APP2.name,18_000_000,"FINANCIAL",12,2.0,100,"ACCEPTED",18),
    offerData("OFR-SEED-005","bg-seed-009","BG-1009",bankUid,bankName,APP3.id,APP3.name,43_000_000,"PERFORMANCE",36,1.6,100,"ACCEPTED",20),
    offerData("OFR-SEED-006","bg-seed-010","BG-1010",bankUid,bankName,APP.id, APP.name,120_000_000,"PERFORMANCE",48,1.5,100,"ACCEPTED",28),
    offerData("OFR-SEED-007","bg-seed-001","BG-1001",bankUid,bankName,APP.id, APP.name, 38_000_000,"PERFORMANCE",24,1.9,100,"PENDING",5),
    offerData("OFR-SEED-008","bg-seed-002","BG-1002",bankUid,bankName,APP2.id,APP2.name,12_500_000,"FINANCIAL",18,1.7,100,"PENDING",3),
  ] : [];

  // Write BG Applications
  console.log("\n📋 Creating 10 BG Applications…");
  for (const { docId, fields } of bgs) {
    try {
      await fsPatch(`bg_applications/${docId}`, fields, idToken);
      const status = fields.status.stringValue;
      console.log(`   ✅ ${fields.bg_id.stringValue} — ${fields.applicant_name.stringValue} — ${status}`);
    } catch (e) {
      console.error(`   ❌ ${docId}: ${e.message}`);
    }
  }

  // Write BG Offers
  if (offers.length > 0) {
    console.log("\n💼 Creating Bank Offers…");
    for (const { docId, fields } of offers) {
      try {
        await fsPatch(`bg_offers/${docId}`, fields, idToken);
        console.log(`   ✅ ${fields.offer_id.stringValue} — ${fields.bg_id.stringValue} — ${fields.status.stringValue}`);
      } catch (e) {
        console.error(`   ❌ ${docId}: ${e.message}`);
      }
    }
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   BG Applications : ${bgs.length}`);
  console.log(`   BG Offers       : ${offers.length}`);
  console.log(`   Market Feed BGs : 4 (status=PROCESSING)`);
  console.log(`   Issuance Desk   : 6 (accepted_bank_id=${bankUid || "none"})`);
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
