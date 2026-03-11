# { "Depends": "py-genlayer:test" }

import json
import re
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Question:
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str


@allow_storage
@dataclass
class Answer:
    choice: str  # "a", "b", "c", or "d"
    points_snapshot: u256  # points remaining when answered (0-100)


class JuryGame(gl.Contract):
    # Game state: "lobby", "question", "revealing", "finished"
    game_state: str

    # Player registry
    players: TreeMap[str, Address]  # username -> address
    player_usernames: TreeMap[Address, str]  # address -> username

    # Scores & streaks
    player_scores: TreeMap[str, u256]  # username -> total score
    player_streaks: TreeMap[str, u256]  # username -> current streak

    # Questions
    questions: DynArray[Question]
    current_question_index: u256
    total_questions: u256

    # Answers: question_index (as string key) -> username -> Answer
    answers: TreeMap[str, TreeMap[str, Answer]]

    # Resolved results: question_index (as string key) -> correct choices (comma-separated)
    resolved: TreeMap[str, str]

    def __init__(self):
        self.admin = gl.message.sender_address
        self.game_state = "lobby"
        self.current_question_index = u256(0)
        self.total_questions = u256(0)

    # ─── Username Registration ───────────────────────────────────────

    @gl.public.write
    def register_player(self, username: str) -> None:
        if self.game_state != "lobby":
            raise Exception("Registration is only allowed in lobby")

        # Validate username: lowercase, no spaces, no special chars, 3-20 chars
        if not re.match(r'^[a-z0-9]{3,20}$', username):
            raise Exception(
                "Username must be 3-20 lowercase letters/numbers only"
            )

        # Check username not taken
        if username in self.players:
            raise Exception("Username already taken")

        # Check address not already registered
        sender = gl.message.sender_address
        if sender in self.player_usernames:
            raise Exception("Address already registered")

        # Register
        self.players[username] = sender
        self.player_usernames[sender] = username
        self.player_scores[username] = u256(0)
        self.player_streaks[username] = u256(0)

    # ─── Admin: Question Management ──────────────────────────────────

    @gl.public.write
    def add_question(
        self,
        text: str,
        option_a: str,
        option_b: str,
        option_c: str,
        option_d: str,
    ) -> None:
        if self.game_state == "finished":
            raise Exception("Game is finished")

        q = Question(
            text=text,
            option_a=option_a,
            option_b=option_b,
            option_c=option_c,
            option_d=option_d,
        )
        self.questions.append(q)
        self.total_questions += 1

    @gl.public.write
    def generate_random_questions(self, count: str, topic: str) -> None:
        if self.game_state == "finished":
            raise Exception("Game is finished")

        num = int(count)
        if num < 1 or num > 20:
            raise Exception("Count must be between 1 and 20")

        def gen_questions() -> str:
            prompt = f"""Generate {num} fun trivia or opinion-based multiple choice questions about: {topic}

Each question should have exactly 4 options (A, B, C, D).
These are for a multiplayer voting game where the majority answer wins, so questions should be ones where people might have different opinions or knowledge levels.

Respond ONLY with valid JSON in this exact format:
{{
  "questions": [
    {{
      "text": "Question text here?",
      "option_a": "First option",
      "option_b": "Second option",
      "option_c": "Third option",
      "option_d": "Fourth option"
    }}
  ]
}}
Do not include any text outside the JSON."""

            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        result_json = json.loads(gl.eq_principle.strict_eq(gen_questions))

        for q_data in result_json["questions"]:
            q = Question(
                text=q_data["text"],
                option_a=q_data["option_a"],
                option_b=q_data["option_b"],
                option_c=q_data["option_c"],
                option_d=q_data["option_d"],
            )
            self.questions.append(q)
            self.total_questions += 1

    # ─── Admin: Game Control ─────────────────────────────────────────

    @gl.public.write
    def start_game(self) -> None:
        if self.game_state != "lobby":
            raise Exception("Game can only be started from lobby")
        if self.total_questions == 0:
            raise Exception("Add at least one question before starting")

        self.game_state = "question"
        self.current_question_index = u256(0)

    @gl.public.write
    def advance_question(self) -> None:
        if self.game_state != "revealing":
            raise Exception("Must resolve current question first")

        next_idx = self.current_question_index + 1
        if next_idx >= self.total_questions:
            self.game_state = "finished"
        else:
            self.current_question_index = next_idx
            self.game_state = "question"

    @gl.public.write
    def end_game(self) -> None:
        self.game_state = "finished"

    # ─── Player: Submit Answer ───────────────────────────────────────

    @gl.public.write
    def submit_answer(
        self, question_index: str, choice: str, points_snapshot: str
    ) -> None:
        sender = gl.message.sender_address
        if sender not in self.player_usernames:
            raise Exception("Not registered")
        if self.game_state != "question":
            raise Exception("Not accepting answers right now")

        username = self.player_usernames[sender]
        q_idx = int(question_index)

        if q_idx != int(self.current_question_index):
            raise Exception("Wrong question index")

        choice_lower = choice.lower()
        if choice_lower not in ("a", "b", "c", "d"):
            raise Exception("Invalid choice, must be a, b, c, or d")

        pts = int(points_snapshot)
        if pts < 0 or pts > 100:
            raise Exception("Points snapshot must be 0-100")

        q_key = str(q_idx)

        # Check if already answered
        if q_key in self.answers:
            if username in self.answers[q_key]:
                raise Exception("Already answered this question")

        # Store answer
        self.answers.get_or_insert_default(q_key)[username] = Answer(
            choice=choice_lower, points_snapshot=u256(pts)
        )

    # ─── Admin: Resolve Question ─────────────────────────────────────

    @gl.public.write
    def resolve_question(self, question_index: str) -> None:
        if self.game_state != "question":
            raise Exception("No active question to resolve")

        q_idx = int(question_index)
        if q_idx != int(self.current_question_index):
            raise Exception("Wrong question index")

        q_key = str(q_idx)

        if q_key in self.resolved:
            raise Exception("Question already resolved")

        # Count votes per choice
        vote_counts = {"a": 0, "b": 0, "c": 0, "d": 0}

        if q_key in self.answers:
            for username, answer in self.answers[q_key].items():
                if answer.choice in vote_counts:
                    vote_counts[answer.choice] += 1

        # Determine majority (highest count, ties = multiple correct)
        max_votes = max(vote_counts.values())

        if max_votes == 0:
            # No one answered, skip
            self.resolved[q_key] = ""
            self.game_state = "revealing"
            return

        correct_choices = [
            ch for ch, cnt in vote_counts.items() if cnt == max_votes
        ]
        correct_str = ",".join(sorted(correct_choices))
        self.resolved[q_key] = correct_str

        # Award points
        if q_key in self.answers:
            for username, answer in self.answers[q_key].items():
                if answer.choice in correct_choices:
                    # Speed points
                    earned = answer.points_snapshot

                    # Streak bonus
                    current_streak = self.player_streaks.get(username, u256(0))
                    new_streak = current_streak + 1
                    self.player_streaks[username] = new_streak

                    if new_streak >= 2:
                        earned += 50  # Streak bonus starting from 2nd correct

                    self.player_scores[username] = (
                        self.player_scores.get(username, u256(0)) + earned
                    )
                else:
                    # Wrong answer, reset streak
                    self.player_streaks[username] = u256(0)

        self.game_state = "revealing"

    # ─── View Methods ────────────────────────────────────────────────

    @gl.public.view
    def get_game_state(self) -> dict:
        return {
            "state": self.game_state,
            "current_question_index": int(self.current_question_index),
            "total_questions": int(self.total_questions),
        }

    @gl.public.view
    def get_player_count(self) -> int:
        count = 0
        for _ in self.players.items():
            count += 1
        return count

    @gl.public.view
    def get_players(self) -> dict:
        return {k: v.as_hex for k, v in self.players.items()}

    @gl.public.view
    def get_question(self, index: str) -> dict:
        idx = int(index)
        if idx < 0 or idx >= int(self.total_questions):
            raise Exception("Invalid question index")

        q = self.questions[idx]
        result = {
            "text": q.text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
        }

        # Include resolution if available
        q_key = str(idx)
        if q_key in self.resolved:
            result["correct"] = self.resolved[q_key]

        return result

    @gl.public.view
    def get_all_questions(self) -> list:
        result = []
        for i in range(int(self.total_questions)):
            q = self.questions[i]
            q_data = {
                "index": i,
                "text": q.text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
            }
            q_key = str(i)
            if q_key in self.resolved:
                q_data["correct"] = self.resolved[q_key]
            result.append(q_data)
        return result

    @gl.public.view
    def get_leaderboard(self) -> list:
        entries = []
        for username, score in self.player_scores.items():
            streak = self.player_streaks.get(username, u256(0))
            entries.append({
                "username": username,
                "score": int(score),
                "streak": int(streak),
            })
        # Sort by score descending
        entries.sort(key=lambda x: x["score"], reverse=True)
        return entries

    @gl.public.view
    def get_player_info(self, username: str) -> dict:
        if username not in self.players:
            raise Exception("Player not found")
        return {
            "username": username,
            "address": self.players[username].as_hex,
            "score": int(self.player_scores.get(username, u256(0))),
            "streak": int(self.player_streaks.get(username, u256(0))),
        }

    @gl.public.view
    def get_question_results(self, question_index: str) -> dict:
        q_key = question_index
        if q_key not in self.resolved:
            return {"resolved": False}

        vote_counts = {"a": 0, "b": 0, "c": 0, "d": 0}
        total_votes = 0

        if q_key in self.answers:
            for username, answer in self.answers[q_key].items():
                if answer.choice in vote_counts:
                    vote_counts[answer.choice] += 1
                    total_votes += 1

        return {
            "resolved": True,
            "correct": self.resolved[q_key],
            "votes": vote_counts,
            "total_votes": total_votes,
        }

    @gl.public.view
    def get_player_username(self, address: str) -> str:
        addr = Address(address)
        if addr not in self.player_usernames:
            return ""
        return self.player_usernames[addr]

    @gl.public.view
    def is_admin(self, address: str) -> bool:
        return True
