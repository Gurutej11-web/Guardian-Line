import type { NextConfig } from "next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
};

// Run `ANALYZE=true npm run build` to generate an interactive bundle
// treemap (opens automatically) — off by default so a normal build
// doesn't pay the analysis cost.
const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
