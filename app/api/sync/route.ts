import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Eski mlk_data'dan yeni tablolara veri taşıma
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const session = cookieStore.get('mlk_session')
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const user = JSON.parse(session.value)
  if (user.role !== 'admin') return NextResponse.json({ error: 'Sadece admin' }, { status: 403 })

  const body = await req.json()
  const { cariler, kasa, uretimKayitlari, hammadde } = body

  // Carileri taşı
  if (cariler) {
    for (const [id, c] of Object.entries(cariler as Record<string, any>)) {
      await supabase.from('mlk_cariler').upsert({
        id,
        ad: (c as any).ad,
        tip: (c as any).tip || 'musteri',
        hareketler: (c as any).hareketler || [],
        updated_at: new Date().toISOString()
      })
    }
  }

  // Kasa taşı
  if (kasa) {
    for (const g of (kasa.gelir || [])) {
      await supabase.from('mlk_kasa').upsert({
        id: `g_${g.id}`,
        yon: 'giris', tarih: g.tarih, ad: g.ad, tutar: g.tutar, cari_ref: g.cariRef
      })
    }
    for (const c of (kasa.gider || [])) {
      await supabase.from('mlk_kasa').upsert({
        id: `c_${c.id}`,
        yon: 'cikis', tarih: c.tarih, ad: c.ad, tutar: c.tutar
      })
    }
  }

  // Üretim taşı
  if (uretimKayitlari) {
    for (const u of uretimKayitlari) {
      await supabase.from('mlk_uretim').upsert({
        id: u.id, lot: u.lot, tarih: u.tarih, urun: u.urun,
        toplam_kg: u.toplamKg, maliyet: u.maliyet,
        hammaddeler: u.hammaddeler, bidonlar: u.bidonlar
      })
    }
  }

  return NextResponse.json({ ok: true, mesaj: 'Veriler taşındı' })
}

// Tüm veriyi çek
export async function GET() {
  const cookieStore = cookies()
  const session = cookieStore.get('mlk_session')
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const [cariler, kasa, uretim] = await Promise.all([
    supabase.from('mlk_cariler').select('*').order('ad'),
    supabase.from('mlk_kasa').select('*').order('tarih', { ascending: false }),
    supabase.from('mlk_uretim').select('*').order('tarih', { ascending: false })
  ])

  return NextResponse.json({
    cariler: cariler.data || [],
    kasa: kasa.data || [],
    uretim: uretim.data || []
  })
}
