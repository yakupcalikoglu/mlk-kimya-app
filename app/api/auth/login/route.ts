import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const { data, error } = await supabase
    .from('mlk_kullanicilar')
    .select('id, username, name, role, aktif, ozel_yetkiler, password')
    .eq('username', username.toLowerCase().trim())
    .eq('aktif', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 })
  }

  // Geçiş dönemi: veritabanında hâlâ düz metin şifre kalmış olabilir
  // (bcrypt hash'leri her zaman "$2" ile başlar). Hash değilse eski usul
  // karşılaştırma yapılır VE doğruysa şifre otomatik olarak hash'lenip
  // güncellenir — böylece elle bir migration script'i çalıştırmaya gerek
  // kalmadan kullanıcılar ilk girişlerinde kendiliğinden güvenli hale gelir.
  const hashli = typeof data.password === 'string' && data.password.startsWith('$2')
  let dogru = false

  if (hashli) {
    dogru = bcrypt.compareSync(password, data.password)
  } else {
    dogru = data.password === password
    if (dogru) {
      const yeniHash = bcrypt.hashSync(password, 10)
      await supabase.from('mlk_kullanicilar').update({ password: yeniHash }).eq('id', data.id)
    }
  }

  if (!dogru) {
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 })
  }

  const { password: _pw, ...guvenliKullanici } = data

  const res = NextResponse.json({ ok: true, user: guvenliKullanici })
  res.cookies.set('mlk_session', JSON.stringify(guvenliKullanici), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 gün
  })
  return res
}
