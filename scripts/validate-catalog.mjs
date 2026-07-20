import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key || url.includes('placeholder')) {
  console.error('FAIL_KEYS_MISSING');
  process.exit(1);
}

const supabase = createClient(url, key);

let results = { tables: {}, security: {}, storage: {} };

async function validateTable(tableName) {
  try {
    const start = performance.now();
    const { error } = await supabase.from(tableName).select('*').limit(1);
    const ms = performance.now() - start;
    
    if (error) {
      results.tables[tableName] = { status: 'ERROR', message: error.message };
    } else {
      results.tables[tableName] = { status: 'OK', ms: Math.round(ms) };
    }

    // Test Security (RLS) - Anon user should NOT be able to insert
    const insertRes = await supabase.from(tableName).insert({ id: '00000000-0000-0000-0000-000000000000' });
    if (insertRes.error && insertRes.error.code === '42501') {
      results.security[tableName] = 'PASS (RLS blocked insert)';
    } else if (!insertRes.error) {
      results.security[tableName] = 'FAIL (RLS allowed anon insert)';
    } else {
      results.security[tableName] = `FAIL (Unexpected error: ${insertRes.error.message})`;
    }
  } catch (err) {
    results.tables[tableName] = { status: 'UNEXPECTED_ERROR', message: err.message };
  }
}

async function runValidations() {
  await validateTable('products');
  await validateTable('categories');
  await validateTable('collections');
  await validateTable('brands');
  await validateTable('materials');
  await validateTable('product_variants');
  
  try {
    const { error } = await supabase.storage.getBucket('product-media');
    if (error) {
      results.storage['product-media'] = { status: 'ERROR', message: error.message };
    } else {
      results.storage['product-media'] = { status: 'OK' };
    }
  } catch (err) {
    results.storage['product-media'] = { status: 'ERROR', message: err.message };
  }
  
  console.log(JSON.stringify(results, null, 2));
}

runValidations();
