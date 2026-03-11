"use client";

import React, { useState } from "react";
import { useRegisterPlayer } from "@/lib/hooks/useJuryGame";

export function UsernameForm() {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState("");
  const { register, isRegistering } = useRegisterPlayer();

  const validateUsername = (value: string) => {
    if (value.length < 3) return "At least 3 characters";
    if (value.length > 20) return "Max 20 characters";
    if (!/^[a-z0-9]+$/.test(value)) return "Lowercase letters & numbers only";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setUsername(value);
    setValidationError(validateUsername(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUsername(username);
    if (err) {
      setValidationError(err);
      return;
    }
    register(username);
  };

  return (
    <div className="username-form-container">
      <div className="username-form-card">
        <div className="form-icon">🎭</div>
        <h2>Choose Your Identity</h2>
        <p className="form-subtitle">Pick a unique username to join the Jury</p>
        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <span className="input-prefix">@</span>
            <input
              type="text"
              value={username}
              onChange={handleChange}
              placeholder="username"
              className="username-input"
              maxLength={20}
              disabled={isRegistering}
              autoFocus
            />
          </div>
          {validationError && username.length > 0 && (
            <p className="validation-error">{validationError}</p>
          )}
          <div className="username-rules">
            <span className={username.length >= 3 ? "rule-pass" : ""}>3+ chars</span>
            <span className={/^[a-z0-9]*$/.test(username) && username.length > 0 ? "rule-pass" : ""}>lowercase</span>
            <span className={!/\s/.test(username) && username.length > 0 ? "rule-pass" : ""}>no spaces</span>
          </div>
          <button
            type="submit"
            className="btn-primary btn-lg"
            disabled={isRegistering || !!validationError || username.length === 0}
          >
            {isRegistering ? (
              <span className="btn-loading">
                <span className="spinner" /> Registering...
              </span>
            ) : (
              "Join the Jury"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
