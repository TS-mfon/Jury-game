"use client";

import { useState } from "react";
import { useWallet } from "@/lib/genlayer/wallet";
import {
  useGameState,
  usePlayerUsername,
  useIsAdmin,
} from "@/lib/hooks/useJuryGame";
import { UsernameForm } from "@/components/UsernameForm";
import { Lobby } from "@/components/Lobby";
import { QuestionCard } from "@/components/QuestionCard";
import { Leaderboard } from "@/components/Leaderboard";
import { AdminPanel } from "@/components/AdminPanel";
import { GameHeader } from "@/components/GameHeader";
import { connectMetaMask } from "@/lib/genlayer/client";

export default function Home() {
  const { address, isConnected, isLoading: walletLoading } = useWallet();
  const { data: gameState, isLoading: gsLoading } = useGameState();
  const { data: username = "", isLoading: unLoading } = usePlayerUsername(address);
  const { data: isAdmin = false } = useIsAdmin(address);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectMetaMask();
    } catch {
      // handled by wallet provider toasts
    }
    setConnecting(false);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "genmochi") {
      setShowAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword("");
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  };

  // Loading state
  if (walletLoading || (isConnected && (gsLoading || unLoading))) {
    return (
      <main className="main-container">
        <div className="loading-screen">
          <div className="loading-icon">🎭</div>
          <div className="loading-dots">
            <span />
            <span />
            <span />
          </div>
          <p>Loading Jury Game...</p>
        </div>
      </main>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <main className="main-container">
        <div className="connect-screen">
          <div className="connect-card">
            <div className="connect-logo">🎭</div>
            <h1>Jury Game</h1>
            <p className="connect-tagline">
              The multiplayer game where the majority rules
            </p>
            <p className="connect-description">
              Answer questions, match the crowd, earn speed points, and climb the
              leaderboard. <strong>400+ players</strong> battle for the top!
            </p>
            <button
              className="btn-primary btn-lg btn-glow"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <span className="btn-loading">
                  <span className="spinner" /> Connecting...
                </span>
              ) : (
                "🦊 Connect MetaMask"
              )}
            </button>
            <div className="connect-features">
              <div className="feature">
                <span>⚡</span>
                <p>Speed-based scoring</p>
              </div>
              <div className="feature">
                <span>🔥</span>
                <p>Streak bonuses</p>
              </div>
              <div className="feature">
                <span>🏆</span>
                <p>Live leaderboard</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const renderAdminLogin = () => {
    if (!showAdminLogin) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ marginBottom: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>Admin Access</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>Enter the access password to manage the game.</p>
          <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="form-input"
              style={{ marginBottom: '8px' }}
              autoFocus
            />
            <div style={{ minHeight: '24px', marginBottom: '16px' }}>
              {passwordError && <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{passwordError}</span>}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-ghost" onClick={() => setShowAdminLogin(false)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>Login</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Admin Panel View
  if (showAdmin) {
    return (
      <main className="main-container">
        {username && <GameHeader username={username} />}
        <button
          className="btn-ghost admin-toggle"
          onClick={() => setShowAdmin(false)}
          style={{ marginTop: username ? 0 : '24px' }}
        >
          ← Back to Game
        </button>
        {!isAdmin && (
          <div style={{ background: 'rgba(248, 113, 113, 0.15)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
            <strong>Warning:</strong> Your connected wallet is not the admin of this contract. You can view the panel, but transactions will fail.
          </div>
        )}
        <AdminPanel />
      </main>
    );
  }

  // Connected but no username yet
  if (!username) {
    return (
      <main className="main-container">
        <UsernameForm />
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button className="btn-ghost" onClick={() => setShowAdminLogin(true)}>🔒 Admin Access</button>
        </div>
        {renderAdminLogin()}
      </main>
    );
  }

  const state = gameState?.state || "lobby";

  return (
    <main className="main-container">
      <GameHeader username={username} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 0 0 0' }}>
        <button
          className="btn-ghost"
          onClick={() => setShowAdminLogin(true)}
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          🔒 Admin Access
        </button>
      </div>

      {state === "lobby" && <Lobby />}

      {(state === "question" || state === "revealing") && (
        <div className="game-active-layout">
          <div className="game-main">
            <QuestionCard />
          </div>
          <aside className="game-sidebar">
            <Leaderboard compact />
          </aside>
        </div>
      )}

      {state === "finished" && (
        <div className="finished-layout">
          <div className="finished-header">
            <h1>🏁 Game Over!</h1>
            <p>Here are the final standings</p>
          </div>
          <Leaderboard />
        </div>
      )}

      {renderAdminLogin()}
    </main>
  );
}
