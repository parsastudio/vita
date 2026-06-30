import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "vita space",
    short_name: "vita",
    description: "Your personalized, modular, offline-first dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8B5CF6",
    icons: [
      {
        src: "/Vazirmatn.woff2",
        sizes: "192x192",
        type: "font/woff2",
      },
    ],
  };
}
