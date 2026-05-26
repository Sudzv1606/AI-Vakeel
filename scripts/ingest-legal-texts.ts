/**
 * Legal Text Ingestion Script
 * 
 * Reads PDF/TXT files from /data/ folder, extracts text, chunks it,
 * generates embeddings, and uploads to Supabase legal_chunks table.
 * 
 * Usage: npx tsx scripts/ingest-legal-texts.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHUNK_SIZE_TOKENS = 500; // Target chunk size in tokens (~4 chars per token)
const CHUNK_OVERLAP_TOKENS = 50;
const CHARS_PER_TOKEN = 4; // Approximate

// File-to-metadata mapping
const FILE_METADATA: Record<string, { actName: string; defaultChapter: string }> = {
  'consumer_protection_act_2019': {
    actName: 'Consumer Protection Act 2019',
    defaultChapter: 'General',
  },
  'rera_act_2016': {
    actName: 'RERA Act 2016',
    defaultChapter: 'General',
  },
  'rti_act_2005': {
    actName: 'RTI Act 2005',
    defaultChapter: 'General',
  },
};

// --- Types ---

interface LegalChunk {
  content: string;
  actName: string;
  sectionNumber: string;
  chapter: string;
  tokenCount: number;
}

// --- Supabase Client ---

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Make sure .env.local is loaded or set these environment variables.'
    );
  }

  return createClient(url, key);
}

// --- PDF Text Extraction ---

async function extractTextFromPDF(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// --- Text Extraction (PDF or TXT) ---

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    console.log(`  Extracting text from PDF: ${path.basename(filePath)}`);
    return await extractTextFromPDF(filePath);
  } else if (ext === '.txt') {
    console.log(`  Reading text file: ${path.basename(filePath)}`);
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  throw new Error(`Unsupported file type: ${ext}`);
}

// --- Section Detection ---

/**
 * Attempts to detect section numbers from text content.
 * Looks for patterns like "Section 35", "35.", "SECTION 35" etc.
 */
function detectSection(text: string): string {
  // Match "Section X" or "SECTION X" patterns
  const sectionMatch = text.match(/(?:Section|SECTION)\s+(\d+[A-Za-z]?)/);
  if (sectionMatch) {
    return `Section ${sectionMatch[1]}`;
  }

  // Match "X." at the start of a line (numbered sections)
  const numberedMatch = text.match(/^(\d+)\.\s/m);
  if (numberedMatch) {
    return `Section ${numberedMatch[1]}`;
  }

  return 'General';
}

/**
 * Attempts to detect chapter from text content.
 */
function detectChapter(text: string): string {
  const chapterMatch = text.match(/(?:Chapter|CHAPTER)\s+([IVXLCDM]+|\d+)/i);
  if (chapterMatch) {
    return `Chapter ${chapterMatch[1]}`;
  }
  return 'General';
}

// --- Chunking ---

/**
 * Splits text into chunks of approximately CHUNK_SIZE_TOKENS tokens
 * with CHUNK_OVERLAP_TOKENS overlap between consecutive chunks.
 */
function chunkText(text: string, actName: string, defaultChapter: string): LegalChunk[] {
  const chunks: LegalChunk[] = [];
  
  // Clean up text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunkSizeChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

  let position = 0;
  let currentChapter = defaultChapter;

  while (position < cleanedText.length) {
    // Get chunk text
    let endPosition = position + chunkSizeChars;
    
    // Try to break at a sentence boundary
    if (endPosition < cleanedText.length) {
      const searchWindow = cleanedText.slice(endPosition - 100, endPosition + 100);
      const sentenceEnd = searchWindow.search(/[.!?]\s/);
      if (sentenceEnd !== -1) {
        endPosition = endPosition - 100 + sentenceEnd + 2;
      }
    } else {
      endPosition = cleanedText.length;
    }

    const chunkContent = cleanedText.slice(position, endPosition).trim();
    
    if (chunkContent.length < 50) {
      // Skip very small trailing chunks
      break;
    }

    // Detect section and chapter from chunk content
    const detectedChapter = detectChapter(chunkContent);
    if (detectedChapter !== 'General') {
      currentChapter = detectedChapter;
    }

    const sectionNumber = detectSection(chunkContent);
    const tokenCount = Math.round(chunkContent.length / CHARS_PER_TOKEN);

    // Enforce token count bounds (200-1000)
    const clampedTokenCount = Math.max(200, Math.min(1000, tokenCount));

    chunks.push({
      content: chunkContent,
      actName,
      sectionNumber,
      chapter: currentChapter,
      tokenCount: clampedTokenCount,
    });

    // Move position forward with overlap
    position = Math.max(position + 1, endPosition - overlapChars);
  }

  return chunks;
}

