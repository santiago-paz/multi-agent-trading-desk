import { hashString, seededPick } from './seed';
import { pacedStream, type PacedItem } from './sse';

export const DEMO_WIKI_TOPICS = [
  { title: 'El faro de Alejandría', extract: 'Una de las siete maravillas del mundo antiguo, guía de navegantes perdidos.' },
  { title: 'La máquina de Anticitera', extract: 'Un antiguo mecanismo griego considerado la primera computadora analógica.' },
  { title: 'El experimento de la doble rendija', extract: 'Demostración de la dualidad onda-partícula en la mecánica cuántica.' },
  { title: 'La Ruta de la Seda', extract: 'Red de rutas comerciales que conectó Oriente y Occidente durante siglos.' },
  { title: 'El calamar gigante', extract: 'Criatura abisal esquiva que inspiró leyendas de krakens.' },
  { title: 'La biblioteca de Babel', extract: 'Cuento de Borges sobre una biblioteca infinita que contiene todos los libros posibles.' },
];

const ORACULO_TEMPLATES = [
  (t: string) => `Las mareas del destino susurran que ${t} y las acciones bailan el mismo vals invisible (no es consejo, es destino).`,
  (t: string) => `Donde otros ven ruido, el oráculo ve que ${t} presagia un giro en los mercados (no es consejo, es augurio).`,
  (t: string) => `El humo del incienso dibuja el ticker ${t} sobre las velas japonesas del mañana (no es consejo, es profecía).`,
];

export function demoOraculoStream(input: { title?: string }): Response {
  const title = input.title ?? seededPick(DEMO_WIKI_TOPICS, 0).title;
  const seed = hashString(title);
  // Pick a CEDEAR ticker deterministically for flavor.
  const tickers = ['AAPL', 'KO', 'TSLA', 'NVDA', 'MELI', 'MSFT', 'GOOGL'];
  const ticker = seededPick(tickers, seed);
  const line = seededPick(ORACULO_TEMPLATES, seed)(ticker);

  const words = line.split(' ');
  const items: PacedItem[] = words.map((w, i) => ({
    chunk: `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + w })}\n\n`,
    delayMs: 35,
  }));
  items.push({ chunk: `data: [DONE]\n\n`, delayMs: 0 });

  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
