import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getUser(req: NextRequest) {
  const session = req.cookies.get('mlk_session')
  if (!session) return null
  try { return JSON.parse(session.value) } catch { return null }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await req.json()
  if (!body.password) delete body.password
  else body.password = bcrypt.hashSync(body.password, 10)
  const { data, error } = await supabase.from('mlk_kullanicilar').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const { error } = await supabase.from('mlk_kullanicilar').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
