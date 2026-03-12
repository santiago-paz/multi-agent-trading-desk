import { generateText } from 'ai';
import { PanelQuote } from '../iol/types';

export interface AdvisorRecommendation {
  simbolo: string;
  cantidad: number;
  tipo: 'buy' | 'sell';
}

export interface AdvisorOutput {
  analysis: string;
  recommendations: AdvisorRecommendation[];
}

export class AdvisorAgent {
  async generateRecommendation(
    cash: number, 
    availableQuotes: PanelQuote[], 
    strategy: 'Conservadora' | 'Media' | 'Arriesgada'
  ): Promise<AdvisorOutput> {
    
    const contextStr = availableQuotes.map(q => 
      `- ${q.simbolo} (${q.descripcion}): Precio $${q.ultimoPrecio}, Var: ${q.variacionPorcentual}%`
    ).join('\n');

    const prompt = `
      Eres un Asesor Financiero Cuantitativo de un Hedge Fund.
      Tu tarea es recomendar en qué invertir basado en el saldo disponible, la estrategia elegida y los instrumentos del mercado disponibles.
      
      Saldo Disponible: $${cash} (Pesos Argentinos - ARS)
      Estrategia Elegida: ${strategy}
      
      Instrumentos Disponibles Hoy (con su respectivo Precio en ARS):
      ${contextStr}
      
      Reglas:
      1. Solo puedes recomendar instrumentos incluidos explícitamente en la lista provista arriba.
      2. Matemáticas estrictas: Debes calcular una "cantidad" entera de títulos a comprar de modo que el costo total (suma de cantidad * precio de cada instrumento) sea estrictamente MENOR o IGUAL al Saldo Disponible ($${cash} ARS). Trata de dejar siempre un margen del 1% para cubrir posibles comisiones.
      3. CRÍTICO (FALLBACK): Si el Saldo Disponible ($${cash}) no te alcanza para comprar ni siquiera 1 unidad de los instrumentos más conocidos y caros (como los CEDEARs), NO los sugieras. Fíjate en la lista porque hemos traído alternativas baratas (Títulos Públicos, Letras, o Acciones Locales de menor valor como TX24, S31O3). Manda a recomentar esos que sí alcanzan dentro del presupuesto. Si no te alcanza para NADA en absoluto, devuelve recomendaciones vacío y explícalo en el 'analysis'.
      4. Si la estrategia es "Conservadora", busca instrumentos con menor variación y Bonos. Si es "Arriesgada", puedes concentrar en opciones volátiles (o CEDEARs) siempre y cuando el dinero alcance.
      5. La recomendación debe ser retornada estrictamente en formato JSON validable y nada más. No incluyas markdown \`\`\`json ni saludos, SOLAMENTE EL OBJETO JSON.
      
      Ejemplo de estructura esperada (si por ejemplo te alcanzan 10.000 ARS y el TX24 cotiza a 1500 ARS):
      {
        "analysis": "Debido a que el saldo es de 10.000 ARS, no es posible comprar CEDEARs, por lo que nos enfocamos en Bonos como TX24 que sí entran en el presupuesto para una estrategia elegida.",
        "recommendations": [
          { "simbolo": "TX24", "cantidad": 6, "tipo": "buy" }
        ]
      }
    `;

    try {
      const { text } = await generateText({
        model: 'meta/llama-3.3-70b',
        prompt: prompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AdvisorOutput;
      }
      
      throw new Error('Failed to parse advisor output');
    } catch (error) {
      console.error('Advisor failed:', error);
      return {
        analysis: 'Error al generar recomendación. Inténtalo de nuevo.',
        recommendations: [],
      };
    }
  }
}

export const advisorAgent = new AdvisorAgent();
