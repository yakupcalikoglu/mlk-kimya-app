import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()

  const { data: eski } = await supabase.from('mlk_sermaye_odemeler').select('kasa_har_id').eq('id', params.id).single()
  if (eski?.kasa_har_id) await supabase.from('mlk_kasa').delete().eq('id', eski.kasa_har_id)

  const { data: ortak } = await supabase.from('mlk_sermaye_ortaklar').select('ad').eq('id', body.ortak_id).single()

  let kasaHarId: number | null = null
  if (body.hedef === 'kasaya' && (body.durum ?? 'odendi') === 'odendi') {
    const { data: kasaRow, error: kasaErr } = await supabase.from('mlk_kasa').insert({
      yon: 'giris',
      tarih: body.tarih,
      ad: `${ortak?.ad || 'Ortak'} SERMAYE — ${body.hedef_aciklama || body.aciklama || 'Kasaya yatırıldı'}`,
      tutar: body.tutar,
      cari_ref: null,
    }).select('id').single()
    if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })
    kasaHarId = kasaRow.id
  }

  const { data, error } = await supabase.from('mlk_sermaye_odemeler').update({
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
  }).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Hızlı aksiyon: "Ödendi" işaretle
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const { data, error } = await supabase.from('mlk_sermaye_odemeler').update({ durum: 'odendi' }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { data: obj } = await supabase.from('mlk_sermaye_odemeler').select('kasa_har_id').eq('id', params.id).single()
  if (obj?.kasa_har_id) await supabase.from('mlk_kasa').delete().eq('id', obj.kasa_har_id)

  const { error } = await supabase.from('mlk_sermaye_odemeler').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, kasaGuncellendi: !!obj?.kasa_har_id })
}
