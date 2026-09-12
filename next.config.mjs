/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Kitob sahifalarini bo'lak-bo'lak yuboramiz (200 betli darsliklar uchun)
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
