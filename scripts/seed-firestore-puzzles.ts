/**
 * Script to seed Firestore with puzzles from the Lichess database CSV
 * Uses BulkWriter for high-throughput concurrent uploads
 *
 * The Lichess puzzle database contains ~5.6 million puzzles.
 *
 * Prerequisites:
 * 1. Decompress the puzzle database:
 *      zstd -d data/lichess_db_puzzle.csv.zst
 *
 * 2. Download a service account key from Firebase Console:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate new private key"
 *    - Save as `serviceAccountKey.json` in the project root (gitignored)
 *
 * Options:
 *   --limit <number>       Limit the number of puzzles to upload (default: all)
 *   --min-popularity <n>   Minimum popularity score 0-100 (default: 70)
 *   --min-plays <n>        Minimum number of plays (default: 100)
 *   --sort <field>         Sort by: popularity, plays, rating (default: none)
 *   --sort-desc            Sort descending (default: ascending)
 *
 * Memory Note:
 *   When using --sort with large datasets, puzzles are loaded into memory.
 *   You may need to increase Node.js memory allocation:
 *
 *     NODE_OPTIONS="--max-old-space-size=8192" npx tsx scripts/seed-firestore-puzzles.ts ...
 *
 *   Without --sort, the script streams puzzles directly without loading into memory.
 *
 * Examples:
 *   # Upload 10,000 most popular puzzles
 *   NODE_OPTIONS="--max-old-space-size=8192" npx tsx scripts/seed-firestore-puzzles.ts --limit 10000 --sort popularity --sort-desc
 *
 *   # Upload 100,000 most played puzzles with stricter filters (reduces memory)
 *   NODE_OPTIONS="--max-old-space-size=8192" npx tsx scripts/seed-firestore-puzzles.ts --limit 100000 --sort plays --sort-desc --min-popularity 85 --min-plays 1000
 *
 *   # Upload puzzles without sorting (streams directly, low memory usage)
 *   npx tsx scripts/seed-firestore-puzzles.ts --limit 100000 --min-popularity 90
 *
 *   # Upload easiest puzzles first (by rating ascending)
 *   NODE_OPTIONS="--max-old-space-size=8192" npx tsx scripts/seed-firestore-puzzles.ts --limit 10000 --sort rating
 *
 *   # Upload hardest puzzles (by rating descending)
 *   NODE_OPTIONS="--max-old-space-size=8192" npx tsx scripts/seed-firestore-puzzles.ts --limit 10000 --sort rating --sort-desc
 */

import { cert, initializeApp, ServiceAccount } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string[];
  gameUrl?: string;
  openingTags?: string[];
}

interface UploadStats {
  total: number;
  filtered: number;
  uploaded: number;
  skipped: number;
  errors: number;
}

type SortField = "popularity" | "plays" | "rating" | null;

// Parse command line arguments
function parseArgs(): {
  limit: number | null;
  minPopularity: number;
  minPlays: number;
  sortBy: SortField;
  sortDesc: boolean;
} {
  const args = process.argv.slice(2);
  const options = {
    limit: null as number | null,
    minPopularity: 70,
    minPlays: 100,
    sortBy: null as SortField,
    sortDesc: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit":
        options.limit = parseInt(args[++i], 10);
        break;
      case "--min-popularity":
        options.minPopularity = parseInt(args[++i], 10);
        break;
      case "--min-plays":
        options.minPlays = parseInt(args[++i], 10);
        break;
      case "--sort":
        const sortArg = args[++i];
        if (sortArg === "popularity" || sortArg === "plays" || sortArg === "rating") {
          options.sortBy = sortArg;
        } else {
          console.error(`Invalid sort field: ${sortArg}. Use: popularity, plays, or rating`);
          process.exit(1);
        }
        break;
      case "--sort-desc":
        options.sortDesc = true;
        break;
    }
  }

  return options;
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

