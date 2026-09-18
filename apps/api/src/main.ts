import "./load-env.js";
import "reflect-metadata";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { AllFilter } from "./all.filter.js";

async function bootstrap() {
  mkdirSync(join(process.cwd(), "uploads"), { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllFilter());
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`yiyi api http://localhost:${port}/api`);
}

bootstrap();
