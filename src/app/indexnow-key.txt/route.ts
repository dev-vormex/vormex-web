export const dynamic = 'force-dynamic';

export function GET() {
  const key = String(process.env.INDEXNOW_KEY || '').trim();
  if (!key) return new Response('Not Found', { status: 404 });
  return new Response(key, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-robots-tag': 'noindex',
    },
  });
}
