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

async function getSecondaryAuth() {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const SECONDARY = "ebgx-admin-creation";
  const existing = getApps().find((a) => a.name === SECONDARY);
  const secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY);
  return getAuth(secondaryApp);
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
  const { createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
  const secondaryAuth = await getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  await setDoc(doc(db, "users", uid), {
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
    createdAt: serverTimestamp(),
    memberSince: new Date().toISOString().split("T")[0],
  });
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
  const { createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
  const secondaryAuth = await getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  await setDoc(doc(db, "users", uid), {
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
    createdAt: serverTimestamp(),
  });
  return uid;
}
