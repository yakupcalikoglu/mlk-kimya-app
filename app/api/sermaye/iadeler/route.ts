import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sermaye/iadeler
export async function GET(req: NextRequest) {
  const { supabase, res } = createClient(req);

  const { data, error } = await supabase
    .from('mlk_sermaye_iadeler')
    .select('*')
    .order('tarih', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: res.headers });
}

// POST /api/sermaye/iadeler — yeni iade/mahsup ekle
// body: { ortak_id, tarih, tur, tutar, aciklama, kasa_etki }
// kasa_etki=true ise mlk_kasa'ya GİDER satırı otomatik eklenir.
export async function POST(req: NextRequest) {
  const { supabase, res } = createClient(req);
  const body = await req.json();

  if (!body.ortak_id || !body.tutar) {
    return NextResponse.json({ error: 'Ortak ve tutar zorunludur' }, { status: 400 });
  }

  const { data: ortak } = await supabase
    .from('mlk_sermaye_ortaklar')
    .select('ad')
    .eq('id', body.ortak_id)
    .single();

  let kasaGiderId: number | null = null;

  if (body.kasa_etki) {
    const { data: kasaRow, error: kasaErr } = await supabase
      .from('mlk_kasa')
      .insert({
        tarih: body.tarih,
        ad: `Sermaye İadesi — ${ortak?.ad || ''}${body.aciklama ? ' — ' + body.aciklama : ''}`,
        tutar: body.tutar,
        tip: 'gider', // ⚠️ mlk_kasa'daki gerçek kolon adına göre düzenleyin
      })
      .select('id')
      .single();

    if (kasaErr) {
      return NextResponse.json(
        { error: `Kasa çıkışı eklenemedi: ${kasaErr.message}` },
        { status: 500 }
      );
    }
    kasaGiderId = kasaRow.id;
  }

  const { data, error } = await supabase
    .from('mlk_sermaye_iadeler')
    .insert({
      ortak_id: body.ortak_id,
      ortak_ad: ortak?.ad || '',
      tarih: body.tarih,
      tur: body.tur,
      tutar: body.tutar,
      aciklama: body.aciklama || null,
      kasa_etki: !!body.kasa_etki,
      kasa_gider_id: kasaGiderId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201, headers: res.headers });
}
