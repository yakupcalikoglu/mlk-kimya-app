import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { data, error } = await supabase.from('mlk_faturalar').select('*').order('tarih', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.musteri_ad || !body.kalemler?.length) {
    return NextResponse.json({ error: 'Müşteri ve en az bir kalem zorunludur' }, { status: 400 })
  }
  const { data, error } = await supabase.from('mlk_faturalar').insert({
    fatura_no: body.fatura_no,
    tarih: body.tarih,
    cari_id: body.cari_id || null,
    musteri_ad: body.musteri_ad,
    musteri_adres: body.musteri_adres || null,
    musteri_vergi_no: body.musteri_vergi_no || null,
    kalemler: body.kalemler,
    ara_toplam: body.ara_toplam || 0,
    kdv_toplam: body.kdv_toplam || 0,
    genel_toplam: body.genel_toplam || 0,
    notlar: body.notlar || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
