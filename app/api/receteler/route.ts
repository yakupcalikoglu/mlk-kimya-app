import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { data, error } = await supabase.from('mlk_receteler').select('*').order('ad')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.ad || !body.kalemler?.length) return NextResponse.json({ error: 'Ad ve en az bir kalem zorunludur' }, { status: 400 })
  const { data, error } = await supabase.from('mlk_receteler').insert({
    ad: body.ad, aciklama: body.aciklama || null, standart_kg: body.standart_kg || 1000, kalemler: body.kalemler,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
