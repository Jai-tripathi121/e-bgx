import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseConfig } from "./firebase";
import { BGStatus } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FirestoreBG {
  id: string; // Firestore document ID
  bg_id: string;
  applicant_id: string;
  applicant_name: string;
  applicant_pan: string;
  applicant_gstin?: string;
  bg_type: string;
  amount_inr: number;
  beneficiary_name: string;
  beneficiary_address?: string;
  tender_number: string;
  validity_months: number;
  required_by_date?: string;
  status: BGStatus;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  issued_at?: string;
  expiry_date?: string | null;
  official_bg_number?: string | null;
  accepted_bank_id?: string | null;
  accepted_bank_name?: string | null;
  platform_fee_paid: boolean;
  offers: any[];
  documents: any[];
  payments: any[];
  audit_trail: any[];
}

export interface CreateBGPayload {
  applicant_id: string;
  applicant_name: string;
  applicant_pan: string;
  applicant_gstin?: string;
  bg_type: string;
  amount_inr: number;
  beneficiary_name: string;
  beneficiary_address: string;
  tender_number: string;
  validity_months: number;
  required_by_date: string;
}

export interface ApplicantUser {
  uid: string;
  companyName: string;
  displayName?: string;
  email: string;
  pan?: string;
  gstin?: string;
  mobile?: string;
  kycStatus?: "PENDING" | "APPROVED" | "REJECTED";
  profileComplete?: boolean;
  createdAt?: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateBGId(): string {
  return `BG-${Math.floor(1000 + Math.random() * 9000)}`;
}

function toISO(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  if (ts?.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return new Date().toISOString();
}

function docToFirestoreBG(id: string, data: any): FirestoreBG {
  return {
    ...data,
    id,
    created_at: toISO(data.created_at),
    updated_at: toISO(data.updated_at),
    submitted_at: data.submitted_at ? toISO(data.submitted_at) : undefined,
    issued_at: data.issued_at ? toISO(data.issued_at) : undefined,
    offers: data.offers ?? [],
    documents: data.documents ?? [],
    payments: data.payments ?? [],
    audit_trail: data.audit_trail ?? [],
    platform_fee_paid: data.platform_fee_paid ?? false,
  };
}

// ── BG Applications ───────────────────────────────────────────────────────────

export async function createBGApplication(data: CreateBGPayload): Promise<string> {
  const bg_id = generateBGId();
  const now = serverTimestamp();
  const payload = {
    bg_id,
    ...data,
    status: "PROCESSING" as BGStatus,
    offers: [],
    documents: [],
    payments: [],
    audit_trail: [
      {
        event_id: `EVT-${Date.now()}`,
        bg_id,
        event_type: "SUBMITTED",
        description: "BG Application submitted and broadcasted to partner banks.",
        actor: data.applicant_name,
        actor_role: "APPLICANT",
        timestamp: new Date().toISOString(),
      },
    ],
    platform_fee_paid: false,
    expiry_date: null,
    official_bg_number: null,
    accepted_bank_id: null,
    accepted_bank_name: null,
    created_at: now,
    updated_at: now,
    submitted_at: now,
  };
  const ref = await addDoc(collection(db, "bg_applications"), payload);
  return ref.id;
}

export async function getApplicantBGs(applicantId: string): Promise<FirestoreBG[]> {
  const q = query(
    collection(db, "bg_applications"),
    where("applicant_id", "==", applicantId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToFirestoreBG(d.id, d.data()));
}

export async function getAllBGs(): Promise<FirestoreBG[]> {
  const snap = await getDocs(
    query(collection(db, "bg_applications"), orderBy("created_at", "desc"))
  );
  return snap.docs.map((d) => docToFirestoreBG(d.id, d.data()));
}

export async function updateBGStatus(
  docId: string,
  status: BGStatus,
  extra?: Record<string, any>
) {
  await updateDoc(doc(db, "bg_applications", docId), {
    status,
    ...extra,
    updated_at: serverTimestamp(),
  });
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function updateUserProfile(uid: string, data: Record<string, any>): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
  });
}

// ── Applicant Management (Admin) ──────────────────────────────────────────────

export async function getPendingKYCApplicants(): Promise<ApplicantUser[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "applicant"),
    where("profileComplete", "==", true),
    where("kycStatus", "==", "PENDING")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as ApplicantUser));
}

export async function getAllApplicants(): Promise<ApplicantUser[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "applicant")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as ApplicantUser));
}

export async function updateKYCStatus(uid: string, status: "APPROVED" | "REJECTED"): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    kycStatus: status,
  });
}

// ── Bank Management (Admin) ───────────────────────────────────────────────────

export interface BankUser {
  uid: string;
  email: string;
  bankName: string;
  branchCode: string;
  branchEmail: string;
  officerName: string;
  officerDesignation?: string;
  officerMobile?: string;
  address?: string;
  role: "bank";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  createdAt?: any;
  memberSince?: string;
}

export async function getAllBanks(): Promise<BankUser[]> {
  const q = query(collection(db, "users"), where("role", "==", "bank"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as BankUser));
}

export async function updateBankStatus(uid: string, status: "ACTIVE" | "REJECTED" | "SUSPENDED"): Promise<void> {
  await updateDoc(doc(db, "users", uid), { status });
}

// ── Admin: Create Users (secondary Firebase app — doesn't sign out admin) ─────

async function getSecondaryApp() {
  const { initializeApp, getApps } = await import("firebase/app");
  const SECONDARY = "ebgx-admin-creation";
  const existing = getApps().find((a) => a.name === SECONDARY);
  return existing || initializeApp(firebaseConfig, SECONDARY);
}

