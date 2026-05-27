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

async function main() {
  // Get all completed sessions
  const { data, error } = await supabase
    .from('sessions')
    .select('id, problem_description, agent_outputs')
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Total completed sessions:', data.length);

  // Pick the best 4 (one from each domain, longest document)
  const byDomain = {};
  for (const session of data) {
    const domain = session.agent_outputs?.vivechak?.legalDomain || 'unknown';
    const doc = session.agent_outputs?.nyayadoot?.finalDocument || session.agent_outputs?.munshi?.complaintDocument;
    
    if (!doc || doc.length < 500) continue;
    
    if (!byDomain[domain] || doc.length > byDomain[domain].document.length) {
      byDomain[domain] = {
        id: session.id,
        domain,
        problem: session.problem_description,
        document: doc,
        forum: session.agent_outputs?.vivechak?.forum || '',
      };
    }
  }

  const results = Object.values(byDomain);
  console.log('\nBest examples by domain:');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.domain} | ${r.document.length} chars | ${r.problem.substring(0, 60)}...`);
  });

  // Save to JSON
  fs.writeFileSync('lib/example-complaints-real.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to lib/example-complaints-real.json');
}

main().catch(e => console.error(e.message));
