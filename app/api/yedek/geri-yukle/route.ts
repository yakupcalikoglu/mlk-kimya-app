import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TABLOLAR = [
  'mlk_cariler', 'mlk_kasa', 'mlk_marmara_lift',
  'mlk_engin_harcamalar', 'mlk_engin_tahsilatlar',
  'mlk_sermaye_ortaklar', 'mlk_sermaye_odemeler', 'mlk_sermaye_iadeler',
  'mlk_virman', 'mlk_uretim', 'mlk_hammadde',
  'mlk_hammadde_alimlar', 'mlk_hammadde_cikislar',
  'mlk_receteler', 'mlk_faturalar', 'mlk_genel_giderler',
]

// ⚠️ ÇOK YIKICI BİR İŞLEM: her tablodaki MEVCUT tüm veriyi siler,
// yerine yedekteki veriyi yazar. Bu yüzden hem admin rolü hem de
// (istemci tarafında) yönetici şifre onayı ve "GERİ YÜKLE" yazma
// zorunluluğu ile korunuyor.
export async function POST(req: NextRequest) {
  const s = req.cookies.get('mlk_session')
  if (!s) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  let u: any = null; try { u = JSON.parse(s.value) } catch {}
  if (!u || u.role !== 'admin') return NextResponse.json({ error: 'Sadece yönetici geri yükleyebilir' }, { status: 403 })

  const body = await req.json()
  const veri = body?.veri
  if (!veri || typeof veri !== 'object') {
    return NextResponse.json({ error: 'Geçersiz yedek dosyası' }, { status: 400 })
  }

  const sonuc: Record<string, { silindi: boolean; eklenen: number; hata?: string }> = {}

  for (const tablo of TABLOLAR) {
    const satirlar = veri[tablo]
    if (!Array.isArray(satirlar)) continue

    const { error: silHata } = await supabase.from(tablo).delete().not('id', 'is', null)
    if (silHata) {
      sonuc[tablo] = { silindi: false, eklenen: 0, hata: silHata.message }
      continue
    }

    if (satirlar.length > 0) {
      const { error: eklemeHata } = await supabase.from(tablo).insert(satirlar)
      if (eklemeHata) {
        sonuc[tablo] = { silindi: true, eklenen: 0, hata: eklemeHata.message }
        continue
      }
    }
    sonuc[tablo] = { silindi: true, eklenen: satirlar.length }
  }

  return NextResponse.json({ ok: true, sonuc })
}