export async function createBankUser(data: {
  email: string;
  password: string;
  bankName: string;
  branchCode: string;
  branchEmail: string;
  officerName: string;
  officerDesignation?: string;
  officerMobile?: string;
  address?: string;
}): Promise<string> {
  const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
  const { getFirestore, doc: fsDoc, setDoc: fsSetDoc, serverTimestamp: fsSTS } = await import("firebase/firestore");

  const secondaryApp = await getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = getFirestore(secondaryApp);

  const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
  const uid = cred.user.uid;

  // Write while the new user is still signed in → request.auth.uid == uid → satisfies isOwner rule
  await fsSetDoc(fsDoc(secondaryDb, "users", uid), {
    uid,
    email: data.email,
    bankName: data.bankName,
    branchCode: data.branchCode,
    branchEmail: data.branchEmail,
    officerName: data.officerName,
    officerDesignation: data.officerDesignation || "",
    officerMobile: data.officerMobile || "",
    address: data.address || "",
    role: "bank",
    status: "ACTIVE",
    createdAt: fsSTS(),
    memberSince: new Date().toISOString().split("T")[0],
  });

  await signOut(secondaryAuth);
  return uid;
}

export async function createApplicantUserByAdmin(data: {
  email: string;
  password: string;
  companyName: string;
  displayName?: string;
  pan?: string;
  gstin?: string;
  mobile?: string;
}): Promise<string> {
  const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
  const { getFirestore, doc: fsDoc, setDoc: fsSetDoc, serverTimestamp: fsSTS } = await import("firebase/firestore");

  const secondaryApp = await getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = getFirestore(secondaryApp);

  const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
  const uid = cred.user.uid;

  // Write while the new user is still signed in → request.auth.uid == uid → satisfies isOwner rule
  await fsSetDoc(fsDoc(secondaryDb, "users", uid), {
    uid,
    email: data.email,
    companyName: data.companyName,
    displayName: data.displayName || data.companyName,
    pan: data.pan || "",
    gstin: data.gstin || "",
    mobile: data.mobile || "",
    role: "applicant",
    profileComplete: true,
    kycStatus: "APPROVED",
    createdAt: fsSTS(),
  });

  await signOut(secondaryAuth);
  return uid;
}

// ── Bank: Market Feed, Offers, Profile ────────────────────────────────────────

export interface BankOffer {
  id: string;
  offer_id: string;
  bg_id: string;
  bank_id: string;
  bank_name: string;
  applicant_id: string;
  applicant_name: string;
  bg_amount: number;
  bg_type: string;
  validity_months: number;
  commission_rate: number;
  fd_margin: number;
  offer_valid_days: number;
  conditions?: string;
  submitted_at: string;
  valid_till: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
}

/** Returns all BG applications in PROCESSING status (the market feed for banks) */
export async function getMarketFeed(): Promise<FirestoreBG[]> {
  const q = query(
    collection(db, "bg_applications"),
    where("status", "==", "PROCESSING")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToFirestoreBG(d.id, d.data()));
}

/** Returns all offers submitted by a specific bank */
export async function getBankOffers(bankId: string): Promise<BankOffer[]> {
  const q = query(collection(db, "bg_offers"), where("bank_id", "==", bankId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      offer_id: data.offer_id || d.id,
      bg_id: data.bg_id,
      bank_id: data.bank_id,
      bank_name: data.bank_name,
      applicant_id: data.applicant_id,
      applicant_name: data.applicant_name,
      bg_amount: data.bg_amount ?? 0,
      bg_type: data.bg_type || "",
      validity_months: data.validity_months || 0,
      commission_rate: data.commission_rate ?? 0,
      fd_margin: data.fd_margin ?? 0,
      offer_valid_days: data.offer_valid_days || 30,
      conditions: data.conditions || "",
      submitted_at: toISO(data.submitted_at),
      valid_till: data.valid_till || toISO(null),
      status: data.status || "PENDING",
    } as BankOffer;
  });
}

/** Submits a new offer from a bank for a BG application */
export async function submitBankOffer(data: {
  bg_id: string;
  bg_doc_id: string;
  bank_id: string;
  bank_name: string;
  applicant_id: string;
  applicant_name: string;
  bg_amount: number;
  bg_type: string;
  validity_months: number;
  commission_rate: number;
  fd_margin: number;
  offer_valid_days: number;
  conditions?: string;
}): Promise<string> {
  const offer_id = `OFR-${Date.now()}`;
  const valid_till = new Date(
    Date.now() + data.offer_valid_days * 86_400_000
  ).toISOString();

  const ref = await addDoc(collection(db, "bg_offers"), {
    offer_id,
    bg_id: data.bg_id,
    bank_id: data.bank_id,
    bank_name: data.bank_name,
    applicant_id: data.applicant_id,
    applicant_name: data.applicant_name,
    bg_amount: data.bg_amount,
    bg_type: data.bg_type,
    validity_months: data.validity_months,
    commission_rate: data.commission_rate,
    fd_margin: data.fd_margin,
    offer_valid_days: data.offer_valid_days,
    conditions: data.conditions || "",
    submitted_at: serverTimestamp(),
    valid_till,
    status: "PENDING",
  });

  // Touch the BG application so applicant sees it's been picked up
  await updateDoc(doc(db, "bg_applications", data.bg_doc_id), {
    updated_at: serverTimestamp(),
  });

  return ref.id;
}
