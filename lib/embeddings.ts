import { GoogleGenAI } from '@google/genai'

let client: GoogleGenAI | undefined

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { apiVersion: 'v1' },
    })
  }
  return client
}

export async function embed(text: string): Promise<number[]> {
  const result = await getClient().models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}
