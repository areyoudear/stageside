const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Exact functions from codebase
function normalizeArtistName(name) {
  return name.toLowerCase().replace(/^the\s+/i, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function isSameArtist(name1, name2) {
  const norm1 = normalizeArtistName(name1);
  const norm2 = normalizeArtistName(name2);
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  return false;
}

function findOverlapArtists(members) {
  if (members.length < 2) return [];
  const artistCounts = new Map();
  const normalizedToOriginal = new Map();

  for (const member of members) {
    const seenArtists = new Set();
    for (const artist of member.topArtists) {
      const normalized = normalizeArtistName(artist);
      let matchedKey = null;
      for (const key of artistCounts.keys()) {
        if (isSameArtist(artist, normalizedToOriginal.get(key) || key)) {
          matchedKey = key;
          break;
        }
      }
      const key = matchedKey || normalized;
      if (!normalizedToOriginal.has(key)) {
        normalizedToOriginal.set(key, artist);
      }
      if (!seenArtists.has(key)) {
        seenArtists.add(key);
        artistCounts.set(key, (artistCounts.get(key) || 0) + 1);
      }
    }
  }

  return Array.from(artistCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => normalizedToOriginal.get(key) || key);
}

function findOverlapGenres(members) {
  if (members.length < 2) return [];
  const genreCounts = new Map();
  for (const member of members) {
    const seenGenres = new Set();
    for (const genre of member.topGenres || []) {
      const normalized = genre.toLowerCase();
      if (!seenGenres.has(normalized)) {
        seenGenres.add(normalized);
        genreCounts.set(normalized, (genreCounts.get(normalized) || 0) + 1);
      }
    }
  }
  return Array.from(genreCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([genre]) => genre);
}

async function getMusicProfile(userId) {
  const { data } = await supabase.from("music_profiles").select("*").eq("user_id", userId).single();
  return data;
}

async function calculateTasteOverlap(userId, friendId) {
  const userProfile = await getMusicProfile(userId);
  const friendProfile = await getMusicProfile(friendId);

  if (!userProfile || !friendProfile) {
    console.log("Missing profile:", { user: !!userProfile, friend: !!friendProfile });
    return null;
  }

  const userMember = {
    userId,
    topArtists: (userProfile.top_artists || []).map(a => a.name),
    topGenres: userProfile.top_genres || [],
  };

  const friendMember = {
    userId: friendId,
    topArtists: (friendProfile.top_artists || []).map(a => a.name),
    topGenres: friendProfile.top_genres || [],
  };

  const members = [userMember, friendMember];
  const sharedArtists = findOverlapArtists(members);
  const sharedGenres = findOverlapGenres(members);

  // Calculate total unique artists
  const allArtists = new Set();
  const normalizedSeen = new Map();

  for (const artist of [...userMember.topArtists, ...friendMember.topArtists]) {
    const normalized = normalizeArtistName(artist);
    let isNew = true;
    for (const [, original] of normalizedSeen.entries()) {
      if (isSameArtist(artist, original)) {
        isNew = false;
        break;
      }
    }
    if (isNew) {
      normalizedSeen.set(normalized, artist);
      allArtists.add(artist);
    }
  }

  const totalUniqueArtists = allArtists.size;
  const overlapPercentage = totalUniqueArtists > 0 ? Math.round((sharedArtists.length / totalUniqueArtists) * 100) : 0;

  return {
    sharedArtists,
    sharedGenres,
    overlapPercentage,
    totalUniqueArtists,
    userArtistCount: userMember.topArtists.length,
    friendArtistCount: friendMember.topArtists.length,
  };
}

async function debug() {
  const rudrId = '57a29006-92a4-43b6-93fb-f05e47cb5eb5';
  const avanikaId = '0e86b38e-9f4a-437d-9446-3fd055b5a3d6';
  
  console.log("=== CALCULATING TASTE OVERLAP ===\n");
  const overlap = await calculateTasteOverlap(rudrId, avanikaId);
  
  console.log("Result:", JSON.stringify(overlap, null, 2));
}

debug().catch(console.error);
