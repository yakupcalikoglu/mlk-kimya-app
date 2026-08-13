import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

async function yenidenHesapla(hammaddeId: number) {
  const [{ data: alimlar }, { data: cikislar }] = await Promise.all([
    supabase.from('mlk_hammadde_alimlar').select('miktar,tutar').eq('hammadde_id', hammaddeId),
    supabase.from('mlk_hammadde_cikislar').select('miktar').eq('hammadde_id', hammaddeId),
  ])
  const toplamAlinan = (alimlar || []).reduce((a, x) => a + Number(x.miktar || 0), 0)
  const toplamTutar = (alimlar || []).reduce((a, x) => a + Number(x.tutar || 0), 0)
  const toplamCikan = (cikislar || []).reduce((a, x) => a + Number(x.miktar || 0), 0)
  const guncelStok = toplamAlinan - toplamCikan
  const ortFiyat = toplamAlinan > 0 ? toplamTutar / toplamAlinan : 0
  await supabase.from('mlk_hammadde').update({ guncel_stok: guncelStok, birim_fiyat: ortFiyat }).eq('id', hammaddeId)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req); if (!user || user.role === 'goruntule') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { data: kayit } = await supabase.from('mlk_hammadde_cikislar').select('hammadde_id').eq('id', params.id).single()
  const { error } = await supabase.from('mlk_hammadde_cikislar').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (kayit?.hammadde_id) await yenidenHesapla(kayit.hammadde_id)
  return NextResponse.json({ ok: true })
}
