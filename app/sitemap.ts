import type { MetadataRoute } from "next";
import { datasets } from "@/lib/datasets/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://limen.city";

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/dati`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/workbench`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/info`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const datasetPages: MetadataRoute.Sitemap = datasets.map((d) => ({
    url: `${base}/dati/${d.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...datasetPages];
}
