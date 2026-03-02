import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AVANIKA_ID = '0e86b38e-9f4a-437d-9446-3fd055b5a3d6';

async function main() {
  console.log('Loading onboarding data...');
  
  const { data } = await supabase
    .from('user_taste_embeddings')
    .select('onboarding_data')
    .eq('user_id', AVANIKA_ID)
    .single();
  
  if (!data?.onboarding_data) {
    console.log('No onboarding data found');
    return;
  }
  
  console.log('Artists:', data.onboarding_data.likedArtists);
  
  // Import the embedding function
  const { updateUserCoreFromOnboarding } = await import('../src/lib/embeddings/user-embeddings');
  
  console.log('\nRegenerating embedding...');
  try {
    const result = await updateUserCoreFromOnboarding(AVANIKA_ID, data.onboarding_data);
    console.log('✅ Done! Embedding generated:', !!result.coreEmbedding);
    if (result.coreEmbedding) {
      console.log('Embedding dimensions:', result.coreEmbedding.length);
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();
