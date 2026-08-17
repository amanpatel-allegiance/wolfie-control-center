import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  outputFileTracingRoot: projectRoot,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};
export default nextConfig;
