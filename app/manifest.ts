import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'DarLugha — Learn Arabic',
    short_name: 'DarLugha',
    description: 'Structured Arabic lessons, practice, review, and guided conversation.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8f8f3',
    theme_color: '#063a70',
    lang: 'en',
    dir: 'ltr',
    categories: ['education'],
    icons: [
      {
        src: '/icons/darlugha-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/darlugha-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/darlugha-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