// Parse a CSV line into a Puzzle object
function parsePuzzle(line: string): Puzzle | null {
  const fields = parseCSVLine(line);
  if (fields.length < 8) return null;

  const [id, fen, moves, rating, ratingDeviation, popularity, nbPlays, themes, gameUrl, openingTags] = fields;

  // Validate required fields
  if (!id || !fen || !moves || !rating) return null;

  const puzzle: Puzzle = {
    id,
    fen,
    moves: moves.split(" ").filter(Boolean),
    rating: parseInt(rating, 10),
    ratingDeviation: parseInt(ratingDeviation, 10) || 0,
    popularity: parseInt(popularity, 10) || 0,
    nbPlays: parseInt(nbPlays, 10) || 0,
    themes: themes?.split(" ").filter(Boolean) || [],
  };

  // Add optional fields only if they have values
  if (gameUrl) puzzle.gameUrl = gameUrl;
  if (openingTags) puzzle.openingTags = openingTags.split(" ").filter(Boolean);

  return puzzle;
}

// Sort puzzles by field
function sortPuzzles(puzzles: Puzzle[], sortBy: SortField, desc: boolean): Puzzle[] {
  if (!sortBy) return puzzles;

  const getSortValue = (puzzle: Puzzle): number => {
    switch (sortBy) {
      case "popularity":
        return puzzle.popularity;
      case "plays":
        return puzzle.nbPlays;
      case "rating":
        return puzzle.rating;
      default:
        return 0;
    }
  };

  return puzzles.sort((a, b) => {
    const aVal = getSortValue(a);
    const bVal = getSortValue(b);
    return desc ? bVal - aVal : aVal - bVal;
  });
}

// Upload puzzles using BulkWriter for high concurrency
async function uploadPuzzles(
  db: Firestore,
  puzzles: Puzzle[],
  stats: UploadStats,
  startTime: number
): Promise<void> {
  const bulkWriter = db.bulkWriter();

  // Handle errors gracefully
  bulkWriter.onWriteError((error) => {
    if (error.failedAttempts < 3) {
      return true; // Retry
    }
    stats.errors++;
    console.error(`  ⚠️ Failed to write ${error.documentRef.path}: ${error.code}`);
    return false;
  });

  let lastProgressTime = Date.now();

  // Queue all writes
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    const docRef = db.collection("puzzles").doc(puzzle.id);

    bulkWriter
      .set(docRef, puzzle)
      .then(() => {
        stats.uploaded++;

        // Progress update every 2 seconds
        const now = Date.now();
        if (now - lastProgressTime > 2000) {
          const elapsed = (now - startTime) / 1000;
          const rate = stats.uploaded / elapsed;
          const pct = ((stats.uploaded / puzzles.length) * 100).toFixed(1);
          console.log(
            `  📤 Progress: ${stats.uploaded.toLocaleString()}/${puzzles.length.toLocaleString()} (${pct}%) | ` +
            `${rate.toFixed(0)} docs/sec`
          );
          lastProgressTime = now;
        }
      })
      .catch(() => {
        // Error already handled by onWriteError
      });
  }

  // Wait for all writes to complete
  await bulkWriter.close();
}

