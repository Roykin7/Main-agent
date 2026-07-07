export async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3' }),
  })
  if (!res.ok) throw new Error(`Voyage embed error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.data[0].embedding as number[]
}
