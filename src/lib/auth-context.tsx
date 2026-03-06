"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = "applicant" | "bank" | "admin";
export type KYCStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  companyName: string;
  mobile?: string;
  // applicant fields
  pan?: string;
  gstin?: string;
  cin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // bank fields
  bankName?: string;
  branchCode?: string;
  officerName?: string;
  bankStatus?: "ACTIVE" | "PENDING" | "SUSPENDED";
  // KYC & profile completion
  profileComplete?: boolean;
  kycStatus?: KYCStatus;
  createdAt?: any;
}

export interface RegisterData {
  companyName: string;
  email: string;
  mobile: string;
  password: string;
  pan?: string;
  gstin?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (portal: UserRole) => Promise<void>;
  register: (data: RegisterData, portal: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Auth actions ────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async (portal: UserRole) => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "",
        companyName: result.user.displayName || "",
        role: portal,
        profileComplete: false,
        kycStatus: "PENDING",
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
    }
  };

  const register = async (data: RegisterData, portal: UserRole) => {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: data.email,
      displayName: data.companyName,
      companyName: data.companyName,
      role: portal,
      mobile: data.mobile,
      profileComplete: false,
      kycStatus: "PENDING",
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", cred.user.uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithGoogle, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
