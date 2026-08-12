import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { data: obj } = await supabase.from('mlk_sermaye_iadeler').select('kasa_gider_id').eq('id', params.id).single()
  if (obj?.kasa_gider_id) await supabase.from('mlk_kasa').delete().eq('id', obj.kasa_gider_id)

  const { error } = await supabase.from('mlk_sermaye_iadeler').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
