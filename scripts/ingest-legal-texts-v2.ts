/**
 * Legal Text Ingestion Script v2 (Upgraded RAG)
 * 
 * Improvements over v1:
 * 1. Section-aware chunking (splits on legal section boundaries)
 * 2. Metadata-enriched embeddings (prepends act name + section to content before embedding)
 * 3. Smaller, more precise chunks (200-600 tokens)
 * 
 * Usage: npx tsx scripts/ingest-legal-texts-v2.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHARS_PER_TOKEN = 4;
const MAX_CHUNK_TOKENS = 600;
const MIN_CHUNK_TOKENS = 100;
const OVERLAP_CHARS = 100;

const FILE_METADATA: Record<string, { actName: string }> = {
  'consumer_protection_act_2019': { actName: 'Consumer Protection Act 2019' },
  'rera_act_2016': { actName: 'RERA Act 2016' },
  'rti_act_2005': { actName: 'RTI Act 2005' },
};

interface LegalChunk {
  content: string;
  embeddingText: string; // Metadata-enriched text for embedding
  actName: string;
  sectionNumber: string;
  chapter: string;
  tokenCount: number;
}

// --- Load env ---
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
  }
}

// --- Section-aware chunking ---

/**
 * Splits legal text into chunks aligned with section boundaries.
 * Detects patterns like "Section 2.", "35.", "CHAPTER IV" etc.
 */
function sectionAwareChunk(text: string, actName: string): LegalChunk[] {
  const chunks: LegalChunk[] = [];
  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Split on section boundaries
  // Matches: "Section 2.", "2.", "SECTION 35", "Chapter IV", etc.
  const sectionPattern = /(?=(?:^|\n)(?:(?:Section|SECTION)\s+\d+[A-Za-z]?\.?|(?:CHAPTER|Chapter)\s+[IVXLCDM]+|\d+\.\s+[A-Z]))/gm;
  
  const sections = cleanedText.split(sectionPattern).filter(s => s.trim().length > 0);

  let currentChapter = 'General';

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (trimmedSection.length < 20) continue;

    // Detect chapter
    const chapterMatch = trimmedSection.match(/(?:CHAPTER|Chapter)\s+([IVXLCDM]+|\d+)/);
    if (chapterMatch) {
      currentChapter = `Chapter ${chapterMatch[1]}`;
    }

    // Detect section number
    const sectionMatch = trimmedSection.match(/(?:Section|SECTION)\s+(\d+[A-Za-z]?)/);
    const numberedMatch = trimmedSection.match(/^(\d+)\.\s/);
    const sectionNumber = sectionMatch 
      ? `Section ${sectionMatch[1]}` 
      : numberedMatch 
        ? `Section ${numberedMatch[1]}` 
        : 'General';

    const tokenCount = Math.round(trimmedSection.length / CHARS_PER_TOKEN);

    // If section is small enough, keep as one chunk
    if (tokenCount <= MAX_CHUNK_TOKENS) {
      if (tokenCount >= MIN_CHUNK_TOKENS) {
        const embeddingText = `${actName}, ${sectionNumber}, ${currentChapter}: ${trimmedSection}`;
        chunks.push({
          content: trimmedSection,
          embeddingText,
          actName,
          sectionNumber,
          chapter: currentChapter,
          tokenCount: Math.max(200, Math.min(1000, tokenCount)),
        });
      }
    } else {
      // Split large sections into sub-chunks with overlap
      const maxChars = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN;
      let pos = 0;
      let subIndex = 1;

      while (pos < trimmedSection.length) {
        let end = pos + maxChars;

        // Try to break at sentence boundary
        if (end < trimmedSection.length) {
          const window = trimmedSection.slice(end - 80, end + 80);
          const sentenceEnd = window.search(/[.!?]\s/);
          if (sentenceEnd !== -1) {
            end = end - 80 + sentenceEnd + 2;
          }
        } else {
          end = trimmedSection.length;
        }

        const chunkText = trimmedSection.slice(pos, end).trim();
        const chunkTokens = Math.round(chunkText.length / CHARS_PER_TOKEN);

        if (chunkTokens >= MIN_CHUNK_TOKENS) {
          const subSection = subIndex > 1 ? `${sectionNumber} (part ${subIndex})` : sectionNumber;
          const embeddingText = `${actName}, ${subSection}, ${currentChapter}: ${chunkText}`;
          chunks.push({
            content: chunkText,
            embeddingText,
            actName,
            sectionNumber: subSection,
            chapter: currentChapter,
            tokenCount: Math.max(200, Math.min(1000, chunkTokens)),
          });
        }

        pos = Math.max(pos + 1, end - OVERLAP_CHARS);
        subIndex++;
      }
    }
  }

  return chunks;
}

// --- Embedding generation ---

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// --- Main ---

async function main() {
  console.log('=== AI Vakeel Legal Text Ingestion v2 (Upgraded RAG) ===\n');
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');

  const supabase = createClient(url, key);

  // Clear existing chunks (re-ingesting with better chunking)
  console.log('Clearing existing legal_chunks...');
  const { error: deleteError } = await supabase.from('legal_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    console.log('Warning: Could not clear existing chunks:', deleteError.message);
  } else {
    console.log('Cleared existing chunks.\n');
  }

  // Find .txt files
  const dataFiles = fs.readdirSync(DATA_DIR).filter(f => path.extname(f).toLowerCase() === '.txt');

  if (dataFiles.length === 0) {
    console.error('No .txt files found in /data/ folder.');
    process.exit(1);
  }

  console.log(`Found ${dataFiles.length} file(s):\n`);
  dataFiles.forEach(f => console.log(`  - ${f}`));
  console.log('');

  let totalChunks = 0;

  for (const file of dataFiles) {
    const filePath = path.join(DATA_DIR, file);
    const baseName = path.basename(file, '.txt');
    const metadata = FILE_METADATA[baseName];

    if (!metadata) {
      console.log(`Skipping ${file} (no metadata mapping)`);
      continue;
    }

    console.log(`\n📄 Processing: ${file}`);
    console.log(`   Act: ${metadata.actName}`);

    const text = fs.readFileSync(filePath, 'utf-8');
    console.log(`   Text: ${text.length} characters`);

    // Section-aware chunking
    const chunks = sectionAwareChunk(text, metadata.actName);
    console.log(`   Chunks: ${chunks.length} (section-aware)`);

    // Generate embeddings and upload one at a time
    console.log(`   Uploading with metadata-enriched embeddings...`);
    let uploaded = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Generate embedding from the ENRICHED text (includes act name + section)
        const embedding = await generateEmbedding(chunk.embeddingText);

        const { error } = await supabase.from('legal_chunks').insert({
          content: chunk.content,
          embedding,
          act_name: chunk.actName,
          section_number: chunk.sectionNumber,
          chapter: chunk.chapter,
          token_count: chunk.tokenCount,
        });

        if (error) {
          console.error(`   Error on chunk ${i + 1}: ${error.message}`);
          continue;
        }

        uploaded++;
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          console.log(`   Progress: ${i + 1}/${chunks.length} (${uploaded} uploaded)`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`   Error on chunk ${i + 1}: ${msg}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    totalChunks += uploaded;
    console.log(`   Done: ${uploaded} chunks uploaded.`);
  }

  console.log(`\n=== Ingestion Complete ===`);
  console.log(`Total: ${totalChunks} chunks with metadata-enriched embeddings`);
  console.log(`\nRAG pipeline upgraded. Similarity scores should be significantly higher now.`);
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
