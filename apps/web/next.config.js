/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: "./lib/empty-module.js",
    },
  },

  // 1. Monorepo Transpilation
  // Add all workspace packages that need to be compiled by Next.js here
  transpilePackages: ["@workspace/ui", "@workspace/core-wasm"],

  // 2. Webpack Configuration for WASM
  webpack(config, { isServer }) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    }

    // Fix for WASM in Next.js: Ensure it works on both client and server
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    })

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }

    return config
  },
}

export default nextConfig
