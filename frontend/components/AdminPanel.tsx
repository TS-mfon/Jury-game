"use client";

import React, { useState } from "react";
import {
  useAddQuestion,
  useGenerateQuestions,
  useStartGame,
  useResolveQuestion,
  useAdvanceQuestion,
  useEndGame,
  useResetGame,
  useGameState,
  useAllQuestions,
  usePlayerCount,
} from "@/lib/hooks/useJuryGame";

export function AdminPanel() {
  const { data: gameState } = useGameState();
  const { data: questions = [] } = useAllQuestions();
  const { data: playerCount = 0 } = usePlayerCount();

  // Manual question form
  const [qText, setQText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");

  // AI generation form
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);

  const addQuestion = useAddQuestion();
  const { generate, isGenerating } = useGenerateQuestions();
  const startGame = useStartGame();
  const resolveQuestion = useResolveQuestion();
  const advanceQuestion = useAdvanceQuestion();
  const endGame = useEndGame();
  const resetGame = useResetGame();

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !optA || !optB || !optC || !optD) return;
    addQuestion.mutate({
      text: qText,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
    });
    setQText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic) return;
    generate({ count: aiCount, topic: aiTopic });
  };

  const state = gameState?.state || "lobby";

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>🎮 Admin Panel</h2>
        <div className="admin-status-bar">
          <span className={`status-badge status-${state}`}>{state.toUpperCase()}</span>
          <span className="status-info">👥 {playerCount} players</span>
          <span className="status-info">📝 {questions.length} questions</span>
        </div>
      </div>

      {/* Game Controls */}
      <div className="admin-section">
        <h3>Game Controls</h3>
        <div className="control-buttons">
          {state === "lobby" && (
            <button
              className="btn-primary btn-lg"
              onClick={() => startGame.mutate()}
              disabled={startGame.isPending || questions.length === 0}
            >
              {startGame.isPending ? "Starting..." : "🚀 Start Game"}
            </button>
          )}
          {state === "question" && (
            <button
              className="btn-warning btn-lg"
              onClick={() =>
                resolveQuestion.mutate(gameState!.current_question_index)
              }
              disabled={resolveQuestion.isPending}
            >
              {resolveQuestion.isPending
                ? "Resolving..."
                : `📊 Resolve Q${gameState!.current_question_index + 1}`}
            </button>
          )}
          {state === "revealing" && (
            <button
              className="btn-primary btn-lg"
              onClick={() => advanceQuestion.mutate()}
              disabled={advanceQuestion.isPending}
            >
              {advanceQuestion.isPending ? "Advancing..." : "⏭️ Next Question"}
            </button>
          )}
          {state !== "finished" && (
            <button
              className="btn-danger"
              onClick={() => endGame.mutate()}
              disabled={endGame.isPending}
            >
              {endGame.isPending ? "Ending..." : "🛑 End Game"}
            </button>
          )}
          {state === "finished" && (
            <button
              className="btn-primary btn-lg"
              onClick={() => resetGame.mutate()}
              disabled={resetGame.isPending}
            >
              {resetGame.isPending ? "Resetting..." : "🔄 Start Fresh Game"}
            </button>
          )}
        </div>
      </div>

      {/* Add Question Manually */}
      {(state === "lobby" || state === "question") && (
        <div className="admin-section">
          <h3>Add Question Manually</h3>
          <form onSubmit={handleAddQuestion} className="question-form">
            <div className="form-group">
              <label>Question</label>
              <input
                type="text"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="What is the best programming language?"
                className="form-input"
              />
            </div>
            <div className="options-form-grid">
              <div className="form-group">
                <label>A</label>
                <input
                  type="text"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  placeholder="Option A"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>B</label>
                <input
                  type="text"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  placeholder="Option B"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>C</label>
                <input
                  type="text"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                  placeholder="Option C"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>D</label>
                <input
                  type="text"
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                  placeholder="Option D"
                  className="form-input"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={addQuestion.isPending || !qText || !optA || !optB || !optC || !optD}
            >
              {addQuestion.isPending ? "Adding..." : "➕ Add Question"}
            </button>
          </form>
        </div>
      )}

      {/* AI Question Generation */}
      {(state === "lobby" || state === "question") && (
        <div className="admin-section">
          <h3>🤖 AI Question Generator</h3>
          <form onSubmit={handleGenerate} className="ai-form">
            <div className="ai-form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Topic</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Pop culture, Science, Gaming..."
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ flex: 0.5 }}>
                <label>Count</label>
                <input
                  type="number"
                  value={aiCount}
                  onChange={(e) =>
                    setAiCount(Math.min(20, Math.max(1, Number(e.target.value))))
                  }
                  min={1}
                  max={20}
                  className="form-input"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-accent"
              disabled={isGenerating || !aiTopic}
            >
              {isGenerating ? (
                <span className="btn-loading">
                  <span className="spinner" /> Generating with AI...
                </span>
              ) : (
                "✨ Generate Questions"
              )}
            </button>
          </form>
        </div>
      )}

      {/* Question Preview */}
      {questions.length > 0 && (
        <div className="admin-section">
          <h3>Questions ({questions.length})</h3>
          <div className="question-preview-list">
            {questions.map((q, i) => (
              <div key={i} className="question-preview-card">
                <div className="qp-header">
                  <span className="qp-number">Q{i + 1}</span>
                  {q.correct && (
                    <span className="qp-resolved">✓ Resolved</span>
                  )}
                </div>
                <p className="qp-text">{q.text}</p>
                <div className="qp-options">
                  <span className={q.correct?.includes("a") ? "qp-correct" : ""}>A: {q.option_a}</span>
                  <span className={q.correct?.includes("b") ? "qp-correct" : ""}>B: {q.option_b}</span>
                  <span className={q.correct?.includes("c") ? "qp-correct" : ""}>C: {q.option_c}</span>
                  <span className={q.correct?.includes("d") ? "qp-correct" : ""}>D: {q.option_d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
