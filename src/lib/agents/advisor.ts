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
      5. La recomendación debe ser retornada estrictamente en formato JSON validable y nada más. No incluyas markdown \`\`\`json ni saludos, SOLAMENTE EL OBJETO JSON.
      
      Estructura de JSON esperada:
      {
        "technical_analysis": "Breve resumen de tu razonamiento como Analista Técnico para los activos seleccionados.",
        "sentiment_analysis": "Breve resumen de tu razonamiento como Analista de Sentimiento de Noticias para los activos seleccionados.",
        "analysis": "Resumen como Portfolio Manager justificando la combinación final y la asignación del capital de ${cash} ARS.",
        "recommendations": [
          { "simbolo": "TX24", "cantidad": 6, "tipo": "buy" }
        ]
      }
    `;

    try {
      const { text } = await generateText({
        model: 'meta/llama-3.3-70b', 
        system: 'Eres un sistema de hedge fund autónomo financiero cuantitativo. Retornas estrictamente JSON y te apegas siempre al presupuesto matemáticamente.',
        prompt: prompt,
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
      // The LLM sometimes allocates the full budget to each position independently.
      // Enforce that the SUM of all positions fits within the available cash (minus 1% for commissions).
      const priceMap = Object.fromEntries(quotes.map(q => [q.symbol, q.currentPrice]));
      const budget = cash * 0.99;
      const totalCost = output.recommendations.reduce(
        (sum, rec) => sum + rec.cantidad * (priceMap[rec.simbolo] ?? 0),
        0,
      );
      if (totalCost > budget) {
        const scale = budget / totalCost;
        output.recommendations = output.recommendations
          .map(rec => ({ ...rec, cantidad: Math.floor(rec.cantidad * scale) }))
          .filter(rec => rec.cantidad > 0);
      }

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
