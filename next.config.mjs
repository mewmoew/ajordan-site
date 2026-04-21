/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Toggle: "true" = full-site maintenance screen. Override with MAINTENANCE_MODE=false locally or in hosting env.
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE ?? "false",
  },
  /* config options here */
};

export default nextConfig;
