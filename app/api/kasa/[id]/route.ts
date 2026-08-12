import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const s = cookies().get('mlk_session')
  if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const { error } = await supabase.from('mlk_kasa').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
