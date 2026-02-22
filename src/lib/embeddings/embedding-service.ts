/**
 * Embedding Service
 * 
 * Generates embeddings from text using configurable providers.
 * Supports OpenAI, Voyage AI, and local models.
 */

import { 
  EmbeddingVector, 
  EmbeddingConfig, 
  DEFAULT_EMBEDDING_CONFIG,
  EMBEDDING_DIMENSIONS 
} from './types';

// Cache embeddings in memory during a request
const embeddingCache = new Map<string, EmbeddingVector>();

/**
 * Get current embedding configuration
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  const provider = process.env.EMBEDDING_PROVIDER || 'openai';
  
  switch (provider) {
    case 'voyage':
      return {
        provider: 'voyage',
        model: process.env.VOYAGE_MODEL || 'voyage-3',
        dimensions: 1024,
        apiKey: process.env.VOYAGE_API_KEY,
      };
    case 'openai':
    default:
      return {
        provider: 'openai',
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        dimensions: 1536,
        apiKey: process.env.OPENAI_API_KEY,
      };
  }
}

/**
 * Generate embedding for a single text input
 */
export async function generateEmbedding(text: string): Promise<EmbeddingVector> {
  const cacheKey = text.slice(0, 200); // Use truncated text as cache key
  
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }
  
  const config = getEmbeddingConfig();
  let embedding: EmbeddingVector;
  
  switch (config.provider) {
    case 'voyage':
      embedding = await generateVoyageEmbedding(text, config);
      break;
    case 'openai':
    default:
      embedding = await generateOpenAIEmbedding(text, config);
      break;
  }
  
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
  const config = getEmbeddingConfig();
  
  switch (config.provider) {
    case 'voyage':
      return generateVoyageEmbeddings(texts, config);
    case 'openai':
    default:
      return generateOpenAIEmbeddings(texts, config);
  }
}

/**
 * OpenAI embedding generation
 */
async function generateOpenAIEmbedding(
  text: string, 
  config: EmbeddingConfig
): Promise<EmbeddingVector> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

async function generateOpenAIEmbeddings(
  texts: string[], 
  config: EmbeddingConfig
): Promise<EmbeddingVector[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: texts,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI batch embedding failed: ${error}`);
  }
  
  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Voyage AI embedding generation
 */
async function generateVoyageEmbedding(
  text: string, 
  config: EmbeddingConfig
): Promise<EmbeddingVector> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
      input_type: 'document',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage embedding failed: ${error}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

async function generateVoyageEmbeddings(
  texts: string[], 
  config: EmbeddingConfig
): Promise<EmbeddingVector[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: texts,
      input_type: 'document',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage batch embedding failed: ${error}`);
  }
  
  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Vector math utilities
 */

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function addVectors(a: EmbeddingVector, b: EmbeddingVector): EmbeddingVector {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }
  return a.map((val, i) => val + b[i]);
}

export function scaleVector(v: EmbeddingVector, scalar: number): EmbeddingVector {
  return v.map(val => val * scalar);
}

export function averageVectors(vectors: EmbeddingVector[]): EmbeddingVector {
  if (vectors.length === 0) {
    throw new Error('Cannot average empty array');
  }
  
  const dims = vectors[0].length;
  const result = new Array(dims).fill(0);
  
  for (const vec of vectors) {
    for (let i = 0; i < dims; i++) {
      result[i] += vec[i];
    }
  }
  
  return result.map(val => val / vectors.length);
}

export function weightedAverageVectors(
  vectors: EmbeddingVector[], 
  weights: number[]
): EmbeddingVector {
  if (vectors.length !== weights.length) {
    throw new Error('Vectors and weights must have same length');
  }
  
  if (vectors.length === 0) {
    throw new Error('Cannot average empty array');
  }
  
  const dims = vectors[0].length;
  const result = new Array(dims).fill(0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  for (let v = 0; v < vectors.length; v++) {
    for (let i = 0; i < dims; i++) {
      result[i] += vectors[v][i] * weights[v];
    }
  }
  
  return result.map(val => val / totalWeight);
}

export function normalizeVector(v: EmbeddingVector): EmbeddingVector {
  const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return v;
  return v.map(val => val / norm);
}

export function interpolateVectors(
  a: EmbeddingVector, 
  b: EmbeddingVector, 
  t: number // 0 = a, 1 = b
): EmbeddingVector {
  return a.map((val, i) => val * (1 - t) + b[i] * t);
}

/**
 * Create a zero vector
 */
export function zeroVector(dims: number = EMBEDDING_DIMENSIONS): EmbeddingVector {
  return new Array(dims).fill(0);
}
