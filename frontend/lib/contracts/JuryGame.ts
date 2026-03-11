import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  GameState,
  LeaderboardEntry,
  Question,
  QuestionResults,
  TransactionReceipt,
} from "./types";

/**
 * JuryGame contract class for interacting with the GenLayer Jury Game contract
 */
class JuryGame {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = {
      chain: studionet,
    };

    if (address) {
      config.account = address as `0x${string}`;
    }

    if (studioUrl) {
      config.endpoint = studioUrl;
    }

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: studionet,
      account: address as `0x${string}`,
    };
    this.client = createClient(config);
  }

  // ─── Read Methods ──────────────────────────────────────────────

  async getGameState(): Promise<GameState> {
    try {
      const result: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_game_state",
        args: [],
      });

      if (result instanceof Map) {
        return Object.fromEntries(result) as GameState;
      }
      return result as GameState;
    } catch (error) {
      console.error("Error fetching game state:", error);
      throw new Error("Failed to fetch game state");
    }
  }

  async getPlayerCount(): Promise<number> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_player_count",
        args: [],
      });
      return Number(result) || 0;
    } catch (error) {
      console.error("Error fetching player count:", error);
      return 0;
    }
  }

  async getPlayers(): Promise<Record<string, string>> {
    try {
      const result: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_players",
        args: [],
      });
      if (result instanceof Map) {
        return Object.fromEntries(result);
      }
      return result || {};
    } catch (error) {
      console.error("Error fetching players:", error);
      return {};
    }
  }

  async getQuestion(index: number): Promise<Question> {
    try {
      const result: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_question",
        args: [String(index)],
      });

      if (result instanceof Map) {
        const obj = Object.fromEntries(result) as any;
        return { ...obj, index } as Question;
      }
      return { ...result, index } as Question;
    } catch (error) {
      console.error("Error fetching question:", error);
      throw new Error("Failed to fetch question");
    }
  }

  async getAllQuestions(): Promise<Question[]> {
    try {
      const result: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_all_questions",
        args: [],
      });

      if (Array.isArray(result)) {
        return result.map((item: any) => {
          if (item instanceof Map) {
            return Object.fromEntries(item) as Question;
          }
          return item as Question;
        });
      }
      return [];
    } catch (error) {
      console.error("Error fetching all questions:", error);
      return [];
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const result: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_leaderboard",
        args: [],
      });

      if (Array.isArray(result)) {
        return result.map((item: any) => {
          if (item instanceof Map) {
            return Object.fromEntries(item) as LeaderboardEntry;
          }
          return item as LeaderboardEntry;
        });
      }
      return [];
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
  }

  async getQuestionResults(questionIndex: number): Promise<QuestionResults> {
    try {
      const result: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_question_results",
        args: [String(questionIndex)],
      });

      if (result instanceof Map) {
        const obj: any = Object.fromEntries(result);
        if (obj.votes instanceof Map) {
          obj.votes = Object.fromEntries(obj.votes);
        }
        return obj as QuestionResults;
      }
      return result as QuestionResults;
    } catch (error) {
      console.error("Error fetching question results:", error);
      return { resolved: false };
    }
  }

  async getPlayerUsername(address: string): Promise<string> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_player_username",
        args: [address],
      });
      return String(result || "");
    } catch (error) {
      console.error("Error fetching player username:", error);
      return "";
    }
  }

  async isAdmin(address: string): Promise<boolean> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress,
        functionName: "is_admin",
        args: [address],
      });
      return Boolean(result);
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }

  // ─── Write Methods ─────────────────────────────────────────────

  async registerPlayer(username: string): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "register_player",
        args: [username],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error registering player:", error);
      throw new Error("Failed to register player");
    }
  }

  async submitAnswer(
    questionIndex: number,
    choice: string,
    pointsSnapshot: number
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "submit_answer",
        args: [String(questionIndex), choice, String(pointsSnapshot)],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw new Error("Failed to submit answer");
    }
  }

  // ─── Admin Write Methods ───────────────────────────────────────

  async addQuestion(
    text: string,
    optionA: string,
    optionB: string,
    optionC: string,
    optionD: string
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "add_question",
        args: [text, optionA, optionB, optionC, optionD],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error adding question:", error);
      throw new Error("Failed to add question");
    }
  }

  async generateRandomQuestions(
    count: number,
    topic: string
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "generate_random_questions",
        args: [String(count), topic],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 60,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new Error("Failed to generate questions");
    }
  }

  async startGame(): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "start_game",
        args: [],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error starting game:", error);
      throw new Error("Failed to start game");
    }
  }

  async resolveQuestion(
    questionIndex: number
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "resolve_question",
        args: [String(questionIndex)],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error resolving question:", error);
      throw new Error("Failed to resolve question");
    }
  }

  async advanceQuestion(): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "advance_question",
        args: [],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error advancing question:", error);
      throw new Error("Failed to advance question");
    }
  }

  async endGame(): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "end_game",
        args: [],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 30,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error ending game:", error);
      throw new Error("Failed to end game");
    }
  }
}

export default JuryGame;
