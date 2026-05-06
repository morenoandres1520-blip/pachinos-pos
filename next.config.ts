import type { NextConfig } from "next";

// Fix for corporate SSL proxy (SoftwareOne network)
// This only applies to server-side Node.js requests, not the browser
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
