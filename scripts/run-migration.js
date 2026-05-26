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

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Check if profiles table exists
  const { data: tables } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (tables !== null) {
    console.log('Profiles table already exists');
  } else {
    console.log('Profiles table does not exist - needs to be created via Supabase Dashboard SQL editor');
  }

  // Check if sessions has user_id
  const { data: sessions } = await supabase
    .from('sessions')
    .select('user_id')
    .limit(1);

  if (sessions !== null) {
    console.log('sessions.user_id column exists');
  } else {
    console.log('sessions.user_id needs to be added');
  }

  // Try to insert a profile for existing user
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users && users.users.length > 0) {
    for (const user of users.users) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, first_name: null, last_name: null }, { onConflict: 'id' });
      if (error) {
        console.log('Profile upsert error for', user.email, ':', error.message);
      } else {
        console.log('Profile ensured for', user.email);
      }
    }
  }
}

run().catch(e => console.error(e.message));
