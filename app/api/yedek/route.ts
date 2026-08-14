import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Yedeğe dahil edilen tablolar. mlk_kullanicilar KASITLI OLARAK dışında
// bırakıldı — bir geri yükleme sırasında şifre hash'lerinin eski haline
// dönüp kimsenin giriş yapamaz hale gelmesini önlemek için.
const TABLOLAR = [
  'mlk_cariler', 'mlk_kasa', 'mlk_marmara_lift',
  'mlk_engin_harcamalar', 'mlk_engin_tahsilatlar',
  'mlk_sermaye_ortaklar', 'mlk_sermaye_odemeler', 'mlk_sermaye_iadeler',
  'mlk_virman', 'mlk_uretim', 'mlk_hammadde',
  'mlk_hammadde_alimlar', 'mlk_hammadde_cikislar',
  'mlk_receteler', 'mlk_faturalar', 'mlk_genel_giderler',
]

export async function GET(req: NextRequest) {
  const s = req.cookies.get('mlk_session')
  if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  let u: any = null; try { u = JSON.parse(s.value) } catch {}
  if (!u || u.role !== 'admin') return NextResponse.json({ error: 'Sadece yönetici yedek alabilir' }, { status: 403 })

  const yedek: Record<string, any[]> = {}
  for (const tablo of TABLOLAR) {
    const { data, error } = await supabase.from(tablo).select('*')
    if (error) return NextResponse.json({ error: `${tablo}: ${error.message}` }, { status: 500 })
    yedek[tablo] = data || []
  }

  const gövde = JSON.stringify({
    olusturulma: new Date().toISOString(),
    versiyon: 1,
    veri: yedek,
  }, null, 2)

  return new NextResponse(gövde, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mlk-yedek-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
