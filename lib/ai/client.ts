// How the app talks to an AI model. The real Claude client will implement this once the paid API key is
// set up (server-side only, CLAUDE.md rule 3); until then tests use StubAiClient.
export interface AiClient {
  model: string;
  complete(system: string, user: string): Promise<string>;
}

// Stand-in for the real AI: returns a pre-written answer, so the safety checks can be tested without cost.
export class StubAiClient implements AiClient {
  model = "stub";
  calls = 0;
  lastUserMessage = "";

  constructor(private readonly answer: string | ((user: string) => string)) {}

  async complete(_system: string, user: string): Promise<string> {
    this.calls++;
    this.lastUserMessage = user;
    return typeof this.answer === "function" ? this.answer(user) : this.answer;
  }
}
