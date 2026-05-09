import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Silencia warning de "multiple lockfiles" — fixa workspace root
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // typedRoutes desligado por agora — pode ser ativado depois quando usarmos
  // só rotas estáticas conhecidas pelo Next ou quando casts forem aceitáveis.
  // typedRoutes: true,
};

export default nextConfig;
