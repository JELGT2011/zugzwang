import { Timestamp } from "firebase/firestore";

export type Familiarity = "beginner" | "novice" | "expert";

export type MoveMethod = "drag" | "click" | "both";

export interface UserElos {
  puzzle: number;
  openings: number;
  game: number;
}

export interface GameplaySettings {
  moveMethod: MoveMethod;
}

export interface UserProfile {
  familiarity: Familiarity;
  elos: UserElos;
  gameplay?: GameplaySettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const ELO_DEFAULTS: Record<Familiarity, number> = {
  beginner: 800,
  novice: 1200,
  expert: 1600,
};

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettings = {
  moveMethod: "both",
};
