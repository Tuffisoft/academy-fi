import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@formepdf/core", "@formepdf/react"],
  outputFileTracingIncludes: {
    "/api/pdf-design/*": ["./node_modules/@formepdf/core/pkg-node/**/*", "./assets/pdf/fonts/**/*"],
    "/api/website-audits/*/pdf": ["./node_modules/@formepdf/core/pkg-node/**/*", "./assets/pdf/fonts/**/*"],
    "/[locale]/lead-research": ["./node_modules/@formepdf/core/pkg-node/**/*", "./assets/pdf/fonts/**/*"],
  },
  images: {
    remotePatterns: [{ hostname: "picsum.photos" }, { hostname: "fastly.picsum.photos" }],
  },
  allowedDevOrigins: ['192.168.178.128'],
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withWorkflow(withNextIntl(nextConfig));
