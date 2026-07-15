import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vormex — Learn and Build Together',
    short_name: 'Vormex',
    description: 'Find students, mentors, creators, and collaborators by skills, interests, and goals.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050816',
    theme_color: '#2563eb',
    icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png' }],
  };
}
