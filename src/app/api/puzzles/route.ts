import { NextResponse } from "next/server";

/**
 * API Route: GET /api/puzzles
 *
 * This API route is deprecated in favor of direct Firestore queries from the client.
 * The client-side approach works because:
 * 1. Users must be authenticated to access puzzles (Firestore rules require auth)
 * 2. Firebase SDK handles authentication automatically
 *
 * If you need server-side puzzle access (e.g., for SSR, SEO, or public APIs),
 * you would need to:
 * 1. Install firebase-admin
 * 2. Initialize with a service account key
 * 3. Query Firestore using the admin SDK (bypasses security rules)
 *
 * Example with admin SDK:
 * ```
 * import { initializeApp, cert, getApps } from 'firebase-admin/app';
 * import { getFirestore } from 'firebase-admin/firestore';
 *
 * if (getApps().length === 0) {
 *   initializeApp({
 *     credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')),
 *   });
 * }
 *
 * const adminDb = getFirestore();
 * const puzzlesSnapshot = await adminDb.collection('puzzles').limit(100).get();
 * ```
 */

export async function GET() {
  return NextResponse.json(
    {
      error: "This API endpoint is deprecated. Please use client-side Firestore queries with authentication.",
      message: "Sign in to access puzzles directly from Firestore.",
      puzzles: [],
    },
    { status: 410 } // Gone
  );
}
