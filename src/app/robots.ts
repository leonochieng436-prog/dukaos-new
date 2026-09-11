import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dukaos.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/contact",
          "/privacy-policy",
          "/terms",
          "/cookies",
          "/cookie-policy",
        ],
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/account-pending",
          "/_next/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
