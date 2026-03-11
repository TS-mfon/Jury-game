/**
 * TypeScript types for GenLayer Jury Game contract
 */

export interface Question {
  index: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct?: string; // comma-separated correct choices after resolution
}

export interface GameState {
  state: "lobby" | "question" | "revealing" | "finished";
  current_question_index: number;
  total_questions: number;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  streak: number;
}

export interface PlayerInfo {
  username: string;
  address: string;
  score: number;
  streak: number;
}

export interface QuestionResults {
  resolved: boolean;
  correct?: string;
  votes?: {
    a: number;
    b: number;
    c: number;
    d: number;
  };
  total_votes?: number;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
