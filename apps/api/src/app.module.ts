import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service.js";
import { AuthService } from "./auth/auth.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthGuard } from "./auth/auth.guard.js";
import { ArticlesController } from "./articles/articles.controller.js";
import { AssetsController } from "./assets/assets.controller.js";
import { GenerateService } from "./generate/generate.service.js";
import { LlmService } from "./generate/llm.service.js";
import { BillingController } from "./billing/billing.controller.js";
import { AdminController } from "./admin/admin.controller.js";
import { TopicController } from "./topic/topic.controller.js";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-only-change-me",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [
    AuthController,
    ArticlesController,
    AssetsController,
    BillingController,
    AdminController,
    TopicController,
  ],
  providers: [
    PrismaService,
    AuthService,
    GenerateService,
    LlmService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
