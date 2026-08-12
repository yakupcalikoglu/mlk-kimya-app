import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/sermaye/odemeler
export async function GET(req: NextRequest) {
  const { supabase, res } = createClient(req);

  const { data, error } = await supabase
    .from('mlk_sermaye_odemeler')
    .select('*')
    .order('tarih', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: res.headers });
}

// POST /api/sermaye/odemeler — yeni ödeme ekle
// body: { ortak_id, tarih, tutar, tur, durum, aciklama, hedef, hedef_aciklama }
//
// ÖNEMLİ: Sermaye ödemesi "hedef=kasaya" VE "durum=odendi" ise otomatik
// olarak mlk_kasa tablosuna bir GELİR satırı eklenir (eski HTML'deki
// sermayeOdemeKaydet() mantığının birebir karşılığı).
//
// NOT: mlk_kasa tablonuzun gerçek kolonlarını bilmediğim için burada
// { tarih, ad, tutar, tip:'gelir' } şeklinde bir kayıt varsayıyorum.
// Gerçek kolon adlarınız farklıysa (örn. "aciklama" değil "not" ise)
// aşağıdaki `kasaInsertPayload` objesini güncellemeniz yeterli.
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

  let kasaHarId: number | null = null;

  if (body.hedef === 'kasaya' && (body.durum ?? 'odendi') === 'odendi') {
    const kasaInsertPayload = {
      tarih: body.tarih,
      ad: `${ortak?.ad || 'Ortak'} SERMAYE — ${body.hedef_aciklama || body.aciklama || 'Kasaya yatırıldı'}`,
      tutar: body.tutar,
      tip: 'gelir', // ⚠️ mlk_kasa'daki gerçek kolon adına göre düzenleyin
    };

    const { data: kasaRow, error: kasaErr } = await supabase
      .from('mlk_kasa')
      .insert(kasaInsertPayload)
      .select('id')
      .single();

    if (kasaErr) {
      return NextResponse.json(
        { error: `Kasa girişi eklenemedi: ${kasaErr.message}` },
        { status: 500 }
      );
    }
    kasaHarId = kasaRow.id;
  }

  const { data, error } = await supabase
    .from('mlk_sermaye_odemeler')
    .insert({
      ortak_id: body.ortak_id,
      ortak_ad: ortak?.ad || '',
      tarih: body.tarih,
      tutar: body.tutar,
      tur: body.tur || 'nakit',
      durum: body.durum || 'odendi',
      aciklama: body.aciklama || null,
      hedef: body.hedef || null,
      hedef_aciklama: body.hedef_aciklama || null,
      kasa_har_id: kasaHarId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201, headers: res.headers });
}
