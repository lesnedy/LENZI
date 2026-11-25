import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LENZI — Your Ride. Your Way.",
    short_name: "LENZI",
    description:
      "Ride-hailing for Chunya, Mbeya. Boda, bajaji and cars with clear fares.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F8F6",
    theme_color: "#087A4B",
    lang: "sw",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
