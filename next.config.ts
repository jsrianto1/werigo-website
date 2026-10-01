import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
          // Stage script restrictions without disrupting Next hydration, GTM or Meta.
          { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com https://www.facebook.com; font-src 'self'; media-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.facebook.com https://*.supabase.co wss://*.supabase.co; frame-src https://www.googletagmanager.com; base-uri 'self'; object-src 'none'" },
        ],
      },
      { source: "/media/:path*.webm", headers: [{ key: "Content-Type", value: "video/webm" }] },
      { source: "/media/:path*.mp4", headers: [{ key: "Content-Type", value: "video/mp4" }] },
    ];
  },
  async redirects() {
    return [
      // WERIGO SAGA installments are "chapters" (it is a comic, not a series).
      // Old /saga/episode-N links keep working; ?lang=id passes through.
      {
        source: "/saga/episode-:n(\\d{1,})",
        destination: "/saga/chapter-:n",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
