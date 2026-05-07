import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const ORACULO_SYSTEM = `Sos "El Oráculo Bursátil", un personaje místico, surrealista y entretenido de un dashboard Win98 estilo "AI hedge fund".

Tu trabajo: tomar un tema random (un artículo aleatorio de Wikipedia) y FORZAR una conexión inesperada y humorística con el CEDEAR ESPECÍFICO que el usuario te indique en cada consulta. Cuanto más improbable la conexión, mejor.

Reglas:
- Respondé en español rioplatense, tono pseudo-místico de oráculo de feria con humor seco y absurdo.
- MÁXIMO 2 oraciones, BREVE Y PUNZANTE. Texto corrido, SIN saltos de línea, SIN markdown.
- USÁ EXACTAMENTE el ticker del CEDEAR que te indica el usuario, EN MAYÚSCULAS, al menos una vez. NO uses otro CEDEAR aunque te parezca que encaja mejor.
- Empezá directo con algo evocativo (no uses "Aquí va", "Permitime", etc).
- Cerrá con un disclaimer cortito tipo "(no es consejo, es destino)" o variantes igual de breves.
- NUNCA des consejo financiero real ni recomendaciones de compra/venta concretas. Es entretenimiento.`;

const CEDEARS: ReadonlyArray<readonly [string, string]> = [
  ['AAPL', 'Apple'],
  ['KO', 'Coca-Cola'],
  ['TSLA', 'Tesla'],
  ['MSFT', 'Microsoft'],
  ['AMZN', 'Amazon'],
  ['NVDA', 'Nvidia'],
  ['GOOGL', 'Alphabet'],
  ['META', 'Meta'],
  ['JPM', 'JPMorgan'],
  ['DIS', 'Disney'],
  ['MELI', 'MercadoLibre'],
  ['V', 'Visa'],
  ['MA', 'Mastercard'],
  ['MCD', "McDonald's"],
  ['PG', 'Procter & Gamble'],
  ['JNJ', 'Johnson & Johnson'],
  ['WMT', 'Walmart'],
  ['BA', 'Boeing'],
  ['F', 'Ford'],
  ['VZ', 'Verizon'],
  ['NFLX', 'Netflix'],
  ['PFE', 'Pfizer'],
  ['XOM', 'Exxon'],
  ['KO', 'Coca-Cola'],
  ['GLD', 'oro (ETF)'],
  ['SPY', 'S&P 500 (ETF)'],
  ['IBM', 'IBM'],
  ['INTC', 'Intel'],
  ['AMD', 'AMD'],
  ['BABA', 'Alibaba'],
  ['SBUX', 'Starbucks'],
  ['NKE', 'Nike'],
  ['PEP', 'Pepsi'],
  ['T', 'AT&T'],
  ['GS', 'Goldman Sachs'],
  ['BAC', 'Bank of America'],
  ['C', 'Citigroup'],
  ['GE', 'General Electric'],
  ['CAT', 'Caterpillar'],
  ['CVX', 'Chevron'],
  ['UNH', 'UnitedHealth'],
];

interface OraculoRequest {
  title?: string;
  extract?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  let body: OraculoRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { title, extract } = body;
  if (!title || typeof title !== 'string') {
    return new Response(JSON.stringify({ error: 'Falta el título del artículo.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const client = new Anthropic({ apiKey });

  const [ticker, name] = CEDEARS[Math.floor(Math.random() * CEDEARS.length)];

  const userPrompt =
    `Tema random de Wikipedia: "${title}"` +
    (extract ? `\n\nResumen: ${extract.slice(0, 600)}` : '') +
    `\n\nCEDEAR a usar OBLIGATORIAMENTE: ${ticker} (${name}).` +
    `\n\nForjá tu profecía conectando este tema con ${ticker}. Que sea creativa y sorprendente.`;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 180,
          system: ORACULO_SYSTEM,
          messages: [{ role: 'user', content: userPrompt }],
        });

        stream.on('text', (delta: string) => {
          send({ text: delta });
        });

        await stream.finalMessage();
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) {
          send({ error: 'El oráculo está saturado. Probá en un rato.' });
        } else if (err instanceof Anthropic.AuthenticationError) {
          send({ error: 'Credenciales del oráculo inválidas.' });
        } else {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          send({ error: message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
