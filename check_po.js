const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('purchase_orders').select('id, purchase_order_no, country_id, payment_status, created_at, deleted_at').order('created_at', { ascending: false }).limit(5);
  console.log('Purchase Orders:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

check();
