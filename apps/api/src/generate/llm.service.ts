import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class LlmService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async complete(
    slot: "text_json" | "text_long" | "vision",
    prompt: string,
    image?: Buffer,
  ): Promise<string | null> {
    const row = await this.prisma.capabilitySlot.findUnique({ where: { slot } });
    if (!row?.apiKey || !row.baseUrl || !row.model) return null;
    try {
      const { generateText } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");
      const openai = createOpenAI({ apiKey: row.apiKey, baseURL: row.baseUrl });
      // AI SDK v5 默认走 /v1/responses；百炼兼容模式只稳 chat/completions。
      const { text } = await generateText({
        model: openai.chat(row.model),
        ...(image
          ? {
              messages: [
                {
                  role: "user" as const,
                  content: [
                    { type: "text" as const, text: prompt },
                    { type: "image" as const, image },
                  ],
                },
              ],
            }
          : { prompt }),
      });
      if (!text?.trim()) {
        console.error(`[llm] ${slot} empty`);
        return null;
      }
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      const extra =
        err && typeof err === "object" && "statusCode" in err
          ? ` status=${String((err as { statusCode?: unknown }).statusCode)}`
          : "";
      console.error(`[llm] ${slot} failed:${extra}`, msg.slice(0, 300));
      return null;
    }
  }
}
