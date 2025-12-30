import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  UserProfile,
  Familiarity,
  ELO_DEFAULTS,
  UserElos,
} from "@/types/user";

/**
 * Get a user's profile from Firestore
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }

  return null;
}

/**
 * Create a new user profile with ELOs initialized based on familiarity level
 */
export async function createUserProfile(
  userId: string,
  familiarity: Familiarity
): Promise<UserProfile> {
  const initialElo = ELO_DEFAULTS[familiarity];
  const now = Timestamp.now();

  const profile: UserProfile = {
    familiarity,
    elos: {
      puzzle: initialElo,
      openings: initialElo,
      game: initialElo,
    },
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, "users", userId);
  await setDoc(docRef, profile);

  return profile;
}

/**
 * Update a user's profile with partial data
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "familiarity" | "elos">>
): Promise<void> {
  const docRef = doc(db, "users", userId);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a specific ELO category for a user
 */
export async function updateUserElo(
  userId: string,
  category: keyof UserElos,
  newElo: number
): Promise<void> {
  const docRef = doc(db, "users", userId);

  await updateDoc(docRef, {
    [`elos.${category}`]: newElo,
    updatedAt: Timestamp.now(),
  });
}
