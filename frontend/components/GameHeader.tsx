"use client";

import React from "react";
import { useGameState, useLeaderboard } from "@/lib/hooks/useJuryGame";

interface GameHeaderProps {
  username: string;
}

export function GameHeader({ username }: GameHeaderProps) {
  const { data: gameState } = useGameState();
  const { data: leaderboard = [] } = useLeaderboard();

  const myEntry = leaderboard.find((e) => e.username === username);
  const myRank = leaderboard.findIndex((e) => e.username === username) + 1;

  return (
    <div className="game-header">
      <div className="gh-left">
        <span className="gh-logo">🎭</span>
        <span className="gh-title">Jury Game</span>
      </div>

      <div className="gh-center">
        {gameState?.state === "question" && (
          <span className="gh-question-badge">
            Q{(gameState.current_question_index ?? 0) + 1} / {gameState.total_questions}
          </span>
        )}
        {gameState?.state === "revealing" && (
          <span className="gh-reveal-badge">📊 Results</span>
        )}
        {gameState?.state === "finished" && (
          <span className="gh-finished-badge">🏁 Game Over</span>
        )}
      </div>

      <div className="gh-right">
        {myEntry && (
          <>
            {myEntry.streak >= 2 && (
              <span className="gh-streak">🔥{myEntry.streak}</span>
            )}
            <span className="gh-score">{myEntry.score.toLocaleString()} pts</span>
            {myRank > 0 && <span className="gh-rank">#{myRank}</span>}
          </>
        )}
        <span className="gh-user">@{username}</span>
      </div>
    </div>
  );
}
