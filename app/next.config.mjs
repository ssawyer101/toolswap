/** @type {import('next').NextConfig} */
export default {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  serverExternalPackages: ["web-push", "bcryptjs"],
};
