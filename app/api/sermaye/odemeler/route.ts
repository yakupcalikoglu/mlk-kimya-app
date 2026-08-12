import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { data, error } = await supabase.from('mlk_sermaye_odemeler').select('*').order('tarih', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// "hedef=kasaya" VE "durum=odendi" ise mlk_kasa'ya GİRİŞ satırı otomatik eklenir.
// mlk_kasa şeması: { yon: 'giris'|'cikis', tarih, ad, tutar, cari_ref }
export async function POST(req: NextRequest) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.ortak_id || !body.tutar) return NextResponse.json({ error: 'Ortak ve tutar zorunludur' }, { status: 400 })

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
    if (kasaErr) return NextResponse.json({ error: `Kasa girişi eklenemedi: ${kasaErr.message}` }, { status: 500 })
    kasaHarId = kasaRow.id
  }

  const { data, error } = await supabase.from('mlk_sermaye_odemeler').insert({
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
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
