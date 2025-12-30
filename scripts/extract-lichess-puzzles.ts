/**
 * Script to extract a curated sample of puzzles from the Lichess database
 * Run with: npx tsx scripts/extract-puzzles.ts
 */

import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";

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

// Difficulty buckets - we want puzzles across all levels
const DIFFICULTY_BUCKETS = {
  beginner: { min: 400, max: 1000, target: 15 },
  easy: { min: 1000, max: 1400, target: 20 },
  medium: { min: 1400, max: 1800, target: 25 },
  hard: { min: 1800, max: 2200, target: 20 },
  expert: { min: 2200, max: 2600, target: 15 },
  master: { min: 2600, max: 3500, target: 5 },
};

// Popular themes we want to ensure good coverage of
const PRIORITY_THEMES = [
  "fork",
  "pin",
  "discoveredAttack",
  "backRankMate",
  "sacrifice",
  "mateIn1",
  "mateIn2",
  "mateIn3",
  "deflection",
  "skewer",
  "doubleCheck",
  "promotion",
  "attraction",
  "clearance",
  "xRayAttack",
  "zugzwang",
];

async function extractPuzzles() {
  const csvPath = path.join(process.cwd(), "data", "lichess_db_puzzle.csv");
  const outputPath = path.join(process.cwd(), "src", "data", "puzzles.ts");

  console.log("Reading puzzles from:", csvPath);

  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found! Please decompress the database first.");
    console.error("Run: zstd -d data/lichess_db_puzzle.csv.zst");
    process.exit(1);
  }

  // Initialize buckets
  const buckets: Record<string, Puzzle[]> = {};
  for (const key of Object.keys(DIFFICULTY_BUCKETS)) {
    buckets[key] = [];
  }

  // Theme-specific collection to ensure coverage
  const themeCollection: Record<string, Puzzle[]> = {};
  for (const theme of PRIORITY_THEMES) {
    themeCollection[theme] = [];
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let isHeader = true;

  console.log("Processing puzzles...");

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    lineCount++;
    if (lineCount % 500000 === 0) {
      console.log(`Processed ${lineCount.toLocaleString()} puzzles...`);
    }

    // Parse CSV line (handling potential commas in fields)
    const fields = parseCSVLine(line);
    if (fields.length < 8) continue;

    const [id, fen, moves, rating, ratingDeviation, popularity, nbPlays, themes, gameUrl, openingTags] = fields;

    const ratingNum = parseInt(rating, 10);
    const popularityNum = parseInt(popularity, 10);
    const nbPlaysNum = parseInt(nbPlays, 10);

    // Skip puzzles with very low popularity or few plays
    if (popularityNum < 70 || nbPlaysNum < 100) continue;

    // Create puzzle object
    const puzzle: Puzzle = {
      id,
      fen,
      moves: moves.split(" "),
      rating: ratingNum,
      ratingDeviation: parseInt(ratingDeviation, 10),
      popularity: popularityNum,
      nbPlays: nbPlaysNum,
      themes: themes.split(" ").filter(Boolean),
      ...(gameUrl && { gameUrl }),
      ...(openingTags && { openingTags: openingTags.split(" ").filter(Boolean) }),
    };

    // Add to appropriate difficulty bucket
    for (const [bucketName, { min, max, target }] of Object.entries(DIFFICULTY_BUCKETS)) {
      if (ratingNum >= min && ratingNum < max) {
        const bucket = buckets[bucketName];
        
        // Prioritize puzzles with high popularity and plays
        if (bucket.length < target) {
          bucket.push(puzzle);
        } else if (popularityNum > 90 && nbPlaysNum > 10000) {
          // Replace a random puzzle with this higher quality one
          const replaceIndex = Math.floor(Math.random() * bucket.length);
          if (bucket[replaceIndex].popularity < popularityNum) {
            bucket[replaceIndex] = puzzle;
          }
        }
        break;
      }
    }

    // Also collect theme-specific puzzles (just a few per theme)
    for (const theme of PRIORITY_THEMES) {
      if (puzzle.themes.includes(theme) && themeCollection[theme].length < 5) {
        themeCollection[theme].push(puzzle);
      }
    }
  }

  console.log(`\nFinished processing ${lineCount.toLocaleString()} puzzles`);

  // Combine all puzzles
  const allPuzzles: Puzzle[] = [];
  const seenIds = new Set<string>();

  // Add from difficulty buckets
  for (const [bucketName, puzzles] of Object.entries(buckets)) {
    console.log(`${bucketName}: ${puzzles.length} puzzles`);
    for (const puzzle of puzzles) {
      if (!seenIds.has(puzzle.id)) {
        allPuzzles.push(puzzle);
        seenIds.add(puzzle.id);
      }
    }
  }

  // Add theme-specific puzzles that aren't already included
  for (const [theme, puzzles] of Object.entries(themeCollection)) {
    let added = 0;
    for (const puzzle of puzzles) {
      if (!seenIds.has(puzzle.id)) {
        allPuzzles.push(puzzle);
        seenIds.add(puzzle.id);
        added++;
      }
    }
    if (added > 0) {
      console.log(`Added ${added} extra puzzles for theme: ${theme}`);
    }
  }

  // Sort by rating
  allPuzzles.sort((a, b) => a.rating - b.rating);

  console.log(`\nTotal unique puzzles: ${allPuzzles.length}`);

  // Generate TypeScript file
  const tsContent = `import type { Puzzle } from "@/types/puzzle";

// Curated puzzle collection from Lichess database
// Generated on ${new Date().toISOString()}
// Total puzzles: ${allPuzzles.length}

export const puzzles: Puzzle[] = ${JSON.stringify(allPuzzles, null, 2)};

export default puzzles;
`;

  fs.writeFileSync(outputPath, tsContent);
  console.log(`\nWritten to: ${outputPath}`);

  // Print some stats
  const themeStats: Record<string, number> = {};
  for (const puzzle of allPuzzles) {
    for (const theme of puzzle.themes) {
      themeStats[theme] = (themeStats[theme] || 0) + 1;
    }
  }

  console.log("\nTheme distribution:");
  const sortedThemes = Object.entries(themeStats).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [theme, count] of sortedThemes) {
    console.log(`  ${theme}: ${count}`);
  }
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

extractPuzzles().catch(console.error);
