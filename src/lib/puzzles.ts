/**
 * Firestore puzzle service for client-side queries
 * Requires authenticated users (see firestore.rules)
 */

import { db } from "@/lib/firebase";
import type { Puzzle, PuzzleDifficulty, PuzzleFilters, PuzzleSortOption, PuzzleTheme } from "@/types/puzzle";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from "firebase/firestore";

const PUZZLES_COLLECTION = "puzzles";

// Difficulty rating ranges
const DIFFICULTY_RANGES: Record<PuzzleDifficulty, { min: number; max: number }> = {
  beginner: { min: 0, max: 1000 },
  easy: { min: 1000, max: 1400 },
  medium: { min: 1400, max: 1800 },
  hard: { min: 1800, max: 2200 },
  expert: { min: 2200, max: 2600 },
  master: { min: 2600, max: 9999 },
};

/**
 * Convert a Firestore document to a Puzzle object
 */
function docToPuzzle(doc: QueryDocumentSnapshot<DocumentData>): Puzzle {
  const data = doc.data();
  return {
    id: doc.id,
    fen: data.fen,
    moves: data.moves,
    rating: data.rating,
    ratingDeviation: data.ratingDeviation,
    popularity: data.popularity,
    nbPlays: data.nbPlays,
    themes: data.themes,
    gameUrl: data.gameUrl,
    openingTags: data.openingTags,
  };
}

export interface PuzzleQueryResult {
  puzzles: Puzzle[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch puzzles from Firestore with optional filtering and pagination
 */
export async function fetchPuzzles(
  options: {
    filters?: PuzzleFilters;
    sort?: PuzzleSortOption;
    pageSize?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  } = {}
): Promise<PuzzleQueryResult> {
  const { filters, sort = { field: "rating", direction: "asc" }, pageSize = 50, lastDoc } = options;

  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const constraints: QueryConstraint[] = [];

  // Apply difficulty filter (rating range)
  if (filters?.difficulty) {
    const range = DIFFICULTY_RANGES[filters.difficulty];
    if (range) {
      constraints.push(where("rating", ">=", range.min));
      constraints.push(where("rating", "<", range.max));
    }
  } else {
    // Apply custom rating range if specified
    if (filters?.minRating !== undefined) {
      constraints.push(where("rating", ">=", filters.minRating));
    }
    if (filters?.maxRating !== undefined) {
      constraints.push(where("rating", "<=", filters.maxRating));
    }
  }

  // Apply theme filter (array-contains)
  // Note: Firestore only allows one array-contains per query
  if (filters?.themes && filters.themes.length > 0) {
    // Use the first theme for the query, filter the rest client-side
    constraints.push(where("themes", "array-contains", filters.themes[0]));
  }

  // Apply sorting
  constraints.push(orderBy(sort.field, sort.direction));

  // Apply pagination
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  constraints.push(limit(pageSize + 1)); // Fetch one extra to check if there's more

  const puzzlesRef = collection(db, PUZZLES_COLLECTION);
  const q = query(puzzlesRef, ...constraints);

  const snapshot = await getDocs(q);

  let puzzles = snapshot.docs.map(docToPuzzle);

  // Client-side filtering for additional themes (if more than one specified)
  if (filters?.themes && filters.themes.length > 1) {
    const otherThemes = filters.themes.slice(1);
    puzzles = puzzles.filter((puzzle) => otherThemes.every((theme) => puzzle.themes.includes(theme)));
  }

  // Client-side search filtering
  if (filters?.searchQuery) {
    const searchLower = filters.searchQuery.toLowerCase();
    puzzles = puzzles.filter(
      (puzzle) =>
        puzzle.id.toLowerCase().includes(searchLower) ||
        puzzle.themes.some((t) => t.toLowerCase().includes(searchLower))
    );
  }

  // Check if there are more results
  const hasMore = snapshot.docs.length > pageSize;
  if (hasMore) {
    puzzles = puzzles.slice(0, pageSize);
  }

  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[Math.min(snapshot.docs.length - 1, pageSize - 1)] : null;

  return {
    puzzles,
    lastDoc: newLastDoc,
    hasMore,
  };
}

/**
 * Fetch all puzzles (use with caution - consider pagination for large datasets)
 */
export async function fetchAllPuzzles(
  options: {
    filters?: PuzzleFilters;
    sort?: PuzzleSortOption;
    maxResults?: number;
  } = {}
): Promise<Puzzle[]> {
  const { maxResults = 1000 } = options;
  const allPuzzles: Puzzle[] = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let hasMore = true;

  while (hasMore && allPuzzles.length < maxResults) {
    const result = await fetchPuzzles({
      ...options,
      pageSize: Math.min(500, maxResults - allPuzzles.length),
      lastDoc,
    });

    allPuzzles.push(...result.puzzles);
    lastDoc = result.lastDoc;
    hasMore = result.hasMore;
  }

  return allPuzzles;
}

/**
 * Fetch a single puzzle by ID
 */
export async function fetchPuzzleById(puzzleId: string): Promise<Puzzle | null> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const puzzleRef = doc(db, PUZZLES_COLLECTION, puzzleId);
  const puzzleDoc = await getDoc(puzzleRef);

  if (!puzzleDoc.exists()) {
    return null;
  }

  const data = puzzleDoc.data();
  return {
    id: puzzleDoc.id,
    fen: data.fen,
    moves: data.moves,
    rating: data.rating,
    ratingDeviation: data.ratingDeviation,
    popularity: data.popularity,
    nbPlays: data.nbPlays,
    themes: data.themes,
    gameUrl: data.gameUrl,
    openingTags: data.openingTags,
  };
}

/**
 * Fetch a random puzzle matching the given criteria
 */
export async function fetchRandomPuzzle(filters?: PuzzleFilters): Promise<Puzzle | null> {
  // Fetch a batch and pick one randomly
  const result = await fetchPuzzles({
    filters,
    sort: { field: "popularity", direction: "desc" },
    pageSize: 100,
  });

  if (result.puzzles.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * result.puzzles.length);
  return result.puzzles[randomIndex];
}

/**
 * Fetch puzzles by theme
 */
export async function fetchPuzzlesByTheme(
  theme: PuzzleTheme,
  options: {
    sort?: PuzzleSortOption;
    pageSize?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  } = {}
): Promise<PuzzleQueryResult> {
  return fetchPuzzles({
    ...options,
    filters: { themes: [theme] },
  });
}

/**
 * Fetch puzzles by difficulty
 */
export async function fetchPuzzlesByDifficulty(
  difficulty: PuzzleDifficulty,
  options: {
    sort?: PuzzleSortOption;
    pageSize?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  } = {}
): Promise<PuzzleQueryResult> {
  return fetchPuzzles({
    ...options,
    filters: { difficulty },
  });
}

/**
 * Get puzzle count (approximate - requires reading docs)
 * For accurate counts, consider using a counter document
 */
export async function getPuzzleCount(filters?: PuzzleFilters): Promise<number> {
  // This is an expensive operation - in production, use a counter document
  const puzzles = await fetchAllPuzzles({ filters, maxResults: 10000 });
  return puzzles.length;
}
