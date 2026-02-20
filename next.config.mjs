const nextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/distributed-systems-visualizer" : "",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
