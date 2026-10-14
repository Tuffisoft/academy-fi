import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "picsum.photos" }, { hostname: "fastly.picsum.photos" }],
  },
  allowedDevOrigins: ['192.168.178.128'],
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
