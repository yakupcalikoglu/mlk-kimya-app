import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

async function yenidenHesapla(hammaddeId: number) {
  const [{ data: alimlar }, { data: cikislar }] = await Promise.all([
    supabase.from('mlk_hammadde_alimlar').select('miktar,tutar').eq('hammadde_id', hammaddeId),
    supabase.from('mlk_hammadde_cikislar').select('miktar').eq('hammadde_id', hammaddeId),
  ])
  const toplamAlinan = (alimlar || []).reduce((a, x) => a + Number(x.miktar || 0), 0)
  const toplamTutar = (alimlar || []).reduce((a, x) => a + Number(x.tutar || 0), 0)
  const toplamCikan = (cikislar || []).reduce((a, x) => a + Number(x.miktar || 0), 0)
  const guncelStok = toplamAlinan - toplamCikan
  const ortFiyat = toplamAlinan > 0 ? toplamTutar / toplamAlinan : 0
  await supabase.from('mlk_hammadde').update({ guncel_stok: guncelStok, birim_fiyat: ortFiyat }).eq('id', hammaddeId)
}

export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { data, error } = await supabase.from('mlk_hammadde_cikislar').select('*').order('tarih', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.hammadde_id || !body.miktar) return NextResponse.json({ error: 'Hammadde ve miktar zorunludur' }, { status: 400 })

  const { data, error } = await supabase.from('mlk_hammadde_cikislar').insert({
    hammadde_id: body.hammadde_id,
    tarih: body.tarih,
    miktar: body.miktar,
    neden: body.neden || null,
    not_metin: body.not_metin || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await yenidenHesapla(body.hammadde_id)
  return NextResponse.json(data)
}
