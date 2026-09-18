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
      const { text } = await generateText({
        model: openai(row.model),
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
      return text;
    } catch {
      return null;
    }
  }
}
