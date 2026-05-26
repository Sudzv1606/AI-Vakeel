# Legal Text Data Files

Place your downloaded PDF files here. The ingestion script will extract text, chunk it, generate embeddings, and upload to Supabase.

## Required Files

Download these PDFs from indiacode.nic.in:

1. **Consumer Protection Act 2019**
   - URL: https://www.indiacode.nic.in/bitstream/123456789/15256/1/the_consumer_protection_act%2C_2019.pdf
   - Save as: `consumer_protection_act_2019.pdf`

2. **RERA Act 2016**
   - URL: https://www.indiacode.nic.in/bitstream/123456789/2187/1/AAA2016___16.pdf
   - Save as: `rera_act_2016.pdf`

3. **RTI Act 2005**
   - URL: https://www.indiacode.nic.in/bitstream/123456789/1130/1/200522.pdf
   - Save as: `rti_act_2005.pdf`

## Alternative: Plain Text Files

If you prefer, you can also place `.txt` files here with the same base names:
- `consumer_protection_act_2019.txt`
- `rera_act_2016.txt`
- `rti_act_2005.txt`

## Running the Ingestion

```bash
npx tsx scripts/ingest-legal-texts.ts
```

This will:
1. Read PDFs/TXT files from this folder
2. Extract text (from PDFs using pdf-parse)
3. Split into 200-1000 token chunks with 50-token overlap
4. Generate embeddings via OpenRouter API
5. Upload to Supabase `legal_chunks` table
