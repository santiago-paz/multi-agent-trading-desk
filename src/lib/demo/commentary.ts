/**
 * Canned analyst output for demo mode.
 *
 * Two things live here:
 *
 *  - `AGENT_STEPS`: the sequence of progress steps each agent walks through.
 *    The labels mirror the real backend (`src/agents/*.py` → `update_status`),
 *    so the demo log reads exactly like a live run. Steps marked `fetch: true`
 *    are the ones the backend emits twice (running, then `result: 'ok'`).
 *
 *  - `AGENT_COMMENTARY`: sample reasoning prose. These are NOT quotes. They
 *    are short, made-up write-ups in the documented style of each investor,
 *    standing in for what the LLM produces on a live run so the persona cards
 *    have something to show on stage.
 */

import { hashString } from './seed';

export interface AgentStep {
  status: string;
  /** Fetch steps emit a second event carrying `result: 'ok'`. */
  fetch?: boolean;
}

const FETCH_METRICS: AgentStep = { status: 'Fetching financial metrics', fetch: true };
const FETCH_LINE_ITEMS: AgentStep = { status: 'Gathering financial line items', fetch: true };
const FETCH_MARKET_CAP: AgentStep = { status: 'Getting market cap', fetch: true };
const FETCH_PRICES: AgentStep = { status: 'Fetching price data', fetch: true };
const FETCH_INSIDER: AgentStep = { status: 'Fetching insider trades', fetch: true };
const FETCH_NEWS: AgentStep = { status: 'Fetching company news', fetch: true };

/** Steps used for any agent we have no explicit script for. */
const GENERIC_STEPS: AgentStep[] = [
  FETCH_METRICS,
  FETCH_LINE_ITEMS,
  { status: 'Analyzing fundamentals' },
  { status: 'Analyzing valuation' },
  { status: 'Generating analysis' },
];

