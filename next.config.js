/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Zorg dat pdf-parse (CJS package) extern blijft en niet door Next gebundeld wordt
  serverExternalPackages: ["pdf-parse"],
};

module.exports = nextConfig;
