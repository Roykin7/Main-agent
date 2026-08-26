import { getSupabase } from './supabase'
import { embed } from './embeddings'

const MATCH_COUNT = 8

export type KnowledgeChunk = {
  title: string | null
  content: string
}

export type DiagnosisCase = {
  symptomDescription: string
  affectedPart: string | null
  diagnosis: string
  treatment: string
  cropType: string
  region: string | null
  similarity?: number
}

export type Devotion = {
  title: string | null
  scriptureRef: string | null
  content: string
  sourceUrl: string | null
}

/**
 * Vector-searches knowledge_chunks for the given query.
 * All content — seeded KB, social posts, user-contributed facts — lives here.
 */
export async function searchKnowledge(query: string): Promise<KnowledgeChunk[]> {
  const queryEmbedding = await embed(query)

  const { data, error } = await getSupabase().rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    query_text: query,
    match_count: MATCH_COUNT,
    filter_topic: null,
  })

  if (error) {
    console.error('searchKnowledge error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    title: row.title,
    content: row.content,
  }))
}

export async function searchDiagnosisCases(symptoms: string): Promise<DiagnosisCase[]> {
  const queryEmbedding = await embed(symptoms)

  const { data, error } = await getSupabase().rpc('match_diagnosis_cases', {
    query_embedding: queryEmbedding,
    match_count: 3,
  })

  if (error) {
    console.error('searchDiagnosisCases error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    symptomDescription: row.symptom_description,
    affectedPart: row.affected_part,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    cropType: row.crop_type,
    region: row.region,
    similarity: row.similarity,
  }))
}

export type DiseaseImage = {
  diseaseName: string
  imageUrl: string
  caption: string | null
  source: string | null
  similarity: number
}

// Below this similarity, the curated match is too loose to trust — better to
// fall back to a live web search (clearly caveated) than send the wrong photo.
const DISEASE_IMAGE_MATCH_THRESHOLD = 0.75

/**
 * Best curated reference photo for a disease/pest, or null if nothing
 * in disease_images is a confident enough match for the given query.
 */
export async function getCuratedDiseaseImage(query: string): Promise<DiseaseImage | null> {
  const queryEmbedding = await embed(query)

  const { data, error } = await getSupabase().rpc('match_disease_images', {
    query_embedding: queryEmbedding,
    match_count: 1,
  })

  if (error) {
    console.error('getCuratedDiseaseImage error:', error)
    return null
  }

  const row = data?.[0]
  if (!row || row.similarity < DISEASE_IMAGE_MATCH_THRESHOLD) return null

  return {
    diseaseName: row.disease_name,
    imageUrl: row.image_url,
    caption: row.caption,
    source: row.source,
    similarity: row.similarity,
  }
}

export async function getDevotion(date: string): Promise<Devotion | null> {
  const { data, error } = await getSupabase()
    .from('devotions')
    .select('title, scripture_ref, content, source_url')
    .eq('devo_date', date)
    .maybeSingle()

  if (error) {
    console.error('getDevotion error:', error)
    return null
  }
  if (!data) return null

  return {
    title: data.title,
    scriptureRef: data.scripture_ref,
    content: data.content,
    sourceUrl: data.source_url,
  }
}
