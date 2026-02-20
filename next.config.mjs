import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "export",
  outputFileTracingRoot: projectRoot,
  basePath: process.env.NODE_ENV === "production" ? "/distributed-systems-visualizer" : "",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
