import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getUser(req: NextRequest) {
  const session = req.cookies.get('mlk_session')
  if (!session) return null
  try { return JSON.parse(session.value) } catch { return null }
}

export async function GET(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { data, error } = await supabase.from('mlk_uretim').select('*').order('tarih', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await supabase.from('mlk_uretim').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
