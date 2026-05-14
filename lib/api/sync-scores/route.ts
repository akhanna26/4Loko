export const dynamic = 'force-dynamic';

export async function GET() {
  const url = `${process.env.SUPABASE_URL}/functions/v1/sync-pga-scores`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
  });
  const data = await res.json();
  return Response.json(data);
}
