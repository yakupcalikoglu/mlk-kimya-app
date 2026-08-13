import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = req.cookies.get('mlk_session'); if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  let u: any = null; try { u = JSON.parse(s.value) } catch {}
  if (!u || u.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz — görüntüleme yetkisiyle silme/düzenleme yapılamaz' }, { status: 403 })
  const body = await req.json()
  const { data, error } = await supabase.from('mlk_uretim').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = req.cookies.get('mlk_session'); if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  let u: any = null; try { u = JSON.parse(s.value) } catch {}
  if (!u || u.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz — görüntüleme yetkisiyle silme/düzenleme yapılamaz' }, { status: 403 })
  const { error } = await supabase.from('mlk_uretim').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
