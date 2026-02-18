import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwiqijnhkjqxcijuajoq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aXFpam5oa2pxeGNpanVham9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg3NDk5MCwiZXhwIjoyMDg2NDUwOTkwfQ.vzigGV1pypa5C_02jK-NobcQIrU3YcLzoXhbkeX8Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
  const testQueries = ['alfred', 'alfredtest', 'Alfred Test', 'test@', 'rudr'];
  
  for (const query of testQueries) {
    console.log(`\nSearching for: "${query}"`);
    
    const searchTerm = query.trim().toLowerCase();
    
    // Try exact username match
    const { data: byUsername, error: e1 } = await supabase
      .from('users')
      .select('id, display_name, username, email')
      .ilike('username', searchTerm)
      .single();
    
    if (byUsername) {
      console.log('  Found by username:', byUsername.display_name);
      continue;
    }
    
    // Try exact email match
    const { data: byEmail, error: e2 } = await supabase
      .from('users')
      .select('id, display_name, username, email')
      .ilike('email', searchTerm)
      .single();
    
    if (byEmail) {
      console.log('  Found by email:', byEmail.display_name);
      continue;
    }
    
    // Try display name partial match
    const { data: byName, error: e3 } = await supabase
      .from('users')
      .select('id, display_name, username, email')
      .ilike('display_name', `%${searchTerm}%`)
      .limit(1);
    
    if (byName && byName.length > 0) {
      console.log('  Found by name:', byName[0].display_name);
      continue;
    }
    
    console.log('  NOT FOUND');
  }
}

testSearch().catch(console.error);
