import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Silme işlemlerini onaylamak için kullanılır — girilen şifre, sistemdeki
// ANY 'admin' rollü kullanıcının şifresiyle eşleşiyorsa onaylanır. Böylece
// silme yetkisi fiilen sadece admin şifresini (Yakup) bilen kişide kalır,
// oturum açan kullanıcının kendi rolü ne olursa olsun.
export async function POST(req: NextRequest) {
  const session = req.cookies.get('mlk_session')
  if (!session) return NextResponse.json({ ok: false, error: 'Yetkisiz' }, { status: 401 })

  const { password } = await req.json()
  if (!password) return NextResponse.json({ ok: false, error: 'Şifre girin' }, { status: 400 })

  const { data: adminler } = await supabase.from('mlk_kullanicilar').select('password').eq('role', 'admin').eq('aktif', true)

  for (const u of adminler || []) {
    const hashli = typeof u.password === 'string' && u.password.startsWith('$2')
    const dogru = hashli ? bcrypt.compareSync(password, u.password) : u.password === password
    if (dogru) return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'Yönetici şifresi hatalı' }, { status: 401 })
}
