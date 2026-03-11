"use client";

import React from "react";
import { useLeaderboard } from "@/lib/hooks/useJuryGame";

export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const { data: entries = [] } = useLeaderboard();

  if (entries.length === 0) {
    return (
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">🏆 Leaderboard</h2>
        <p className="leaderboard-empty">No scores yet. Play to earn points!</p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 Leaderboard</h2>

      {/* Podium for top 3 */}
      {!compact && top3.length > 0 && (
        <div className="podium">
          {podiumOrder.map((entry, i) => {
            if (!entry) return null;
            const rank = entries.indexOf(entry) + 1;
            const medals = ["👑", "🥈", "🥉"];
            const heights = ["podium-second", "podium-first", "podium-third"];
            const displayIndex = [1, 0, 2]; // map visual position to rank index

            return (
              <div
                key={entry.username}
                className={`podium-place ${heights[i]}`}
              >
                <div className="podium-medal">
                  {medals[displayIndex[i]]}
                </div>
                <div className="podium-avatar">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <div className="podium-name">@{entry.username}</div>
                <div className="podium-score">{entry.score.toLocaleString()}</div>
                {entry.streak > 0 && (
                  <div className="podium-streak">🔥 {entry.streak}</div>
                )}
                <div className={`podium-pillar podium-pillar-${rank}`}>
                  <span className="podium-rank">#{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table for remaining players */}
      <div className="leaderboard-table">
        {(compact ? entries : rest).map((entry, i) => {
          const rank = compact ? i + 1 : i + 4;
          return (
            <div key={entry.username} className="leaderboard-row">
              <span className="lb-rank">#{rank}</span>
              <span className="lb-avatar">
                {entry.username.charAt(0).toUpperCase()}
              </span>
              <span className="lb-name">@{entry.username}</span>
              {entry.streak > 0 && (
                <span className="lb-streak">🔥{entry.streak}</span>
              )}
              <span className="lb-score">{entry.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
