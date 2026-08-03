import type { Agent } from '@/lib/backtesting/types';

export const DEMO_AGENTS: Agent[] = [
  { key: 'warren_buffett',        display_name: 'Warren Buffett',        description: 'Busca negocios maravillosos a precios razonables; foco en foso económico y management.', investing_style: 'value',        order: 1 },
  { key: 'charlie_munger',        display_name: 'Charlie Munger',        description: 'Calidad sobre precio, modelos mentales y ventajas competitivas durables.',               investing_style: 'value',        order: 2 },
  { key: 'ben_graham',            display_name: 'Ben Graham',            description: 'Margen de seguridad y net-nets; el padre del value investing.',                          investing_style: 'deep_value',   order: 3 },
  { key: 'bill_ackman',           display_name: 'Bill Ackman',           description: 'Activista concentrado en pocas posiciones de alta convicción.',                          investing_style: 'activist',     order: 4 },
  { key: 'cathie_wood',           display_name: 'Cathie Wood',           description: 'Innovación disruptiva y crecimiento exponencial a largo plazo.',                         investing_style: 'growth',       order: 5 },
  { key: 'michael_burry',         display_name: 'Michael Burry',         description: 'Contrarian de deep value; caza asimetrías e ineficiencias del mercado.',                  investing_style: 'contrarian',   order: 6 },
  { key: 'peter_lynch',           display_name: 'Peter Lynch',           description: 'Invertí en lo que conocés; busca ten-baggers con PEG razonable.',                        investing_style: 'growth',       order: 7 },
  { key: 'phil_fisher',           display_name: 'Phil Fisher',           description: 'Scuttlebutt y crecimiento de calidad sostenido en el tiempo.',                           investing_style: 'growth',       order: 8 },
  { key: 'stanley_druckenmiller', display_name: 'Stanley Druckenmiller', description: 'Macro top-down; concentra fuerte cuando la convicción es alta.',                        investing_style: 'macro',        order: 9 },
  { key: 'aswath_damodaran',      display_name: 'Aswath Damodaran',      description: 'Valuación por DCF y narrativas convertidas en números.',                                investing_style: 'valuation',    order: 10 },
  { key: 'technical_analyst',     display_name: 'Technical Analyst',     description: 'Tendencia, momentum y medias móviles sobre la acción del precio.',                       investing_style: 'technical',    order: 11 },
  { key: 'fundamentals_analyst',  display_name: 'Fundamentals Analyst',  description: 'Ratios, márgenes y salud financiera de los estados contables.',                          investing_style: 'fundamental',  order: 12 },
];

export function getDemoAgents(): { agents: Agent[] } {
  return { agents: [...DEMO_AGENTS].sort((a, b) => a.order - b.order) };
}
