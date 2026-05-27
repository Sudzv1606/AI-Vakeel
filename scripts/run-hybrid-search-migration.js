const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  if (l && !l.startsWith('#')) {
    const [k, ...v] = l.split('=');
    vars[k] = v.join('=');
  }
});

// Use the Supabase Management API to run SQL directly
async function runSQL() {
  const projectRef = 'gpsymwstenrdfbjxuuhb';
  
  // Get access token from supabase CLI config
  const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

  // Test if fts column already exists
  const { data: testData, error: testError } = await supabase
    .from('legal_chunks')
    .select('id')
    .limit(1);

  if (testError) {
    console.log('Error accessing legal_chunks:', testError.message);
    return;
  }

  console.log('legal_chunks accessible. Attempting to add fts column via RPC...');

  // Try running the hybrid search function creation via a workaround
  // Since we can't run DDL via the client, let's check if we can use the SQL editor approach
  
  // Actually, let's just test if the hybrid_search function already exists
  const { data: hybridData, error: hybridError } = await supabase.rpc('hybrid_search_legal_chunks', {
    query_embedding: new Array(1536).fill(0.1),
    query_text: 'test',
    match_threshold: 0.1,
    match_count: 1,
    filter_act_name: null,
    vector_weight: 0.7,
    keyword_weight: 0.3,
  });

  if (hybridError) {
    console.log('hybrid_search_legal_chunks does not exist yet:', hybridError.message);
    console.log('\nYou need to run this SQL in the Supabase Dashboard SQL Editor:');
    console.log('Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('\n--- Copy and paste this SQL ---\n');
    console.log(fs.readFileSync('supabase/migrations/003_hybrid_search.sql', 'utf8'));
  } else {
    console.log('hybrid_search_legal_chunks already exists! Results:', hybridData?.length || 0);
  }
}

runSQL().catch(e => console.error(e.message));
