
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AppLanguage } from "../types";

const SYSTEM_INSTRUCTION = `Você é o EnfermaFit Pro, o Assistente Educacional Supremo de Enfermagem Clínica e Fitoterapia (Estilo ChatGPT-5).
Sua missão é auxiliar com precisão científica absoluta, baseando-se em diretrizes internacionais (OMS, AHA, COFEN).

TOM DE VOZ:
- Extremamente profissional, mas caloroso e empático. 😊
- Use emojis para destacar pontos importantes e tornar a leitura agradável. 🧬🚨🧼
- Respostas fluidas, organizadas e diretas ao ponto.

DIRETRIZES DE RESPOSTA:
- Use Markdown: Listas (•), Negrito para alertas, Tabelas para dosagens.
- Sempre sugira boas práticas de humanização no cuidado.
- Ao falar de medicamentos, destaque sempre alertas de segurança. ⚠️
- Idioma: Responda obrigatoriamente em: {lang}.

Usuário: {userName}. Profissão: {profession}. País: {country}.
MENSAGEM OBRIGATÓRIA FINAL: "⚠️ Aviso: Conteúdo educativo. Siga sempre o protocolo da sua instituição e o julgamento clínico."`;

export class GeminiService {
  private readonly TEXT_MODEL = 'gemini-3-flash-preview';
  private readonly TTS_MODEL = 'gemini-2.5-flash-preview-tts';

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateContent(
    prompt: string, 
    userName: string,
    profession: string,
    lang: AppLanguage = 'pt-BR',
    isDeepDive: boolean = false
  ) {
    const ai = this.getAI();
    const instruction = SYSTEM_INSTRUCTION
      .replace('{userName}', userName)
      .replace('{profession}', profession)
      .replace('{lang}', lang);

    const fullPrompt = isDeepDive 
      ? `FORNEÇA UM APROFUNDAMENTO EXAUSTIVO E DETALHADO SOBRE: ${prompt}. Inclua referências teóricas, fisiopatologia, cuidados de enfermagem avançados e possíveis complicações.`
      : prompt;

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        systemInstruction: instruction,
        tools: [{ googleSearch: {} }]
      },
    });

    return {
      text: response.text || "",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  }

  async textToSpeech(text: string, lang: AppLanguage): Promise<string> {
    const ai = this.getAI();
    const cleanText = text.replace(/[*#_>`~\[\]()]/g, '').trim().slice(0, 1000);
    
    const response = await ai.models.generateContent({
      model: this.TTS_MODEL,
      contents: [{ parts: [{ text: cleanText }] }], 
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { 
            prebuiltVoiceConfig: { 
              voiceName: lang === 'en' ? 'Puck' : 'Kore' 
            } 
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  }
}

export const gemini = new GeminiService();