async function seedFirestore() {
  const options = parseArgs();

  console.log("🧩 Firestore Puzzle Seeder");
  console.log("=".repeat(50));
  console.log(`Options:`);
  console.log(`  Limit: ${options.limit ?? "all"}`);
  console.log(`  Min popularity: ${options.minPopularity}`);
  console.log(`  Min plays: ${options.minPlays}`);
  console.log(`  Sort by: ${options.sortBy ?? "none"} ${options.sortBy ? (options.sortDesc ? "(desc)" : "(asc)") : ""}`);
  console.log("=".repeat(50));

  // Check for CSV file
  const csvPath = path.join(process.cwd(), "data", "lichess_db_puzzle.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV file not found!");
    console.error("   Please decompress the database first:");
    console.error("   zstd -d data/lichess_db_puzzle.csv.zst");
    process.exit(1);
  }

  // Check for service account key
  const serviceAccountPath = path.join(process.cwd(), "serviceAccountKey.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Service account key not found!");
    console.error("   Please download from Firebase Console:");
    console.error("   1. Go to Project Settings > Service Accounts");
    console.error('   2. Click "Generate new private key"');
    console.error("   3. Save as `serviceAccountKey.json` in the project root");
    process.exit(1);
  }

  // Initialize Firebase Admin
  console.log("\n🔥 Initializing Firebase Admin...");
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  const app = initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
  });

  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  console.log(`✅ Connected to project: ${serviceAccount.project_id}`);

  // Initialize stats
  const stats: UploadStats = {
    total: 0,
    filtered: 0,
    uploaded: 0,
    skipped: 0,
    errors: 0,
  };

  const startTime = Date.now();

  // Collect puzzles (always needed for sorting, or when streaming with limit)
  let puzzlesToUpload: Puzzle[] = [];

  console.log("\n📖 Reading puzzles from CSV...\n");

  // Create readline interface
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let lastProgressTime = startTime;
  const needsSorting = options.sortBy !== null;

  for await (const line of rl) {
    // Skip header
    if (isHeader) {
      isHeader = false;
      continue;
    }

    stats.total++;

    // Progress update every 5 seconds during reading
    const now = Date.now();
    if (now - lastProgressTime > 5000) {
      console.log(`  📖 Read ${stats.total.toLocaleString()} lines, ${stats.filtered.toLocaleString()} match filters...`);
      lastProgressTime = now;
    }

    // Parse puzzle
    const puzzle = parsePuzzle(line);
    if (!puzzle) {
      stats.skipped++;
      continue;
    }

    // Apply filters
    if (puzzle.popularity < options.minPopularity || puzzle.nbPlays < options.minPlays) {
      stats.skipped++;
      continue;
    }

    stats.filtered++;

    if (needsSorting) {
      // Collect all matching puzzles for sorting
      puzzlesToUpload.push(puzzle);
    } else {
      // No sorting - collect up to limit
      puzzlesToUpload.push(puzzle);
      if (options.limit && puzzlesToUpload.length >= options.limit) {
        break;
      }
    }
  }

  console.log(`\n📊 Found ${stats.filtered.toLocaleString()} puzzles matching filters`);

  // Sort if needed
  if (needsSorting) {
    console.log(`🔄 Sorting by ${options.sortBy} (${options.sortDesc ? "descending" : "ascending"})...`);
    puzzlesToUpload = sortPuzzles(puzzlesToUpload, options.sortBy, options.sortDesc);
  }

  // Apply limit after sorting
  if (options.limit && puzzlesToUpload.length > options.limit) {
    puzzlesToUpload = puzzlesToUpload.slice(0, options.limit);
    console.log(`📋 Limited to top ${options.limit.toLocaleString()} puzzles`);
  }

  // Upload
  console.log(`\n📤 Uploading ${puzzlesToUpload.length.toLocaleString()} puzzles...\n`);
  await uploadPuzzles(db, puzzlesToUpload, stats, startTime);

  const elapsed = (Date.now() - startTime) / 1000;

  console.log("\n" + "=".repeat(50));
  console.log("📈 Final Statistics");
  console.log("=".repeat(50));
  console.log(`  Total lines read: ${stats.total.toLocaleString()}`);
  console.log(`  Matched filters: ${stats.filtered.toLocaleString()}`);
  console.log(`  Uploaded: ${stats.uploaded.toLocaleString()}`);
  console.log(`  Skipped (filtered): ${stats.skipped.toLocaleString()}`);
  if (stats.errors > 0) {
    console.log(`  Errors: ${stats.errors}`);
  }
  console.log(`  Time: ${elapsed.toFixed(1)}s`);
  if (stats.uploaded > 0) {
    console.log(`  Average rate: ${(stats.uploaded / elapsed).toFixed(0)} docs/sec`);
  }
  console.log("=".repeat(50));

  console.log("\n✅ Seeding complete!");

  process.exit(0);
}

seedFirestore().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
