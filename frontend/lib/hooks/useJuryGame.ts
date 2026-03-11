"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import JuryGame from "../contracts/JuryGame";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../utils/toast";
import type {
  GameState,
  LeaderboardEntry,
  Question,
  QuestionResults,
} from "../contracts/types";

/**
 * Hook to get the JuryGame contract instance
 */
export function useJuryGameContract(): JuryGame | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  const contract = useMemo(() => {
    if (!contractAddress) return null;
    return new JuryGame(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);

  return contract;
}

// ─── Read Hooks ──────────────────────────────────────────────────

export function useGameState() {
  const contract = useJuryGameContract();

  return useQuery<GameState, Error>({
    queryKey: ["gameState"],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve({
          state: "lobby" as const,
          current_question_index: 0,
          total_questions: 0,
        });
      }
      return contract.getGameState();
    },
    refetchInterval: 3000,
    enabled: !!contract,
  });
}

export function usePlayerCount() {
  const contract = useJuryGameContract();

  return useQuery<number, Error>({
    queryKey: ["playerCount"],
    queryFn: () => {
      if (!contract) return Promise.resolve(0);
      return contract.getPlayerCount();
    },
    refetchInterval: 5000,
    enabled: !!contract,
  });
}

export function usePlayers() {
  const contract = useJuryGameContract();

  return useQuery<Record<string, string>, Error>({
    queryKey: ["players"],
    queryFn: () => {
      if (!contract) return Promise.resolve({});
      return contract.getPlayers();
    },
    refetchInterval: 5000,
    enabled: !!contract,
  });
}

export function useCurrentQuestion() {
  const contract = useJuryGameContract();
  const { data: gameState } = useGameState();

  return useQuery<Question | null, Error>({
    queryKey: ["currentQuestion", gameState?.current_question_index],
    queryFn: async () => {
      if (!contract || !gameState) return null;
      if (
        gameState.state !== "question" &&
        gameState.state !== "revealing"
      )
        return null;
      return contract.getQuestion(gameState.current_question_index);
    },
    refetchInterval: 3000,
    enabled:
      !!contract &&
      !!gameState &&
      (gameState.state === "question" || gameState.state === "revealing"),
  });
}

export function useLeaderboard() {
  const contract = useJuryGameContract();

  return useQuery<LeaderboardEntry[], Error>({
    queryKey: ["leaderboard"],
    queryFn: () => {
      if (!contract) return Promise.resolve([]);
      return contract.getLeaderboard();
    },
    refetchInterval: 5000,
    enabled: !!contract,
  });
}

export function useQuestionResults(questionIndex: number | null) {
  const contract = useJuryGameContract();

  return useQuery<QuestionResults, Error>({
    queryKey: ["questionResults", questionIndex],
    queryFn: () => {
      if (!contract || questionIndex === null)
        return Promise.resolve({ resolved: false });
      return contract.getQuestionResults(questionIndex);
    },
    refetchInterval: 3000,
    enabled: !!contract && questionIndex !== null,
  });
}

export function usePlayerUsername(address: string | null) {
  const contract = useJuryGameContract();

  return useQuery<string, Error>({
    queryKey: ["playerUsername", address],
    queryFn: () => {
      if (!contract || !address) return Promise.resolve("");
      return contract.getPlayerUsername(address);
    },
    enabled: !!contract && !!address,
    staleTime: 10000,
  });
}

export function useIsAdmin(address: string | null) {
  const contract = useJuryGameContract();

  return useQuery<boolean, Error>({
    queryKey: ["isAdmin", address],
    queryFn: () => {
      if (!contract || !address) return Promise.resolve(false);
      return contract.isAdmin(address);
    },
    enabled: !!contract && !!address,
    staleTime: 60000,
  });
}

export function useAllQuestions() {
  const contract = useJuryGameContract();

  return useQuery<Question[], Error>({
    queryKey: ["allQuestions"],
    queryFn: () => {
      if (!contract) return Promise.resolve([]);
      return contract.getAllQuestions();
    },
    refetchInterval: 5000,
    enabled: !!contract,
  });
}

// ─── Write Hooks ─────────────────────────────────────────────────

export function useRegisterPlayer() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();
  const [isRegistering, setIsRegistering] = useState(false);

  const mutation = useMutation({
    mutationFn: async (username: string) => {
      if (!contract) throw new Error("Contract not configured");
      setIsRegistering(true);
      return contract.registerPlayer(username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerUsername"] });
      queryClient.invalidateQueries({ queryKey: ["playerCount"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setIsRegistering(false);
      success("Welcome aboard!", {
        description: "You've been registered. Waiting for the game to start...",
      });
    },
    onError: (err: any) => {
      setIsRegistering(false);
      error("Registration failed", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isRegistering, register: mutation.mutate };
}

export function useSubmitAnswer() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      questionIndex,
      choice,
      pointsSnapshot,
    }: {
      questionIndex: number;
      choice: string;
      pointsSnapshot: number;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      setIsSubmitting(true);
      return contract.submitAnswer(questionIndex, choice, pointsSnapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setIsSubmitting(false);
      success("Answer submitted!", {
        description: "Waiting for the results...",
      });
    },
    onError: (err: any) => {
      setIsSubmitting(false);
      error("Failed to submit answer", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isSubmitting, submitAnswer: mutation.mutate };
}

// ─── Admin Hooks ─────────────────────────────────────────────────

export function useAddQuestion() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      optionA,
      optionB,
      optionC,
      optionD,
    }: {
      text: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      return contract.addQuestion(text, optionA, optionB, optionC, optionD);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allQuestions"] });
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      success("Question added!");
    },
    onError: (err: any) => {
      error("Failed to add question", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useGenerateQuestions() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      count,
      topic,
    }: {
      count: number;
      topic: string;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      setIsGenerating(true);
      return contract.generateRandomQuestions(count, topic);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allQuestions"] });
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      setIsGenerating(false);
      success("AI questions generated!", {
        description: "Questions have been added to the game.",
      });
    },
    onError: (err: any) => {
      setIsGenerating(false);
      error("Failed to generate questions", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isGenerating, generate: mutation.mutate };
}

export function useStartGame() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured");
      return contract.startGame();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      success("Game started!", {
        description: "Players can now see the first question.",
      });
    },
    onError: (err: any) => {
      error("Failed to start game", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useResolveQuestion() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionIndex: number) => {
      if (!contract) throw new Error("Contract not configured");
      return contract.resolveQuestion(questionIndex);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["questionResults"] });
      queryClient.invalidateQueries({ queryKey: ["currentQuestion"] });
      success("Question resolved!", {
        description: "Points have been awarded.",
      });
    },
    onError: (err: any) => {
      error("Failed to resolve question", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useAdvanceQuestion() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured");
      return contract.advanceQuestion();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      queryClient.invalidateQueries({ queryKey: ["currentQuestion"] });
      success("Next question!");
    },
    onError: (err: any) => {
      error("Failed to advance", {
        description: err?.message || "Please try again.",
      });
    },
  });
}

export function useEndGame() {
  const contract = useJuryGameContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured");
      return contract.endGame();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      success("Game ended!", {
        description: "Check the final leaderboard.",
      });
    },
    onError: (err: any) => {
      error("Failed to end game", {
        description: err?.message || "Please try again.",
      });
    },
  });
}
