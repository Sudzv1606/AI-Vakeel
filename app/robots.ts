import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/sessions/', '/profile/'],
    },
    sitemap: 'https://aivakeel.in/sitemap.xml',
  };
}
