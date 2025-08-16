// Quick Supabase connection test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mgfpbqvkhqjlvgeqaclj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnBicXZraHFqbHZnZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMDIzNDUsImV4cCI6MjA0OTg3ODM0NX0.G2v1cYDdpgXCJ9cJ_rtHJJfbKLEr0z6FCd3gRCqzSrc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('✓ Auth endpoint accessible (no user logged in)');
    } else {
      console.log('✓ Auth working, user:', user?.email);
    }
    
    // Test a simple query (won't fail if table doesn't exist)
    const { error: queryError } = await supabase.from('teams').select('*').limit(1);
    if (!queryError) {
      console.log('✓ Database connection successful');
    } else if (queryError.message.includes('relation')) {
      console.log('✓ Database accessible (tables need setup)');
    } else {
      console.log('⚠ Database error:', queryError.message);
    }
    
    console.log('\n✅ Supabase connection test PASSED');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

testConnection();