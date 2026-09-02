import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoRescue — Drive with confidence",
    short_name: "AutoRescue",
    description:
      "Get roadside help fast: share your location and find nearby mechanics, fuel, tow and tire providers in Kenya.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f2d34",
    theme_color: "#0f2d34",
    icons: [
      {
        src: "/logo.png",
        sizes: "547x487",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
