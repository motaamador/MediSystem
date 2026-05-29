const fs = require('fs');

// Parse .env.local manually
let supabaseUrl, supabaseServiceKey;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = val;
    }
  }
} catch (e) {
  console.error("Could not read .env.local", e);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables", { supabaseUrl, supabaseServiceKey });
  process.exit(1);
}

async function test() {
  console.log("Connecting via REST to:", supabaseUrl);
  
  // Test profiles
  const profilesRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*&limit=1`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  if (!profilesRes.ok) {
    console.error("Error reading profiles:", await profilesRes.text());
  } else {
    console.log("Profiles connection OK. Sample:", await profilesRes.json());
  }

  // Test shifts
  const shiftsRes = await fetch(`${supabaseUrl}/rest/v1/shifts?select=*&limit=1`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  if (!shiftsRes.ok) {
    const text = await shiftsRes.text();
    console.log("Shifts table does not exist or has error:", text);
  } else {
    console.log("Shifts table exists! Sample:", await shiftsRes.json());
  }
}

test();
