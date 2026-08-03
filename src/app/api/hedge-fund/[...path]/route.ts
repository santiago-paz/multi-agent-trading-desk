import { NextRequest } from 'next/server';
import { getDemoAgents } from '@/lib/demo/agents';
import { demoRunStream } from '@/lib/demo/run-stream';

// Force the Node.js runtime so streaming SSE responses are forwarded as-is.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_URL = process.env.AI_HEDGE_FUND_API_URL;
const API_KEY = process.env.AI_HEDGE_FUND_API_KEY;

// Serves canned responses for /api/hedge-fund/* in demo mode so the browser
// never reaches the Python backend. Returns null to fall through to the
// upstream proxy for any path it doesn't recognize.
async function demoHedgeFundResponse(path: string[], req: NextRequest): Promise<Response | null> {
  const endpoint = path[0];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  if (endpoint === 'agents') return json(getDemoAgents());
  if (endpoint === 'run') {
    const body = await req.json().catch(() => ({}));
    return demoRunStream(body);
  }
  // 'optimize' | 'backtest' added in later tasks.
  return null;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const demo = await demoHedgeFundResponse(path, req);
    if (demo) return demo;
  }

  if (!UPSTREAM_URL || !API_KEY) {
    return new Response(
      JSON.stringify({ error: 'AI_HEDGE_FUND_API_URL or AI_HEDGE_FUND_API_KEY not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

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
