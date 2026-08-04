import type { Agent } from '@/lib/backtesting/types';

export const DEMO_AGENTS: Agent[] = [
  { key: 'warren_buffett',        display_name: 'Warren Buffett',        description: 'Seeks wonderful businesses at reasonable prices; focus on economic moat and management.', investing_style: 'value',        order: 1 },
  { key: 'charlie_munger',        display_name: 'Charlie Munger',        description: 'Quality over price, mental models, and durable competitive advantages.',                  investing_style: 'value',        order: 2 },
  { key: 'ben_graham',            display_name: 'Ben Graham',            description: 'Margin of safety and net-nets; the father of value investing.',                          investing_style: 'deep_value',   order: 3 },
  { key: 'bill_ackman',           display_name: 'Bill Ackman',           description: 'Activist concentrated in a few high-conviction positions.',                              investing_style: 'activist',     order: 4 },
  { key: 'cathie_wood',           display_name: 'Cathie Wood',           description: 'Disruptive innovation and exponential growth over the long term.',                       investing_style: 'growth',       order: 5 },
  { key: 'michael_burry',         display_name: 'Michael Burry',         description: 'Deep-value contrarian; hunts for asymmetries and market inefficiencies.',                investing_style: 'contrarian',   order: 6 },
  { key: 'peter_lynch',           display_name: 'Peter Lynch',           description: 'Invest in what you know; hunts for ten-baggers with a reasonable PEG.',                   investing_style: 'growth',       order: 7 },
  { key: 'phil_fisher',           display_name: 'Phil Fisher',           description: 'Scuttlebutt research and quality growth sustained over time.',                          investing_style: 'growth',       order: 8 },
  { key: 'stanley_druckenmiller', display_name: 'Stanley Druckenmiller', description: 'Top-down macro; concentrates heavily when conviction is high.',                         investing_style: 'macro',        order: 9 },
  { key: 'aswath_damodaran',      display_name: 'Aswath Damodaran',      description: 'DCF valuation and narratives turned into numbers.',                                     investing_style: 'valuation',    order: 10 },
  { key: 'technical_analyst',     display_name: 'Technical Analyst',     description: 'Trend, momentum, and moving averages over price action.',                               investing_style: 'technical',    order: 11 },
  { key: 'fundamentals_analyst',  display_name: 'Fundamentals Analyst',  description: 'Ratios, margins, and financial health from the financial statements.',                   investing_style: 'fundamental',  order: 12 },
];

export function getDemoAgents(): { agents: Agent[] } {
  return { agents: [...DEMO_AGENTS].sort((a, b) => a.order - b.order) };
}
