import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sermaye/ortaklar — tüm ortakları listele
export async function GET(req: NextRequest) {
  const { supabase, res } = createClient(req);

  const { data, error } = await supabase
    .from('mlk_sermaye_ortaklar')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { headers: res.headers });
}

// POST /api/sermaye/ortaklar — yeni ortak ekle
// body: { ad: string, pay?: number, hedef?: number|null, tc_no?: string, notlar?: string }
export async function POST(req: NextRequest) {
  const { supabase, res } = createClient(req);
  const body = await req.json();

  if (!body.ad || !body.ad.trim()) {
    return NextResponse.json({ error: 'Ortak adı zorunludur' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mlk_sermaye_ortaklar')
    .insert({
      ad: body.ad.trim(),
      pay: body.pay ?? 0,
      hedef: body.hedef ?? null,
      tc_no: body.tc_no ?? null,
      notlar: body.notlar ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201, headers: res.headers });
}
