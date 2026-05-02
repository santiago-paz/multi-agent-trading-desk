import { NextRequest } from 'next/server';

// Force the Node.js runtime so streaming SSE responses are forwarded as-is.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_URL = process.env.AI_HEDGE_FUND_API_URL;
const API_KEY = process.env.AI_HEDGE_FUND_API_KEY;

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!UPSTREAM_URL || !API_KEY) {
    return new Response(
      JSON.stringify({ error: 'AI_HEDGE_FUND_API_URL or AI_HEDGE_FUND_API_KEY not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const target = `${UPSTREAM_URL.replace(/\/$/, '')}/hedge-fund/${path.join('/')}${search}`;

  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type') ?? 'application/json',
      'x-api-key': API_KEY,
    },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    // @ts-expect-error - duplex is required by Node fetch when streaming a body
    duplex: 'half',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-cache, no-transform',
    },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE, proxy as PATCH };
