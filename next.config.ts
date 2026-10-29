import type { NextConfig } from "next";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { withWorkflow } from "workflow/next";

if (
  process.platform === "win32" &&
  process.env.NODE_ENV === "development" &&
  !process.env.VERCEL_DEPLOYMENT_ID &&
  process.env.LOCALAPPDATA
) {
  process.env.WORKFLOW_TARGET_WORLD ??= "local";
  if (
    process.env.WORKFLOW_TARGET_WORLD === "local" &&
    !process.env.WORKFLOW_LOCAL_DATA_DIR
  ) {
    const source = path.resolve(".next/workflow-data");
    const destination = path.join(
      process.env.LOCALAPPDATA,
      "AcademyFi",
      "workflow-data",
    );
    if (!existsSync(destination) && existsSync(source)) {
      mkdirSync(path.dirname(destination), { recursive: true });
      cpSync(source, destination, { recursive: true });
    }
    process.env.WORKFLOW_LOCAL_DATA_DIR = destination;
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@formepdf/core", "@formepdf/react"],
  outputFileTracingIncludes: {
    "/api/pdf-design/*": [
      "./node_modules/@formepdf/core/pkg-node/**/*",
      "./assets/pdf/fonts/**/*",
    ],
    "/api/website-audits/*/pdf": [
      "./node_modules/@formepdf/core/pkg-node/**/*",
      "./assets/pdf/fonts/**/*",
    ],
    "/[locale]/tools/calem/lead-research": [
      "./node_modules/@formepdf/core/pkg-node/**/*",
      "./assets/pdf/fonts/**/*",
    ],
  },
  images: {
    remotePatterns: [
      { hostname: "picsum.photos" },
      { hostname: "fastly.picsum.photos" },
    ],
  },
  allowedDevOrigins: ["192.168.178.128"],
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withWorkflow(withNextIntl(nextConfig));