export const AGENT_STEPS: Record<string, AgentStep[]> = {
  warren_buffett: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Analyzing fundamentals' },
    { status: 'Analyzing consistency' },
    { status: 'Analyzing competitive moat' },
    { status: 'Analyzing pricing power' },
    { status: 'Analyzing book value growth' },
    { status: 'Analyzing management quality' },
    { status: 'Calculating intrinsic value' },
    { status: 'Generating Warren Buffett analysis' },
  ],
  charlie_munger: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_INSIDER,
    { status: 'Analyzing moat strength' },
    { status: 'Analyzing management quality' },
    { status: 'Analyzing business predictability' },
    { status: 'Calculating Munger-style valuation' },
    { status: 'Generating Charlie Munger analysis' },
  ],
  ben_graham: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Analyzing earnings stability' },
    { status: 'Analyzing financial strength' },
    { status: 'Analyzing Graham valuation' },
    { status: 'Generating Ben Graham analysis' },
  ],
  bill_ackman: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Analyzing business quality' },
    { status: 'Analyzing balance sheet and capital structure' },
    { status: 'Analyzing activism potential' },
    { status: 'Calculating intrinsic value & margin of safety' },
    { status: 'Generating Bill Ackman analysis' },
  ],
  cathie_wood: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Analyzing disruptive potential' },
    { status: 'Analyzing innovation-driven growth' },
    { status: 'Calculating valuation & high-growth scenario' },
    { status: 'Generating Cathie Wood analysis' },
  ],
  michael_burry: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_INSIDER,
    FETCH_NEWS,
    { status: 'Analyzing value' },
    { status: 'Analyzing balance sheet' },
    { status: 'Analyzing insider activity' },
    { status: 'Analyzing contrarian sentiment' },
    { status: 'Generating LLM output' },
  ],
  peter_lynch: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_INSIDER,
    FETCH_NEWS,
    { status: 'Analyzing growth' },
    { status: 'Analyzing fundamentals' },
    { status: 'Analyzing valuation (focus on PEG)' },
    { status: 'Analyzing sentiment' },
    { status: 'Analyzing insider activity' },
    { status: 'Generating Peter Lynch analysis' },
  ],
  phil_fisher: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_INSIDER,
    FETCH_NEWS,
    { status: 'Analyzing growth & quality' },
    { status: 'Analyzing margins & stability' },
    { status: 'Analyzing management efficiency & leverage' },
    { status: 'Analyzing valuation (Fisher style)' },
    { status: 'Analyzing insider activity' },
    { status: 'Analyzing sentiment' },
    { status: 'Generating Phil Fisher-style analysis' },
  ],
  stanley_druckenmiller: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_PRICES,
    FETCH_INSIDER,
    { status: 'Analyzing growth & momentum' },
    { status: 'Analyzing risk-reward' },
    { status: 'Analyzing sentiment' },
    { status: 'Analyzing insider activity' },
    { status: 'Performing Druckenmiller-style valuation' },
    { status: 'Generating Stanley Druckenmiller analysis' },
  ],
  mohnish_pabrai: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Analyzing downside protection' },
    { status: 'Analyzing cash yield and valuation' },
    { status: 'Assessing potential to double' },
    { status: 'Generating Pabrai analysis' },
  ],
  rakesh_jhunjhunwala: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Analyzing growth' },
    { status: 'Analyzing profitability' },
    { status: 'Analyzing balance sheet' },
    { status: 'Analyzing cash flow' },
    { status: 'Analyzing management actions' },
    { status: 'Calculating intrinsic value' },
    { status: 'Generating Jhunjhunwala analysis' },
  ],
  aswath_damodaran: [
    FETCH_METRICS,
    FETCH_LINE_ITEMS,
    FETCH_MARKET_CAP,
    { status: 'Estimating beta vs. SPY' },
    { status: 'Analyzing risk profile' },
    { status: 'Analyzing growth and reinvestment' },
    { status: 'Calculating intrinsic value (DCF)' },
    { status: 'Assessing relative valuation' },
    { status: 'Generating Damodaran analysis' },
  ],
  technical_analyst: [
    FETCH_PRICES,
    { status: 'Calculating trend signals' },
    { status: 'Calculating mean reversion' },
    { status: 'Calculating momentum' },
    { status: 'Analyzing volatility' },
    { status: 'Statistical analysis' },
    { status: 'Combining signals' },
  ],
  fundamentals_analyst: [
    FETCH_METRICS,
    { status: 'Analyzing profitability' },
    { status: 'Analyzing growth' },
    { status: 'Analyzing financial health' },
    { status: 'Analyzing valuation ratios' },
    { status: 'Calculating final signal' },
  ],
};

export function stepsFor(agent: string): AgentStep[] {
  return AGENT_STEPS[agent] ?? GENERIC_STEPS;
}

/** How many SSE events an agent emits for one ticker (fetch steps count twice, plus the final Done). */
export function eventCountFor(agent: string): number {
  return stepsFor(agent).reduce((n, s) => n + (s.fetch ? 2 : 1), 0) + 1;
}

type Signal = 'bullish' | 'bearish' | 'neutral';

/**
 * Sample write-ups per agent and signal. `{t}` is replaced with the ticker.
 * Three variants per signal keep a multi-ticker run from repeating itself.
 */
