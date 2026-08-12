import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.ad || !body.ad.trim()) return NextResponse.json({ error: 'Ortak adı zorunludur' }, { status: 400 })
  const { data, error } = await supabase.from('mlk_sermaye_ortaklar').update({
    ad: body.ad.trim(),
    pay: body.pay ?? 0,
    hedef: body.hedef ?? null,
    tc_no: body.tc_no ?? null,
    notlar: body.notlar ?? null,
  }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Ortağı sil — kasaya yansımış ödeme/iade kayıtları varsa mlk_kasa'dan da temizle
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const ortakId = params.id

  const { data: odemeler } = await supabase.from('mlk_sermaye_odemeler').select('kasa_har_id').eq('ortak_id', ortakId).not('kasa_har_id', 'is', null)
  const kasaHarIds = (odemeler || []).map(o => o.kasa_har_id).filter(Boolean)
  if (kasaHarIds.length) await supabase.from('mlk_kasa').delete().in('id', kasaHarIds)

  const { data: iadeler } = await supabase.from('mlk_sermaye_iadeler').select('kasa_gider_id').eq('ortak_id', ortakId).not('kasa_gider_id', 'is', null)
  const kasaGiderIds = (iadeler || []).map(i => i.kasa_gider_id).filter(Boolean)
  if (kasaGiderIds.length) await supabase.from('mlk_kasa').delete().in('id', kasaGiderIds)

  const { error } = await supabase.from('mlk_sermaye_ortaklar').delete().eq('id', ortakId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
