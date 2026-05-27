const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  if (l && !l.startsWith('#')) {
    const [k, ...v] = l.split('=');
    vars[k] = v.join('=');
  }
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const r = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + vars.OPENROUTER_API_KEY,
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: 'complaint filing procedure admission District Commission consumer',
    }),
  });
  const d = await r.json();
  const emb = d.data[0].embedding;

  // Test with keyword that should match: "complaint" "District" "Commission" "admission"
  const { data, error } = await supabase.rpc('hybrid_search_legal_chunks', {
    query_embedding: emb,
    query_text: 'complaint admission District Commission procedure filing',
    match_threshold: 0.15,
    match_count: 5,
    filter_act_name: 'Consumer Protection Act 2019',
    vector_weight: 0.7,
    keyword_weight: 0.3,
  });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Hybrid search (legal terms query):');
  data.forEach((r, i) => {
    console.log(
      (i + 1) + '.',
      r.section_number.padEnd(20),
      '| hybrid:', (r.hybrid_score || 0).toFixed(4),
      '| vector:', (r.similarity || 0).toFixed(4),
      '| keyword:', (r.keyword_rank || 0).toFixed(4),
      '| content:', r.content.substring(0, 60)
    );
  });
}

test().catch(e => console.error(e.message));
