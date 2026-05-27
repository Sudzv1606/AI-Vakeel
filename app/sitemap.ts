import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://aivakeel.in';

  const reraStates = ['maharashtra', 'karnataka', 'uttar-pradesh', 'tamil-nadu', 'delhi'];

  const exampleSlugs = [
    'consumer-complaint-flipkart-mobile',
    'rera-complaint-delayed-possession-lucknow',
    'rti-road-construction-budget',
  ];

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/consumer-complaint`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/rera-complaint`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/rti-application`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // State-specific RERA pages
    ...reraStates.map((state) => ({
      url: `${baseUrl}/rera-complaint/${state}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    // Examples gallery
    { url: `${baseUrl}/examples`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    // Individual example pages
    ...exampleSlugs.map((slug) => ({
      url: `${baseUrl}/examples/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
