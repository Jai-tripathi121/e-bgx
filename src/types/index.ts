// ─── Enums ────────────────────────────────────────────────────────────────────

export type BGStatus =
  | "DRAFT"
  | "PAYMENT_REQUESTED"
  | "PROCESSING"
  | "IN_PROGRESS"
  | "OFFER_ACCEPTED"
  | "PAYMENT_CONFIRMED"
  | "ISSUED"
  | "PAY_FEES"
  | "EXPIRED"
  | "AMENDED";

export type BGType =
  | "PERFORMANCE"
  | "FINANCIAL"
  | "STATUTORY"
  | "OTHER";

export type KYCStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export type UserRole = "APPLICANT" | "BANK_OFFICER" | "BANK_ADMIN" | "PLATFORM_ADMIN" | "SUPPORT";

export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type TxnStatus = "SUCCESS" | "VERIFIED" | "PROOF_UPLOADED" | "PENDING";

export type TxnType =
  | "PLATFORM_FEE"
  | "FD_CREATION"
  | "BG_PROCESSING_FEE"
  | "BANK_BG_FEE"
  | "FD_DEPOSIT";

// ─── User / Auth ───────────────────────────────────────────────────────────────

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  entityId: string; // applicant_id or bank_id
  createdAt: Date;
}

// ─── Applicant (Company) ───────────────────────────────────────────────────────

export interface Applicant {
  company_id: string;
  legal_name: string;
  gstin: string;
  pan: string;
  cin: string;
  registered_address: string;
  city: string;
  state: string;
  pincode: string;
  primary_bank: string;
  account_number: string;
  ifsc_code: string;
  account_type: "CURRENT" | "SAVINGS";
  annual_turnover: string;
  business_vintage: number;
  kyc_status: KYCStatus;
  onboarded_date: Date;
  authorized_signatory: {
    name: string;
    role: string;
    email: string;
    mobile: string;
  };
  admin_poc: {
    name: string;
    email: string;
    mobile: string;
  };
  industry_sector: string;
  kyc_documents: KYCDocument[];
}

export interface KYCDocument {
  type: string;
  label: string;
  status: "COMPLETED" | "PENDING";
  url?: string;
  uploadedAt?: Date;
}

// ─── Bank Partner ──────────────────────────────────────────────────────────────

export interface BankPartner {
  bank_id: string;
  bank_name: string;
  branch_code: string;
  address: string;
  branch_email: string;
  officer_email: string;
  officer_name: string;
  officer_designation: string;
  officer_mobile: string;
  status: "ACTIVE" | "INACTIVE";
  member_since: Date;
}

// ─── BG Application (Core Transaction) ────────────────────────────────────────

export interface BGApplication {
  bg_id: string;
  applicant_id: string;
  applicant_name: string;
  beneficiary_name: string;
  beneficiary_address: string;
  bg_type: BGType;
  amount_inr: number;
  validity_months: number;
  required_by_date: Date;
  tender_number: string;
  status: BGStatus;
  created_at: Date;
  issued_at?: Date;
  expiry_date?: Date;
  official_bg_number?: string;
  accepted_bank_id?: string;
  accepted_bank_name?: string;
  platform_fee_paid: boolean;
  documents: BGDocument[];
  offers: BankOffer[];
  payments: PaymentTransaction[];
  audit_trail: AuditEvent[];
}

export interface BGDocument {
  doc_id: string;
  type: string;
  label: string;
  url: string;
  uploaded_at: Date;
  status: "COMPLETED" | "PENDING";
}

// ─── Bank Offer (Term Sheet) ───────────────────────────────────────────────────

export interface BankOffer {
  offer_id: string;
  bg_id: string;
  bank_id: string;
  bank_name: string;
  commission_rate: number;
  fd_margin: number;
  fd_interest: number;
  total_cost_inr: number;
  valid_till: Date;
  status: OfferStatus;
  special_conditions?: string;
  submitted_at: Date;
}

// ─── Payment Transaction ───────────────────────────────────────────────────────

export interface PaymentTransaction {
  txn_id: string;
  bg_id: string;
  type: TxnType;
  amount_inr: number;
  status: TxnStatus;
  proof_url?: string;
  txn_date: Date;
  description: string;
  beneficiary?: string;
  bank_txn_ref?: string;
}

// ─── Audit Event ───────────────────────────────────────────────────────────────

export interface AuditEvent {
  event_id: string;
  bg_id: string;
  event_type: string;
  description: string;
  actor: string;
  actor_role: UserRole;
  timestamp: Date;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface BankAnalytics {
  period: "1W" | "6M" | "YTD";
  total_revenue: number;
  bgs_issued: number;
  active_portfolio: number;
  avg_tat: number;
  offer_acceptance_rate: number;
  avg_bg_size: number;
  repeat_customers: number;
  customer_satisfaction: number;
  monthly_trend: { month: string; count: number; revenue: number }[];
  sector_distribution: { sector: string; amount: number }[];
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
  msg_id: string;
  bg_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  type: "USER" | "SYSTEM";
  timestamp: Date;
}

// ─── UI Helper Types ───────────────────────────────────────────────────────────

export interface StatusBadgeProps {
  status: BGStatus | OfferStatus | TxnStatus | KYCStatus;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}
