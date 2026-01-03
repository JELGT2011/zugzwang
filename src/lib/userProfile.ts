import {
  collection,
  doc,
  getDoc,
  getDocs,
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
  GameplaySettings,
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

/**
 * Update a user's gameplay settings
 */
export async function updateGameplaySettings(
  userId: string,
  settings: Partial<GameplaySettings>
): Promise<void> {
  const docRef = doc(db, "users", userId);

  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  // Update each setting individually to allow partial updates
  for (const [key, value] of Object.entries(settings)) {
    updates[`gameplay.${key}`] = value;
  }

  await updateDoc(docRef, updates);
}

/**
 * Mark a puzzle as attempted by a user
 * Stores the puzzle ID in a subcollection: users/{userId}/attemptedPuzzles/{puzzleId}
 */
export async function markPuzzleAttempted(
  userId: string,
  puzzleId: string
): Promise<void> {
  const docRef = doc(db, "users", userId, "attemptedPuzzles", puzzleId);
  await setDoc(docRef, {
    attemptedAt: Timestamp.now(),
  });
}

/**
 * Check if a user has attempted a specific puzzle
 */
export async function hasPuzzleBeenAttempted(
  userId: string,
  puzzleId: string
): Promise<boolean> {
  const docRef = doc(db, "users", userId, "attemptedPuzzles", puzzleId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

/**
 * Get all attempted puzzle IDs for a user
 */
export async function getAttemptedPuzzleIds(
  userId: string
): Promise<Set<string>> {
  const collectionRef = collection(db, "users", userId, "attemptedPuzzles");
  const snapshot = await getDocs(collectionRef);
  return new Set(snapshot.docs.map((doc) => doc.id));
}
