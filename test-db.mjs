import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwiqijnhkjqxcijuajoq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aXFpam5oa2pxeGNpanVham9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg3NDk5MCwiZXhwIjoyMDg2NDUwOTkwfQ.vzigGV1pypa5C_02jK-NobcQIrU3YcLzoXhbkeX8Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing database connection...\n');
  
  // Check if users table exists and has data
  console.log('1. Checking users table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, display_name, username')
    .limit(5);
  
  if (usersError) {
    console.log('   ERROR:', usersError.message);
  } else {
    console.log('   Found', users?.length, 'users');
    users?.forEach(u => console.log('   -', u.display_name || u.email, '| username:', u.username || 'NOT SET'));
  }
  
  // Check if friendships table exists
  console.log('\n2. Checking friendships table...');
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('*')
    .limit(5);
  
  if (friendshipsError) {
    console.log('   ERROR:', friendshipsError.message);
    console.log('   CODE:', friendshipsError.code);
    if (friendshipsError.code === '42P01') {
      console.log('   >>> TABLE DOES NOT EXIST! Need to run migration.');
    }
  } else {
    console.log('   Table exists! Found', friendships?.length, 'friendships');
  }
  
  // Check table columns
  console.log('\n3. Checking users table columns...');
  const { data: sample, error: sampleError } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();
  
  if (sample) {
    console.log('   Columns:', Object.keys(sample).join(', '));
  }
}

test().catch(console.error);
