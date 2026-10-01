// Prisma's config loader does not auto-load .env, unlike the CLI's other commands
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL")
  },
});
