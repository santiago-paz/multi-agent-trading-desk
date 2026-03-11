
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function checkNewsOutput() {
  try {
    const result = await yahooFinance.search('AAPL', { newsCount: 2 });
    console.log(JSON.stringify(result.news, null, 2));
  } catch (e) {
    console.error(e);
  }
}

checkNewsOutput();
