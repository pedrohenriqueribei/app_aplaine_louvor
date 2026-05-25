import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini client server-side only
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, title, artist } = body;

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Título e artista são obrigatórios." },
        { status: 400 }
      );
    }

    if (action === "song-info") {
      const prompt = `Analise a música "${title}" do artista "${artist}" e retorne o tom original (key), BPM aproximado e o compasso (time signature).`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, description: "Tom original (Ex: G, Am, D#m)" },
              bpm: { type: Type.STRING, description: "Batidas por minuto (Ex: 120)" },
              timeSignature: { type: Type.STRING, description: "Compasso (Ex: 4/4)" }
            },
            required: ["key"]
          }
        }
      });

      const text = response.text?.trim() || "{}";
      return NextResponse.json({ result: text });

    } else if (action === "chord-sheet") {
      const prompt = `Busque a letra e os acordes (cifra) da música "${title}" do artista "${artist}" no seu tom original.
      Retorne a cifra formatada para leitura clara, com os acordes sobre as palavras ou entre parênteses conforme o padrão de cifras.
      Responda APENAS o conteúdo da cifra, sem explicações.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const result = response.text?.trim() || "";
      return NextResponse.json({ result });

    } else {
      return NextResponse.json(
        { error: "Ação inválida." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Gemini server-side API error:", error);
    return NextResponse.json(
      { error: error?.message || "Ocorreu um erro ao processar a requisição com a IA." },
      { status: 500 }
    );
  }
}
