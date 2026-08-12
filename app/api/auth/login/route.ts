import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const { data, error } = await supabase
    .from('mlk_kullanicilar')
    .select('id, username, name, role, aktif, ozel_yetkiler')
    .eq('username', username.toLowerCase().trim())
    .eq('password', password)
    .eq('aktif', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, user: data })
  res.cookies.set('mlk_session', JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 gün
  })
  return res
}
