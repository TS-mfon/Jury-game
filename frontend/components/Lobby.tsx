"use client";

import React from "react";
import { usePlayerCount, usePlayers } from "@/lib/hooks/useJuryGame";

export function Lobby() {
  const { data: playerCount = 0 } = usePlayerCount();
  const { data: players = {} } = usePlayers();
  const playerNames = Object.keys(players);

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <div className="lobby-pulse-ring" />
        <div className="lobby-icon">⏳</div>
        <h2>Waiting for the Game</h2>
        <p className="lobby-subtitle">
          The admin will start the game soon. Hold tight!
        </p>

        <div className="lobby-stats">
          <div className="stat-card">
            <span className="stat-number">{playerCount}</span>
            <span className="stat-label">Players Joined</span>
          </div>
        </div>

        <div className="lobby-players">
          <h3>Players in Lobby</h3>
          <div className="player-chips">
            {playerNames.slice(0, 50).map((name) => (
              <span key={name} className="player-chip">
                @{name}
              </span>
            ))}
            {playerNames.length > 50 && (
              <span className="player-chip player-chip-more">
                +{playerNames.length - 50} more
              </span>
            )}
          </div>
        </div>

        <div className="lobby-waiting-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