const AGENT_COMMENTARY: Record<string, Record<Signal, string[]>> = {
  warren_buffett: {
    bullish: [
      "{t} is the kind of business I understand. It sells something people buy again next week, and it has been selling it for decades. Returns on equity sit above 18% without much debt doing the lifting, which tells me the earnings are real.\nManagement buys back stock when it is cheap and stops when it is not. That is rarer than it sounds.\nAt today's price I am paying roughly 80 cents for a dollar of owner earnings. I do not need the market to agree with me this year.",
      "I have watched {t} raise prices through two recessions without losing customers. That is a moat, whatever the consultants want to call it.\nThe balance sheet is boring, which is my favorite quality in a balance sheet. Debt is under two times earnings and the cash keeps piling up.\nI would rather own a wonderful business at a fair price than a fair business at a wonderful price. This one is wonderful, and the price is fair.",
      "The circle of competence matters more than the spreadsheet. I know how {t} makes money and I know who would have to beat them to take it away. Nobody has managed it in twenty years.\nOwner earnings have compounded at about 11% a year. Book value has followed.\nI am buying. If the price falls another 20% I will buy more and thank whoever sold it to me.",
    ],
    bearish: [
      "I looked hard at {t} and came away confused, which is my signal to walk away. The business changed shape three times in five years.\nMargins are thinning and the debt used to paper over it is not cheap anymore.\nThere is no penalty for saying no. I am saying no.",
      "{t} is a fine company at a silly price. Paying 35 times earnings for single-digit growth means the next decade works for the seller, not the buyer.\nThe buybacks are happening at the top, which destroys value quietly.\nI will keep it on the list and wait. Waiting is most of the job.",
      "The moat here is eroding and the reported numbers hide it. Customer acquisition cost is climbing while pricing power is not.\nWhen a business needs more capital every year to stand still, the owner earnings are smaller than the income statement claims.\nI would sell into strength.",
    ],
    neutral: [
      "{t} is a good business trading at a price that already assumes it stays good. Nothing is broken and nothing is on sale.\nReturn on equity is steady in the mid teens and the debt is manageable.\nI am content to do nothing. Doing nothing is an underrated position.",
      "I like the products and I like the management. I do not like the multiple enough to act on it.\nThe margin of safety is thin. Thin is not the same as absent, but it is not enough for a new position.\nHold, and revisit if the market has a bad month.",
      "The numbers at {t} are honest and unexciting. Growth roughly matches the economy, and the balance sheet carries no surprises.\nAt this price the return comes from the dividend and not much else.\nI would neither add nor sell today.",
    ],
  },
  charlie_munger: {
    bullish: [
      "Invert the question: what would have to go wrong at {t}? The answer is a regulatory shock or a competitor with deeper pockets, and neither is on the horizon.\nThe business earns high returns on tangible capital and reinvests them well. That combination compounds quietly.\nA great business at a fair price. Buy it and sit on it.",
      "{t} has the two things I look for: a durable advantage and managers who are not fools with capital. That eliminates most of the field before we even discuss price.\nThe incentive structure is sane. People get paid for results that show up years later.\nI am in favor.",
      "Most of investing is avoiding stupidity rather than seeking brilliance. {t} lets me do both at once.\nThe returns on capital have not dropped below 15% in a decade, through good years and bad.\nI would own this and stop fiddling with it.",
    ],
    bearish: [
      "{t} has too many moving parts and a story that changes with the quarter. Complexity is usually where the losses hide.\nLeverage is doing work that the operating business should be doing.\nI will pass, and I would not feel clever about it. Passing is just sensible.",
      "The accounting at {t} flatters the business. Adjusted earnings exclude costs that recur every single year, which makes them not costs but wishes.\nWhen management redefines profit, that is the tell.\nAvoid.",
      "This is a fragile business dressed as a stable one. Fixed costs are high and the customer can leave at any time.\nA thin moat and a fat multiple is a bad pairing.\nI want no part of it.",
    ],
    neutral: [
      "{t} is a decent business at a price that leaves nothing for the buyer. That is not a scandal, it is just arithmetic.\nThe moat is real but narrow, and the reinvestment rate is modest.\nNo opinion strong enough to trade on.",
      "I see nothing to fix and nothing to exploit at {t}. Both facts point to sitting still.\nCapital allocation is competent, not inspired.\nHold.",
      "The obvious risks are priced and the obvious virtues are priced. When both are priced, the sensible move is to do nothing.\nI would keep my powder dry for something clearer.",
    ],
  },
  ben_graham: {
    bullish: [
      "{t} passes the tests I care about. Current assets cover current liabilities more than twice, and long-term debt is below working capital.\nEarnings have been positive in each of the last ten years, with growth of roughly a third over the period.\nThe price sits below my conservative estimate of intrinsic value. That gap is the margin of safety, and it is wide enough.",
      "The defensive investor can hold {t} without losing sleep. The balance sheet is strong, the dividend record is unbroken, and the multiple is modest.\nNet current asset value alone covers a meaningful share of the market price.\nI would buy at this level and add on weakness.",
      "Price to earnings under 13 and price to book under 1.5 put {t} inside the boundaries I set for a defensive position.\nEarnings stability is the strongest part of the case. No loss years in a decade.\nBuy, with a margin of safety of about 35%.",
    ],
    bearish: [
      "{t} fails on financial strength. Current liabilities exceed current assets and the debt load keeps growing.\nEarnings have been negative in two of the last ten years, which rules it out for a defensive position.\nThe price offers no margin of safety. I would not own it at any weighting.",
      "Speculation is what you call investing when the margin of safety is missing. At 40 times earnings, {t} is a speculation.\nThe asset backing is thin and the goodwill is large.\nI recommend against it.",
      "Earnings quality is poor and the trend is down. The company has been funding its dividend from borrowings.\nAn investment operation promises safety of principal. This one does not.\nSell.",
    ],
    neutral: [
      "{t} clears the strength tests but not the price test. The multiple has run ahead of the earnings record.\nThe margin of safety is roughly 10%, which is too narrow to act on.\nHold and wait for a better entry.",
      "The statements are clean, the debt is moderate, and the valuation is ordinary. There is nothing here that demands action.\nI would keep it under observation.",
      "Half the tests pass and half do not. Earnings are stable but the balance sheet has softened since last year.\nNeutral, pending another year of figures.",
    ],
  },
  bill_ackman: {
    bullish: [
      "{t} is a simple, predictable, free-cash-flow-generative business, which is the whole checklist. Roughly 70% of revenue recurs.\nThe market is discounting a problem that management has already fixed. That gap closes.\nThis is a position worth sizing meaningfully, not a small bet.",
      "The quality of {t} is not in question. The capital structure is. Fix the leverage and the equity re-rates without anything changing operationally.\nFree cash flow conversion is above 90%, so the fix is affordable.\nI would build a concentrated position and engage constructively with the board.",
      "There is a clear catalyst at {t}: the underperforming segment is finally up for sale. Separating it lifts group margins by several points.\nThe core business compounds at double digits on its own.\nHigh conviction, long.",
    ],
    bearish: [
      "{t} is a business I would happily short. Growth is bought with discounts and the unit economics never improve.\nManagement changes the metric whenever the old one stops working.\nThe equity is worth materially less than the screen says.",
      "Predictability is the whole point, and {t} has none. Guidance has been cut three times in two years.\nThe leverage makes a small miss into a large one.\nI would not own this.",
      "The accounting rewards growth today and hides the cost until later. Deferred costs are growing faster than revenue at {t}.\nNo catalyst, no moat, no margin of safety.\nBearish.",
    ],
    neutral: [
      "{t} is a quality business without an obvious catalyst. I can own quality, but I want a reason for the gap to close.\nCash generation is steady and the balance sheet is fine.\nWatching, not acting.",
      "The activist case is weak here because the board has already done the sensible things. That is a compliment and a reason not to get involved.\nValuation is fair.\nNeutral.",
      "I like the business and dislike the entry price. Those two cancel out.\nI would want a 20% drawdown before this becomes interesting.",
    ],
  },
  cathie_wood: {
    bullish: [
      "{t} sits on the right side of a cost curve that keeps falling. Every halving of unit cost opens a market that did not exist before.\nResearch spending is above 15% of revenue and it is going into the platform, not into patches.\nOur five-year model gets there on adoption alone, without needing margin heroics.",
      "The market is valuing {t} on this year's earnings, which misses the point entirely. The company is deliberately trading near-term profit for share of a market growing 40% a year.\nGross margin is already expanding as volume scales.\nHigh conviction. We are adding.",
      "Innovation platforms converge, and {t} sits where two of them meet. That intersection is usually where the outsized returns come from.\nManagement has a decade-long track record of shipping ahead of schedule.\nBullish, with a long time horizon.",
    ],
    bearish: [
      "{t} is on the wrong side of the disruption. Its core revenue line is the thing being replaced, and the replacement is getting cheaper every year.\nResearch spending is defensive rather than exploratory.\nWe would not own it.",
      "The legacy business funds the dividend and the dividend funds the story. Neither survives the technology shift.\nOur models show the addressable market shrinking, not growing.\nBearish.",
      "Incremental improvement is not innovation. {t} has spent five years optimizing a product category that is being disrupted from outside.\nWe see structural decline, not a cyclical dip.",
    ],
    neutral: [
      "{t} is exposed to a real innovation platform, but only partially. Roughly a quarter of revenue is in the growth vector.\nThat mix makes the upside real and the timing uncertain.\nWe would hold rather than add.",
      "Growth is solid but not exponential, and our process is built for exponential.\nNothing here is broken. It simply is not the shape of return we look for.\nNeutral.",
      "The technology thesis is intact and the valuation already reflects a good part of it.\nWe keep the position and wait for the cost curve to do its work.",
    ],
  },
  michael_burry: {
    bullish: [
      "{t} trades below the replacement value of its assets. The market is pricing a permanent decline in a business that is merely out of fashion.\nInsiders have been buying in the open market, which is the only insider signal worth reading.\nFree cash flow yield is above 12%. I am long.",
      "Nobody wants this. That is the setup. Sentiment is at multi-year lows while the balance sheet quietly improved.\nNet cash covers a fifth of the market capitalization at {t}.\nAsymmetric. Long.",
      "The screen flagged {t} because the numbers are absurd. Enterprise value is under four times operating earnings.\nDebt matures in 2031, so there is no refinancing cliff to fear.\nI bought it. I expect to be early.",
    ],
    bearish: [
      "{t} is a crowded consensus long with deteriorating fundamentals. Those end the same way every time.\nReceivables are growing much faster than revenue, which usually means the sales were pulled forward.\nI would be short.",
      "The story here rests on a multiple the market will not pay in a tighter environment. Nothing about the business justifies it.\nInsiders are selling steadily into the rally.\nBearish.",
      "Debt maturities cluster in the next 18 months at rates far above the existing coupon. The refinancing math alone wipes out a chunk of earnings.\nNobody is discussing it yet.\nShort.",
    ],
    neutral: [
      "{t} is cheap-ish but not cheap. The asymmetry I need is not here.\nThe balance sheet is fine and the business is unremarkable.\nI will wait for a worse price.",
      "The contrarian case requires a market that hates the stock. The market is merely indifferent to this one.\nNo position.",
      "Value is roughly fair, insiders are quiet, and sentiment is flat. Three reasons to do nothing.\nWatching for a dislocation.",
    ],
  },
  peter_lynch: {
    bullish: [
      "I use {t} products and so does everyone I know. That is where the research starts, not where it ends, but it is a good place to start.\nThe PEG ratio is about 0.8, which means I am buying growth at less than its rate.\nThis could be a multi-bagger if they keep opening stores at the current pace. I would own it.",
      "{t} is a fast grower hiding in a boring industry. Earnings are up 22% a year and the market still values it like a utility.\nThe balance sheet carries almost no debt, so a bad year does not kill them.\nBuy, and be patient.",
      "The story is simple enough to explain to a twelve-year-old, which is my test. They sell more of the same thing to more people each year.\nInsiders are buying and the institutions have barely noticed.\nThis is exactly the kind of stock that doubles before Wall Street writes it up.",
    ],
    bearish: [
      "{t} is diworsifying. They bought three companies in unrelated businesses and none of them earn the cost of capital.\nDebt has doubled to pay for it while earnings growth slowed.\nI would sell.",
      "The PEG ratio is over 2.5. Paying that for this growth rate never works out.\nInventories are growing faster than sales, which is the classic warning at a retailer.\nBearish.",
      "When the story needs a chart to explain it, I get out. {t} now has four reporting segments and no clear driver.\nEarnings quality is slipping.\nSell into the next rally.",
    ],
    neutral: [
      "{t} is a stalwart. It will not double in two years and it will not halve either.\nGrowth around 8% with a fair multiple is a perfectly respectable place to park money.\nHold it, and spend the research time on something faster.",
      "The PEG sits near 1.3. That is fair, not exciting.\nNothing in the inventory or receivables raises a flag.\nNeutral.",
      "I like the business and the story has not changed. The price has caught up to it.\nHold, and add if the market gives you a scare.",
    ],
  },
  phil_fisher: {
    bullish: [
      "The scuttlebutt on {t} is unusually good. Customers renew, engineers stay, and competitors hire away from them rather than the reverse.\nResearch spending has been above 12% of revenue for five straight years and the product pipeline shows it.\nThis is a business to hold for a very long time.",
      "{t} has the trait I value most: management that tells you about problems before you find them. That honesty has been consistent across two downturns.\nMargins have widened every year as the newer products scale.\nI would buy and hold indefinitely.",
      "Sales growth is backed by genuine product advantage rather than by discounting. Gross margin held steady while volume grew 25%.\nDepth of management is real. No single departure would break this company.\nStrongly positive.",
    ],
    bearish: [
      "The scuttlebutt is poor. Turnover among senior engineers at {t} has risen sharply and the product releases have slipped twice.\nResearch spending is falling as a share of revenue.\nThis is not a business I would hold for the long term.",
      "{t} grows by acquisition because the internal pipeline is empty. That works until the acquisitions stop being cheap.\nMargins are being propped up by cost cuts that cannot repeat.\nNegative.",
      "Management discusses results in terms I cannot reconcile with the statements. In my experience that never improves.\nCompetitive position is weakening at the low end.\nAvoid.",
    ],
    neutral: [
      "{t} is well run and fairly priced. Both facts argue for patience rather than action.\nThe research pipeline is adequate without being remarkable.\nHold.",
      "Product quality is high and the organization is deep. The valuation already reflects that.\nI would not add here.",
      "Margins are stable, management is capable, and the growth rate is ordinary.\nA reasonable long-term holding at a less reasonable price. Neutral.",
    ],
  },
  stanley_druckenmiller: {
    bullish: [
      "The macro setup favors {t}. Falling input costs and a weaker dollar both land directly in the margin line over the next two quarters.\nPrice action confirms it. The stock is making higher lows while the sector makes lower highs.\nWhen liquidity and fundamentals point the same way, size matters more than precision. I would be large.",
      "{t} is where earnings revisions are going up and positioning is still light. That combination usually runs further than people expect.\nSix-month momentum is in the top decile of the sector.\nI am long and willing to add on strength.",
      "The risk-reward is roughly four to one. The downside is bounded by the cash on the balance sheet, and the upside runs with the cycle.\nEarnings momentum has accelerated for three consecutive quarters.\nHigh conviction long.",
    ],
    bearish: [
      "The macro turned against {t} before the earnings did. Rising real rates hit this business through both demand and refinancing.\nThe chart broke a two-year trend line and volume confirmed the break.\nI would be short, and I would not wait for the fundamentals to catch up.",
      "Liquidity is tightening and {t} is one of the most rate-sensitive names in the group. That is a bad place to stand.\nMomentum has rolled over and revisions are heading down.\nBearish.",
      "When I am wrong I get out. Here I do not even need to be right about the company, only about the cycle, and the cycle is turning.\nRisk-reward is poor at this level.\nShort.",
    ],
    neutral: [
      "{t} has no macro tailwind and no macro headwind. That is a reason to put the capital somewhere with an edge.\nMomentum is flat and revisions are mixed.\nNo position.",
      "The setup is unclear. Fundamentals are improving slowly while the chart goes sideways.\nI would rather wait for the market to show its hand.",
      "Risk-reward is roughly symmetric here, which for me means pass.\nI will keep it on the screen and revisit after the next print.",
    ],
  },
  mohnish_pabrai: {
    bullish: [
      "Heads I win, tails I do not lose much. {t} trades near net cash, so the downside is close to bounded.\nThe business earns a 14% free cash flow yield at the current price.\nFew bets, big bets, infrequent bets. This is one of them.",
      "{t} is a low-risk, high-uncertainty situation, which is exactly the mispricing I look for. The uncertainty is about timing, not about survival.\nThe balance sheet carries no meaningful debt.\nA double in three years does not require anything heroic. Long.",
      "I cloned this idea and then checked the arithmetic myself, which is the whole method. The margin of safety holds.\nEnterprise value is under five times owner earnings at {t}.\nBuy.",
    ],
    bearish: [
      "The downside at {t} is not protected. Debt is high and the asset base would not fetch much in a forced sale.\nThat breaks the first rule, so the rest does not matter.\nPass.",
      "I cannot see this doubling in a reasonable time without something unusual going right. That is too many conditions.\nValuation offers no cushion.\nNegative.",
      "The cash yield is thin and the leverage amplifies every bad quarter. Tails I lose a lot.\nAvoid.",
    ],
    neutral: [
      "{t} is a decent business at a price that gives me no real edge. I need the odds heavily in my favor before I act.\nDownside is protected, upside is ordinary.\nNo action.",
      "The margin of safety is present but modest. I would rather wait for a fat pitch.\nNeutral.",
      "Cash yield is fair and the balance sheet is sound. The potential to double is not there at this price.\nHold.",
    ],
  },
  rakesh_jhunjhunwala: {
    bullish: [
      "{t} rides a structural growth story, not a cyclical one. Demand is broadening rather than deepening, which is far more durable.\nReturn on equity is above 20% and funded by operating cash rather than borrowing.\nI would buy and hold for the long haul. Patience is the edge.",
      "Promoters have raised their stake and none of it was pledged. That tells you what the people closest to the business believe.\nEarnings have compounded above 18% for five years.\nBullish, with size.",
      "The market is short-term worried and long-term wrong about {t}. Cash flow conversion is excellent and capacity is expanding into visible demand.\nDebt to equity is under 0.3.\nBuy.",
    ],
    bearish: [
      "Promoter pledging has risen sharply at {t}, which is a warning I take seriously.\nReceivables are stretching and operating cash flow lags reported profit.\nI would stay away.",
      "Growth has stalled while capital spending keeps rising. That pairing destroys returns on equity.\nThe balance sheet is carrying too much debt into a slower cycle.\nNegative.",
      "The reported profit at {t} does not turn into cash. Over time only cash matters.\nI would exit.",
    ],
    neutral: [
      "{t} is a sound business in an ordinary phase. Growth is steady and the price is fair.\nBalance sheet and cash flow both check out.\nHold.",
      "Nothing is wrong here and nothing is compelling. The valuation has caught up with the growth.\nNeutral.",
      "I like the sector and the management. I would want a better entry before adding.\nHold for now.",
    ],
  },
  aswath_damodaran: {
    bullish: [
      "The story I can defend for {t} is steady growth with improving margins, and the numbers support it. My base case discounted cash flow gives a value roughly 30% above the current price.\nThe cost of capital is 8.4%, using a bottom-up beta of 1.05.\nEven my pessimistic scenario leaves the stock modestly undervalued. That is a buy.",
      "Every valuation is a story with numbers attached. Here the story is boring and the numbers are cheap, which is my preferred combination.\nReinvestment is efficient: each dollar returns about 1.4 dollars of value.\nUndervalued on both intrinsic and relative measures.",
      "{t} trades at a discount to its peer group on enterprise value to invested capital, and the discount is not justified by its returns on capital.\nMy DCF value is 22% above the market price.\nBuy, with the usual caveat that the market can stay wrong for a long time.",
    ],
    bearish: [
      "The price of {t} requires a story I cannot tell. Revenue would have to grow 25% a year for a decade with margins expanding throughout.\nMy base case value comes in 40% below the market price.\nOvervalued.",
      "The risk profile has worsened. A higher cost of debt and more operating leverage push the cost of capital above 11%.\nAt that discount rate the intrinsic value falls sharply.\nBearish.",
      "Growth without reinvestment is a fantasy, and growth with bad reinvestment destroys value. {t} is doing the second one.\nReturn on invested capital sits below the cost of capital.\nSell.",
    ],
    neutral: [
      "My estimate of intrinsic value for {t} lands within 10% of the market price. That is a rounding error in this business.\nThe assumptions that matter are growth and margin, and both are reasonable as priced.\nFairly valued. Hold.",
      "Relative valuation says cheap, intrinsic valuation says expensive, and the truth is somewhere in between.\nI would not act on a disagreement that small.",
      "The uncertainty band around my value is wide enough to include the current price comfortably.\nNeutral, pending better information.",
    ],
  },
  technical_analyst: {
    bullish: [
      "Trend, momentum and mean reversion all point the same way on {t}. The 50-day crossed above the 200-day six weeks ago and the gap keeps widening.\nRelative strength is 62 and rising, with volume expanding on up days.\nADX above 28 confirms the trend has force behind it. Bullish.",
      "{t} broke out of an eight-week base on more than twice its average volume. Base breakouts on volume tend to follow through.\nThe pullback held the 20-day moving average, which is textbook.\nMomentum and volatility signals agree. Bullish.",
      "Price sits above all major moving averages and the Hurst exponent suggests trending rather than mean-reverting behavior.\nRealized volatility is falling as price rises, which usually marks a healthy advance.\nBullish.",
    ],
    bearish: [
      "{t} lost its 200-day moving average on heavy volume and has failed to reclaim it on three attempts.\nRelative strength is 34 and falling, with momentum negative across 1, 3 and 6 months.\nBearish.",
      "The trend structure broke. Lower highs and lower lows since the July peak, with distribution days clustering.\nVolatility is expanding on the downside, which is how declines usually accelerate.\nBearish.",
      "Mean reversion signals are stretched but the trend signal dominates, and the trend is down.\nBollinger position is 0.12 with no sign of a reversal candle.\nBearish.",
    ],
    neutral: [
      "{t} is range-bound between clear support and resistance. ADX at 14 says there is no trend to trade.\nMomentum readings conflict across timeframes.\nNeutral.",
      "Price is oscillating around the 50-day moving average with no volume conviction in either direction.\nThe signals cancel out.\nNeutral.",
      "Trend is flat, momentum is flat and volatility is average. There is no edge in the chart today.\nNeutral.",
    ],
  },
  fundamentals_analyst: {
    bullish: [
      "{t} scores well across all four pillars. Return on equity is 19%, net margin 16%, and operating margin above 20%.\nRevenue and earnings growth both exceed 10% year over year.\nCurrent ratio of 2.1 and debt to equity of 0.4 leave plenty of room. Bullish.",
      "Profitability and growth both pass, and the balance sheet is the strongest part of the case. Free cash flow covers earnings more than once.\nValuation ratios sit below the sector median.\nBullish.",
      "Three of four signals are positive at {t}. Margins expanded while revenue grew, which is the healthy combination.\nInterest coverage is above 12 times.\nBullish.",
    ],
    bearish: [
      "{t} fails on financial health. The current ratio is 0.8 and debt to equity exceeds 2.\nMargins contracted for three consecutive quarters.\nBearish.",
      "Growth has turned negative on both the top and bottom line, and the valuation ratios still sit well above the sector.\nFree cash flow is negative for the trailing twelve months.\nBearish.",
      "Return on equity of 4% does not cover the cost of capital. Earnings quality is weak, with profit far exceeding operating cash flow.\nBearish.",
    ],
    neutral: [
      "{t} splits the signals: profitability passes, growth passes, health and valuation do not.\nNothing here is alarming and nothing is compelling.\nNeutral.",
      "Margins and growth are both close to the sector median. The valuation matches.\nNeutral.",
      "Two signals positive, two negative. The company is ordinary on the numbers.\nNeutral.",
    ],
  },
};

const GENERIC_COMMENTARY: Record<Signal, string[]> = {
  bullish: ["The evidence for {t} leans positive. Growth, margins and balance sheet all point the same direction, and the valuation has not caught up yet.\nBullish."],
  bearish: ["{t} shows deteriorating fundamentals against a full valuation. That combination rarely ends well.\nBearish."],
  neutral: ["{t} is fairly valued on the evidence available. No signal strong enough to act on.\nNeutral."],
};

/** Deterministic sample write-up for one agent and ticker. */
export function commentaryFor(agent: string, ticker: string, signal: Signal): string {
  const bySignal = AGENT_COMMENTARY[agent] ?? GENERIC_COMMENTARY;
  const variants = bySignal[signal] ?? GENERIC_COMMENTARY[signal];
  const pick = variants[hashString(`${agent}:${ticker}:${signal}`) % variants.length];
  return pick.replace(/\{t\}/g, ticker);
}
