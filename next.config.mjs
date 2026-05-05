import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Pin Turbopack's workspace root to this project so Next doesn't get
  // confused by the lockfile at $HOME/package-lock.json and infer the wrong
  // root. Silences the "multiple lockfiles" warning and keeps builds
  // scoped to this repo.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/invisit", destination: "/rxpad/voice", permanent: true },
    ]
  },
}

export default nextConfig
