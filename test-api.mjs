import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwiqijnhkjqxcijuajoq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aXFpam5oa2pxeGNpanVham9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg3NDk5MCwiZXhwIjoyMDg2NDUwOTkwfQ.vzigGV1pypa5C_02jK-NobcQIrU3YcLzoXhbkeX8Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the exact flow the API uses
async function testFullFlow() {
  const userId = '81000fea-4268-49f9-a6c4-cb60a63ba36f'; // Rudr's ID
  const query = 'alfred';
  
  console.log('=== Testing Friend Request Flow ===');
  console.log('User ID:', userId);
  console.log('Search query:', query);
  
  // Step 1: Search for user
  console.log('\n1. Searching for user...');
  const searchTerm = query.trim();
  
  let targetUser = null;
  
  // Try username
  const { data: byUsername } = await supabase
    .from("users")
    .select("id, display_name, username, email")
    .ilike("username", searchTerm)
    .neq("id", userId)
    .maybeSingle();
  
  if (byUsername) {
    console.log('   Found by username:', byUsername.display_name);
    targetUser = byUsername;
  } else {
    // Try name
    const { data: byName } = await supabase
      .from("users")
      .select("id, display_name, username, email")
      .ilike("display_name", `%${searchTerm}%`)
      .neq("id", userId)
      .limit(1);
    
    if (byName && byName.length > 0) {
      console.log('   Found by name:', byName[0].display_name);
      targetUser = byName[0];
    }
  }
  
  if (!targetUser) {
    console.log('   ERROR: User not found');
    return;
  }
  
  // Step 2: Check existing friendship
  console.log('\n2. Checking existing friendships...');
  
  const { data: sentToTarget } = await supabase
    .from("friendships")
    .select("id, status")
    .eq("requester_id", userId)
    .eq("addressee_id", targetUser.id)
    .maybeSingle();

  const { data: receivedFromTarget } = await supabase
    .from("friendships")
    .select("id, status")
    .eq("requester_id", targetUser.id)
    .eq("addressee_id", userId)
    .maybeSingle();
  
  console.log('   Sent to target:', sentToTarget);
  console.log('   Received from target:', receivedFromTarget);
  
  if (sentToTarget || receivedFromTarget) {
    console.log('   Existing friendship found - skipping creation');
    return;
  }
  
  // Step 3: Create friendship
  console.log('\n3. Creating friendship...');
  const { data: friendship, error: createError } = await supabase
    .from("friendships")
    .insert({
      requester_id: userId,
      addressee_id: targetUser.id,
      status: "pending",
    })
    .select()
    .single();
  
  if (createError) {
    console.log('   ERROR:', createError.message);
    console.log('   Code:', createError.code);
    console.log('   Details:', createError.details);
  } else {
    console.log('   SUCCESS! Created:', friendship);
    
    // Clean up
    await supabase.from('friendships').delete().eq('id', friendship.id);
    console.log('   (Cleaned up test data)');
  }
}

testFullFlow().catch(console.error);