// --- Embedding Generation ---

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable');
  }

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

/**
 * Generate embeddings in batches with rate limiting.
 * Processes one at a time to avoid memory issues.
 */
async function generateAndUploadChunks(
  supabase: ReturnType<typeof createClient>,
  chunks: LegalChunk[],
  delayMs: number = 300
): Promise<number> {
  let uploaded = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      // Generate embedding for this chunk
      const embedding = await generateEmbedding(chunk.content);

      // Upload immediately
      const { error } = await supabase.from('legal_chunks').insert({
        content: chunk.content,
        embedding,
        act_name: chunk.actName,
        section_number: chunk.sectionNumber,
        chapter: chunk.chapter,
        token_count: chunk.tokenCount,
      });

      if (error) {
        console.error(`    ⚠️ Failed to insert chunk ${i + 1}: ${error.message}`);
        continue;
      }

      uploaded++;
      
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        console.log(`    Progress: ${i + 1}/${chunks.length} chunks processed, ${uploaded} uploaded`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    ⚠️ Error on chunk ${i + 1}: ${msg}`);
      // Wait longer on error (likely rate limit)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return uploaded;
}

// --- Main ---

async function main() {
  console.log('=== AI Vakeel Legal Text Ingestion ===\n');

  // Load .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
    console.log('Loaded .env.local\n');
  }

  const supabase = getSupabaseClient();

  // Find data files (only .txt for now)
  const dataFiles = fs.readdirSync(DATA_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.txt';
  });

  if (dataFiles.length === 0) {
    console.error('No PDF or TXT files found in /data/ folder.');
    console.error('Please download the legal texts and place them there.');
    console.error('See data/README.md for instructions.');
    process.exit(1);
  }

  console.log(`Found ${dataFiles.length} file(s) to process:\n`);
  dataFiles.forEach((f) => console.log(`  - ${f}`));
  console.log('');

  let totalChunks = 0;

  for (const file of dataFiles) {
    const filePath = path.join(DATA_DIR, file);
    const baseName = path.basename(file, path.extname(file));
    const metadata = FILE_METADATA[baseName];

    if (!metadata) {
      console.log(`⚠️  Skipping ${file} — no metadata mapping found.`);
      console.log(`   Expected file names: ${Object.keys(FILE_METADATA).join(', ')}`);
      continue;
    }

    console.log(`\n📄 Processing: ${file}`);
    console.log(`   Act: ${metadata.actName}`);

    // Step 1: Extract text
    const text = await extractText(filePath);
    console.log(`   Extracted ${text.length} characters`);

    // Step 2: Chunk text
    console.log(`   Chunking text...`);
    const chunks = chunkText(text, metadata.actName, metadata.defaultChapter);
    console.log(`   Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings and upload one at a time
    console.log(`   Generating embeddings and uploading...`);
    const uploaded = await generateAndUploadChunks(supabase, chunks);

    totalChunks += uploaded;
    console.log(`   ✅ Done! ${uploaded} chunks uploaded.`);
  }

  console.log(`\n=== Ingestion Complete ===`);
  console.log(`Total chunks uploaded: ${totalChunks}`);
  console.log(`\nYour Knowledge Base is ready for the Shodhak agent!`);
}

main().catch((err) => {
  console.error('\n❌ Ingestion failed:', err.message);
  process.exit(1);
});
