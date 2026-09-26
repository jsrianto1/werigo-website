import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
