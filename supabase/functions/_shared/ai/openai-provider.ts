import type { AiCompletionResult, AiProvider, AiTask } from "./types.ts";

export class OpenAiProvider implements AiProvider {
  id = "openai" as const;

  async complete(input: {
    task: AiTask;
    system: string;
    userPayload: unknown;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<AiCompletionResult> {
    const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_NOT_CONFIGURED");
    }

    const model = Deno.env.get("AI_MODEL")?.trim() || "gpt-4o-mini";
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: input.maxOutputTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: input.system },
            {
              role: "user",
              content: JSON.stringify(input.userPayload),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OPENAI_HTTP_${response.status}:${errorText.slice(0, 180)}`);
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("OPENAI_EMPTY_RESPONSE");
      }

      let output: Record<string, unknown>;
      try {
        output = JSON.parse(content) as Record<string, unknown>;
      } catch {
        throw new Error("OPENAI_INVALID_JSON");
      }

      return {
        output,
        model,
        inputTokens: Number(payload?.usage?.prompt_tokens ?? 0),
        outputTokens: Number(payload?.usage?.completion_tokens ?? 0),
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
