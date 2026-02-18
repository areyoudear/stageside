import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwiqijnhkjqxcijuajoq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aXFpam5oa2pxeGNpanVham9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg3NDk5MCwiZXhwIjoyMDg2NDUwOTkwfQ.vzigGV1pypa5C_02jK-NobcQIrU3YcLzoXhbkeX8Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name, spotify_id, auth_provider');
  
  console.log('Users and their IDs:');
  users?.forEach(u => {
    console.log(`  ${u.display_name || u.email}:`);
    console.log(`    - DB ID: ${u.id}`);
    console.log(`    - Spotify ID: ${u.spotify_id || 'NULL'}`);
    console.log(`    - Auth provider: ${u.auth_provider || 'not set'}`);
  });
}

checkUsers();
