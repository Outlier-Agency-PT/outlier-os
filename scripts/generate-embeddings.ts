import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const missing = [
  !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
  !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  !openaiApiKey && 'OPENAI_API_KEY',
].filter(Boolean);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, serviceRoleKey!);
const openai = new OpenAI({ apiKey: openaiApiKey! });

const force = process.argv.includes('--force');

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (err: any) {
    if (err?.status === 429) {
      await new Promise((r) => setTimeout(r, 10_000));
      const retry = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return retry.data[0].embedding;
    }
    throw err;
  }
}

async function main() {
  let query = supabase
    .from('processes')
    .select('id, title, subcategory, content_md')
    .eq('published', true);

  if (!force) {
    query = query.is('embedding', null);
  }

  const { data: processes, error } = await query;

  if (error) {
    console.error('Failed to fetch processes:', error.message);
    process.exit(1);
  }

  const total = processes?.length ?? 0;
  console.log(`Found ${total} processes to index.`);

  if (total === 0) return;

  let succeeded = 0;
  let failed = 0;
  const batchSize = 5;

  for (let i = 0; i < processes!.length; i += batchSize) {
    const batch = processes!.slice(i, i + batchSize);

    for (const proc of batch) {
      const idx = i + batch.indexOf(proc) + 1;
      const rawText = `${proc.title}\n${proc.subcategory ?? ''}\n${proc.content_md ?? ''}`;
      const inputText = rawText.slice(0, 8000);

      try {
        const embedding = await generateEmbedding(inputText);

        const { error: updateError } = await supabase
          .from('processes')
          .update({ embedding })
          .eq('id', proc.id);

        if (updateError) throw new Error(updateError.message);

        console.log(`✓ ${idx}/${total}: ${proc.title}`);
        succeeded++;
      } catch (err: any) {
        console.log(`✗ ${idx}/${total}: ${proc.title} — ${err?.message ?? err}`);
        failed++;
      }
    }

    if (i + batchSize < processes!.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
}

main();
