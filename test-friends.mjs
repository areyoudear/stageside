import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwiqijnhkjqxcijuajoq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aXFpam5oa2pxeGNpanVham9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg3NDk5MCwiZXhwIjoyMDg2NDUwOTkwfQ.vzigGV1pypa5C_02jK-NobcQIrU3YcLzoXhbkeX8Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFriendRequest() {
  // Get all users first
  const { data: users } = await supabase.from('users').select('id, email, display_name, username');
  console.log('Users in database:');
  users?.forEach((u, i) => console.log(`  ${i+1}. ${u.display_name} (${u.email}) - id: ${u.id}`));
  
  if (users?.length < 2) {
    console.log('\nNeed at least 2 users to test friend requests');
    return;
  }
  
  const user1 = users[0];
  const user2 = users[1];
  
  console.log(`\nTrying to create friend request from "${user1.display_name}" to "${user2.display_name}"...`);
  
  // Try to create a friendship
  const { data: friendship, error } = await supabase
    .from('friendships')
    .insert({
      requester_id: user1.id,
      addressee_id: user2.id,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.log('ERROR creating friendship:', error.message);
    console.log('Error code:', error.code);
    console.log('Error details:', error.details);
    console.log('Error hint:', error.hint);
  } else {
    console.log('SUCCESS! Friendship created:', friendship);
    
    // Clean up - delete the test friendship
    await supabase.from('friendships').delete().eq('id', friendship.id);
    console.log('(Cleaned up test data)');
  }
}

testFriendRequest().catch(console.error);
