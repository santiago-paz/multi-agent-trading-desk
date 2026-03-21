import { generateText } from 'ai';
import { ComprehensiveAssetData } from '../market-data';

export interface AdvisorRecommendation {
  simbolo: string;
  cantidad: number;
  tipo: 'buy' | 'sell';
}

export interface AdvisorOutput {
  analysis: string;
  technical_analysis?: any;
  sentiment_analysis?: any;
  recommendations: AdvisorRecommendation[];
  precios?: Record<string, number>;
}

export const advisorAgent = {
  async generateRecommendation(
    cash: number, 
    quotes: ComprehensiveAssetData[], 
    strategy: 'Conservadora' | 'Media' | 'Arriesgada',
  ): Promise<AdvisorOutput> {

    // Construct Context from Quotes
    const contextStr = quotes.map(q => {
      return `- [${q.symbol}] Precio: $${q.currentPrice} ARS
        Técnico (Últimos 60 días): SMA20=${q.technicals.sma20?.toFixed(2) || 'N/A'}, SMA50=${q.technicals.sma50?.toFixed(2) || 'N/A'}, RSI(14)=${q.technicals.rsi14?.toFixed(2) || 'N/A'}
        Noticias Recientes:
        ${q.recentNews.map(n => `  * ${n.title} - ${n.summary}`).join('\n')}
      `;
    }).join('\n');

    const prompt = `
      Eres el COMITÉ DE INVERSIONES de un Hedge Fund Cuantitativo actuando como un único Agente.
      Tu tarea es recomendar en qué invertir basado en el saldo disponible, la estrategia elegida y los instrumentos del mercado disponibles.
      
      Debes simular el razonamiento de tres roles internos:
      1. Technical Analyst: Analiza tendencias usando SMA20, SMA50 y reversión a la media con el RSI(14).
      2. Sentiment Analyst: Analiza el sentimiento y noticias recientes de la empresa/bono.
      3. Portfolio Manager: Realiza las asignaciones de capital respetando estrictamente el presupuesto.

      Saldo Disponible: $${cash} (Pesos Argentinos - ARS)
      Estrategia Elegida: ${strategy}
      
      Instrumentos Pre-Filtrados Hoy (con su respectivo Precio, Técnicos y Noticias en ARS):
      ${contextStr}
      
      Reglas de Portfolio Manager:
      1. Solo puedes recomendar instrumentos incluidos explícitamente en la lista provista arriba.
      2. Matemáticas estrictas: Debes calcular una "cantidad" entera de títulos a comprar de modo que el costo total (suma de cantidad * precio de cada instrumento) sea estrictamente MENOR o IGUAL al Saldo Disponible ($${cash} ARS). Trata de dejar siempre un margen del 1% para cubrir posibles comisiones.
      3. CRÍTICO (FALLBACK): Si el Saldo Disponible ($${cash}) no te alcanza para comprar ni siquiera 1 unidad de los instrumentos, NO lo sugieras. En su lugar, si hay Bonos baratos, recuérdalos. Si no te alcanza para nada, devuelve recomendaciones vacío.
      4. Si la estrategia es "Conservadora", busca instrumentos con poca volatilidad y RSI moderado. Si es "Arriesgada", puedes buscar breakouts y alto momentum o empresas expuestas a noticias extremas.
      5. DIVERSIFICACIÓN OBLIGATORIA: Debes recomendar entre 3 y 5 instrumentos distintos. Ningún instrumento individual puede superar el 40% del presupuesto total. Distribuye el capital entre los instrumentos seleccionados de manera razonable.
      6. La recomendación debe ser retornada estrictamente en formato JSON validable y nada más. No incluyas markdown \`\`\`json ni saludos, SOLAMENTE EL OBJETO JSON.
      
      Estructura de JSON esperada:
      {
        "technical_analysis": "Breve resumen de tu razonamiento como Analista Técnico para los activos seleccionados.",
        "sentiment_analysis": "Breve resumen de tu razonamiento como Analista de Sentimiento de Noticias para los activos seleccionados.",
        "analysis": "Resumen como Portfolio Manager justificando la combinación final y la asignación del capital de ${cash} ARS.",
        "recommendations": [
          { "simbolo": "VIST", "cantidad": 10, "tipo": "buy" },
          { "simbolo": "MELI", "cantidad": 5, "tipo": "buy" },
          { "simbolo": "AL30", "cantidad": 3, "tipo": "buy" }
        ]
      }
    `;

    try {
      const { text } = await generateText({
        model: 'meta/llama-3.3-70b',
        system: 'Eres un sistema de hedge fund autónomo financiero cuantitativo. Retornas estrictamente JSON y te apegas siempre al presupuesto matemáticamente.',
        prompt: prompt,
        temperature: 0,
      });

      // Try to parse out the JSON if there's markdown wrappings
      let rawJson = text;
      if (rawJson.includes('```json')) {
        rawJson = rawJson.split('```json')[1].split('```')[0].trim();
      } else if (rawJson.includes('```')) {
        rawJson = rawJson.split('```')[1].trim();
      }

      const output = JSON.parse(rawJson) as AdvisorOutput;

      // ── Budget enforcement ────────────────────────────────────────────────────
      const priceMap = Object.fromEntries(quotes.map(q => [q.symbol, q.currentPrice]));
      const budget = cash * 0.99; // 1% margin for commissions

      // Filter out symbols the LLM hallucinated (not in our price data) and zero quantities
      output.recommendations = output.recommendations.filter(
        rec => rec.cantidad > 0 && priceMap[rec.simbolo] != null,
      );

      // Greedy knapsack: iterate in LLM priority order, cap each position to what's affordable
      // and enforce max 40% of total budget per position for diversification
      const maxPerPosition = Math.floor(budget * 0.4);
      let remaining = budget;
      const capped: AdvisorRecommendation[] = [];
      for (const rec of output.recommendations) {
        const price = priceMap[rec.simbolo];
        if (!price || price <= 0) continue;
        const maxAffordable = Math.floor(Math.min(remaining, maxPerPosition) / price);
        const qty = Math.min(rec.cantidad, maxAffordable);
        if (qty <= 0) continue;
        capped.push({ ...rec, cantidad: qty });
        remaining -= qty * price;
      }

      // Scale-up pass: if the LLM under-allocated (>20% budget unused), distribute
      // remaining budget proportionally across positions (common with cheap bonds
      // where the LLM recommends stock-like quantities of 4 instead of 4000).
      // Respects the 40% per-position cap.
      if (remaining > budget * 0.2 && capped.length > 0) {
        const totalCost = capped.reduce((s, r) => s + r.cantidad * (priceMap[r.simbolo] ?? 0), 0);
        if (totalCost > 0) {
          const scaleFactor = (totalCost + remaining) / totalCost;
          for (const rec of capped) {
            const price = priceMap[rec.simbolo];
            if (!price || price <= 0) continue;
            const maxByBudgetCap = Math.floor(maxPerPosition / price);
            const scaled = Math.min(Math.floor(rec.cantidad * scaleFactor), maxByBudgetCap);
            rec.cantidad = scaled;
          }
          // Recalculate remaining after scale-up
          remaining = budget - capped.reduce((s, r) => s + r.cantidad * (priceMap[r.simbolo] ?? 0), 0);
        }
      }

      output.recommendations = capped;

      // Attach prices so the UI can display them
      output.precios = priceMap;

      return output;
    } catch (error) {
      console.error('Advisor generation error:', error);
      return {
        analysis: 'Error interno generando la recomendación del Advisor.',
        recommendations: []
      };
    }
  }
};
