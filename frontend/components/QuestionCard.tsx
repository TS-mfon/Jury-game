"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useCurrentQuestion,
  useGameState,
  useSubmitAnswer,
  useQuestionResults,
} from "@/lib/hooks/useJuryGame";

const TIMER_DURATION = 30; // seconds
const MAX_POINTS = 100;

export function QuestionCard() {
  const { data: gameState } = useGameState();
  const { data: question } = useCurrentQuestion();
  const { submitAnswer, isSubmitting } = useSubmitAnswer();
  const { data: results } = useQuestionResults(
    gameState?.state === "revealing"
      ? gameState.current_question_index
      : null
  );

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [pointsAvailable, setPointsAvailable] = useState(MAX_POINTS);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const prevQuestionIndex = useRef<number | null>(null);

  // Reset timer when question changes
  useEffect(() => {
    if (
      gameState?.state === "question" &&
      gameState.current_question_index !== prevQuestionIndex.current
    ) {
      prevQuestionIndex.current = gameState.current_question_index;
      setTimeLeft(TIMER_DURATION);
      setPointsAvailable(MAX_POINTS);
      setSelectedChoice(null);
      setSubmitted(false);
      startTimeRef.current = Date.now();
    }
  }, [gameState?.state, gameState?.current_question_index]);

  // Countdown timer
  useEffect(() => {
    if (gameState?.state !== "question" || submitted) return;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, TIMER_DURATION - elapsed);
      const pts = Math.round((remaining / TIMER_DURATION) * MAX_POINTS);

      setTimeLeft(Math.ceil(remaining));
      setPointsAvailable(pts);

      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.state, submitted]);

  const handleAnswer = useCallback(
    (choice: string) => {
      if (submitted || isSubmitting || timeLeft <= 0 || !gameState) return;

      setSelectedChoice(choice);
      setSubmitted(true);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const pts = Math.max(
        0,
        Math.round(((TIMER_DURATION - elapsed) / TIMER_DURATION) * MAX_POINTS)
      );

      submitAnswer({
        questionIndex: gameState.current_question_index,
        choice,
        pointsSnapshot: pts,
      });
    },
    [submitted, isSubmitting, timeLeft, gameState, submitAnswer]
  );

  if (!question || !gameState) return null;

  const isRevealing = gameState.state === "revealing";
  const timerPercent = (timeLeft / TIMER_DURATION) * 100;
  const timerColor =
    timeLeft > 20 ? "var(--color-success)" : timeLeft > 10 ? "var(--color-warning)" : "var(--color-danger)";

  const options = [
    { key: "a", label: "A", text: question.option_a },
    { key: "b", label: "B", text: question.option_b },
    { key: "c", label: "C", text: question.option_c },
    { key: "d", label: "D", text: question.option_d },
  ];

  const correctChoices = isRevealing && results?.correct
    ? results.correct.split(",")
    : [];

  return (
    <div className="question-container">
      {/* Timer ring */}
      <div className="timer-section">
        <div className="timer-ring">
          <svg viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              className="timer-track"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              className="timer-progress"
              style={{
                strokeDashoffset: `${326.7 - (326.7 * timerPercent) / 100}`,
                stroke: timerColor,
              }}
            />
          </svg>
          <div className="timer-inner">
            <span className="timer-points" style={{ color: timerColor }}>
              {submitted ? (selectedChoice ? "✓" : "—") : pointsAvailable}
            </span>
            <span className="timer-label">
              {submitted ? "submitted" : "pts"}
            </span>
          </div>
        </div>
        <div className="timer-seconds">{timeLeft}s</div>
      </div>

      {/* Question */}
      <div className="question-card">
        <div className="question-number">
          Question {gameState.current_question_index + 1} /{" "}
          {gameState.total_questions}
        </div>
        <h2 className="question-text">{question.text}</h2>

        {/* Answer options */}
        <div className="options-grid">
          {options.map((opt) => {
            const isSelected = selectedChoice === opt.key;
            const isCorrect = correctChoices.includes(opt.key);
            const totalVotes = results?.total_votes || 0;
            const voteCount = results?.votes?.[opt.key as keyof typeof results.votes] || 0;
            const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

            let optionClass = "option-btn";
            if (isRevealing) {
              if (isCorrect) optionClass += " option-correct";
              else if (isSelected && !isCorrect) optionClass += " option-wrong";
              else optionClass += " option-revealed";
            } else if (isSelected) {
              optionClass += " option-selected";
            } else if (submitted || timeLeft <= 0) {
              optionClass += " option-disabled";
            }

            return (
              <button
                key={opt.key}
                className={optionClass}
                onClick={() => handleAnswer(opt.key)}
                disabled={submitted || isSubmitting || timeLeft <= 0 || isRevealing}
              >
                <span className="option-label">{opt.label}</span>
                <span className="option-text">{opt.text}</span>
                {isRevealing && (
                  <span className="option-votes">
                    {votePercent}% ({voteCount})
                  </span>
                )}
                {isRevealing && (
                  <div
                    className="option-vote-bar"
                    style={{ width: `${votePercent}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {timeLeft <= 0 && !submitted && !isRevealing && (
          <div className="time-up">⏰ Time&apos;s up!</div>
        )}
      </div>
    </div>
  );
}
