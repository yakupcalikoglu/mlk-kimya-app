import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/sermaye/ortaklar/[id] — ortak güncelle
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, res } = createClient(req);
  const body = await req.json();

  if (!body.ad || !body.ad.trim()) {
    return NextResponse.json({ error: 'Ortak adı zorunludur' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mlk_sermaye_ortaklar')
    .update({
      ad: body.ad.trim(),
      pay: body.pay ?? 0,
      hedef: body.hedef ?? null,
      tc_no: body.tc_no ?? null,
      notlar: body.notlar ?? null,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { headers: res.headers });
}

// DELETE /api/sermaye/ortaklar/[id] — ortağı ve TÜM ödeme/iade kayıtlarını sil
// (mlk_sermaye_odemeler ve mlk_sermaye_iadeler tabloları "on delete cascade"
// ile bağlı olduğu için ortak silinince otomatik silinir — ama kasaya
// yansımış kayıtları önce temizlememiz gerekiyor, yoksa mlk_kasa'da
// "yetim" satırlar kalır.)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, res } = createClient(req);
  const ortakId = params.id;

  // Bu ortağa ait, kasaya yansımış ödeme kayıtlarının kasa satırlarını sil
  const { data: odemeler } = await supabase
    .from('mlk_sermaye_odemeler')
    .select('kasa_har_id')
    .eq('ortak_id', ortakId)
    .not('kasa_har_id', 'is', null);

  const kasaHarIds = (odemeler || []).map((o) => o.kasa_har_id).filter(Boolean);
  if (kasaHarIds.length) {
    await supabase.from('mlk_kasa').delete().in('id', kasaHarIds);
  }

  // Bu ortağa ait, kasaya yansımış iade kayıtlarının kasa satırlarını sil
  const { data: iadeler } = await supabase
    .from('mlk_sermaye_iadeler')
    .select('kasa_gider_id')
    .eq('ortak_id', ortakId)
    .not('kasa_gider_id', 'is', null);

  const kasaGiderIds = (iadeler || []).map((i) => i.kasa_gider_id).filter(Boolean);
  if (kasaGiderIds.length) {
    await supabase.from('mlk_kasa').delete().in('id', kasaGiderIds);
  }

  const { error } = await supabase.from('mlk_sermaye_ortaklar').delete().eq('id', ortakId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: res.headers });
}
