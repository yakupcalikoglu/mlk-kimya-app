import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { data, error } = await supabase.from('mlk_sermaye_iadeler').select('*').order('tarih', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// kasa_etki=true ise mlk_kasa'ya ÇIKIŞ satırı otomatik eklenir.
export async function POST(req: NextRequest) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.ortak_id || !body.tutar) return NextResponse.json({ error: 'Ortak ve tutar zorunludur' }, { status: 400 })

  const { data: ortak } = await supabase.from('mlk_sermaye_ortaklar').select('ad').eq('id', body.ortak_id).single()

  let kasaGiderId: number | null = null
  if (body.kasa_etki) {
    const { data: kasaRow, error: kasaErr } = await supabase.from('mlk_kasa').insert({
      yon: 'cikis',
      tarih: body.tarih,
      ad: `Sermaye İadesi — ${ortak?.ad || ''}${body.aciklama ? ' — ' + body.aciklama : ''}`,
      tutar: body.tutar,
      cari_ref: null,
    }).select('id').single()
    if (kasaErr) return NextResponse.json({ error: `Kasa çıkışı eklenemedi: ${kasaErr.message}` }, { status: 500 })
    kasaGiderId = kasaRow.id
  }

  const { data, error } = await supabase.from('mlk_sermaye_iadeler').insert({
    ortak_id: body.ortak_id,
    ortak_ad: ortak?.ad || '',
    tarih: body.tarih,
    tur: body.tur,
    tutar: body.tutar,
    aciklama: body.aciklama || null,
    kasa_etki: !!body.kasa_etki,
    kasa_gider_id: kasaGiderId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
