import { Timestamp } from "firebase/firestore";

export type Familiarity = "beginner" | "novice" | "expert";

export interface UserElos {
  puzzle: number;
  openings: number;
  game: number;
}

export interface UserProfile {
  familiarity: Familiarity;
  elos: UserElos;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const ELO_DEFAULTS: Record<Familiarity, number> = {
  beginner: 800,
  novice: 1200,
  expert: 1600,
};
