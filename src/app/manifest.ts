import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KemTech Inc. Fitness Tracker",
    short_name: "KemTech",
    description: "Your workouts, progress and personal bests in one place.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/kemtech-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/kemtech-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/kemtech-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
