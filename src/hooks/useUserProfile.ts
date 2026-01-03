"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { createUserProfile, updateUserProfile, updateGameplaySettings } from "@/lib/userProfile";
import { Familiarity, UserProfile, MoveMethod, DEFAULT_GAMEPLAY_SETTINGS } from "@/types/user";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProfileState {
  profile: UserProfile | null;
  loadedForUserId: string | null;
  error: Error | null;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  setFamiliarity: (familiarity: Familiarity) => Promise<void>;
  setMoveMethod: (moveMethod: MoveMethod) => Promise<void>;
  /** The user's preferred move method, defaults to "both" */
  moveMethod: MoveMethod;
  /** True when user is logged in, profile is loaded, but no profile exists yet */
  needsFamiliaritySelection: boolean;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loadedForUserId: null,
    error: null,
  });
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  const userId = user?.uid ?? null;

  // Subscribe to real-time profile updates
  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!user) {
      return;
    }

    const docRef = doc(db, "users", user.uid);
    unsubscribeRef.current = onSnapshot(
      docRef,
      (docSnap) => {
        setState({
          profile: docSnap.exists() ? (docSnap.data() as UserProfile) : null,
          loadedForUserId: user.uid,
          error: null,
        });
      },
      (err) => {
        setState({
          profile: null,
          loadedForUserId: user.uid,
          error: err,
        });
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user]);

  // Derive loading state:
  // - Loading if auth is still loading
  // - Loading if we have a user but haven't loaded their profile yet
  const loading = authLoading || (userId !== null && state.loadedForUserId !== userId);

  // Create or update profile with familiarity level
  const setFamiliarity = useCallback(
    async (familiarity: Familiarity) => {
      if (!user) {
        throw new Error("User must be authenticated to set familiarity");
      }

      try {
        if (state.profile) {
          // Update existing profile
          await updateUserProfile(user.uid, { familiarity });
        } else {
          // Create new profile with initialized ELOs
          await createUserProfile(user.uid, familiarity);
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to set familiarity");
        setState((prev) => ({ ...prev, error }));
        throw err;
      }
    },
    [user, state.profile]
  );

  // Update move method preference
  const setMoveMethod = useCallback(
    async (moveMethod: MoveMethod) => {
      if (!user) {
        throw new Error("User must be authenticated to set move method");
      }

      try {
        await updateGameplaySettings(user.uid, { moveMethod });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to set move method");
        setState((prev) => ({ ...prev, error }));
        throw err;
      }
    },
    [user]
  );

  // Get the current move method, defaulting to "both"
  const moveMethod: MoveMethod =
    state.profile?.gameplay?.moveMethod ?? DEFAULT_GAMEPLAY_SETTINGS.moveMethod;

  // User needs to select familiarity if:
  // - User is logged in
  // - Profile has been loaded (not loading)
  // - No profile exists yet
  const needsFamiliaritySelection =
    !!user && !loading && state.profile === null && state.loadedForUserId === userId;

  return {
    profile: state.profile,
    loading,
    error: state.error,
    setFamiliarity,
    setMoveMethod,
    moveMethod,
    needsFamiliaritySelection,
  };
}
