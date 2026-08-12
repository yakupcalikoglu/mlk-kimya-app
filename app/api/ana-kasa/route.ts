import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function getUser(req: NextRequest) { const s = req.cookies.get('mlk_session'); if (!s) return null; try { return JSON.parse(s.value) } catch { return null } }

// GET /api/ana-kasa — TAMAMEN SALT OKUNUR.
// Şirketin tüm para hareketlerinin birleşik özetini döner:
// Kasa + Marmara Lift + Engin Hesabı + Sermaye Ödemeleri + Cari açık bakiyeler.
//
// ÇİFT SAYIM DÜZELTMESİ: Bir sermaye ödemesi "hedef=kasaya" + "durum=odendi"
// olarak kaydedildiğinde otomatik bir mlk_kasa girişi de oluşur ve o ödemenin
// kasa_har_id alanı doldurulur. Bu tutar zaten "Kasa Girişi" toplamının içinde
// olduğu için, Toplam Gelir hesaplanırken SADECE kasa_har_id'si BOŞ olan
// sermaye ödemeleri (yani kasaya yansımamış, örn. cariye/direkt ödenen)
// ayrıca eklenir — aynı para iki kez sayılmaz.
export async function GET(req: NextRequest) {
  if (!getUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const [kasaRes, mlRes, enginTahRes, enginHarRes, sermayeRes, carilerRes] = await Promise.all([
    supabase.from('mlk_kasa').select('yon, tutar'),
    supabase.from('mlk_marmara_lift').select('yon, tutar'),
    supabase.from('mlk_engin_tahsilatlar').select('tutar'),
    supabase.from('mlk_engin_harcamalar').select('tutar'),
    supabase.from('mlk_sermaye_odemeler').select('tutar, durum, kasa_har_id'),
    supabase.from('mlk_cariler').select('id, ad, hareketler'),
  ])

  const kasa = kasaRes.data || []
  const ml = mlRes.data || []
  const enginTah = enginTahRes.data || []
  const enginHar = enginHarRes.data || []
  const sermaye = sermayeRes.data || []
  const cariler = carilerRes.data || []

  const kasaGelir = kasa.filter(x => x.yon === 'giris').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const kasaGider = kasa.filter(x => x.yon === 'cikis').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const mlGelir = ml.filter(x => x.yon === 'giris').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const mlGider = ml.filter(x => x.yon === 'cikis').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const enginTahsilat = enginTah.reduce((a, x) => a + Number(x.tutar || 0), 0)
  const enginHarcama = enginHar.reduce((a, x) => a + Number(x.tutar || 0), 0)
  const odenenSermaye = sermaye.filter(x => x.durum === 'odendi')
  const sermayeGelen = odenenSermaye.reduce((a, x) => a + Number(x.tutar || 0), 0)
  // Kasaya zaten yansımış (kasa_har_id dolu) olanları Toplam Gelir'e tekrar eklemiyoruz —
  // onlar kasaGelir içinde zaten sayıldı.
  const sermayeGelenKasaDisi = odenenSermaye.filter(x => !x.kasa_har_id).reduce((a, x) => a + Number(x.tutar || 0), 0)
  const sermayeBekleyen = sermaye.filter(x => x.durum === 'bekliyor').reduce((a, x) => a + Number(x.tutar || 0), 0)

  const toplamGelir = kasaGelir + mlGelir + enginTahsilat + sermayeGelenKasaDisi
  const toplamGider = kasaGider + mlGider + enginHarcama
  const netBakiye = toplamGelir - toplamGider

  // Her cari için son bakiye (pozitif = bize borçlu)
  const cariAlacaklar = cariler.map((c: any) => {
    const h = c.hareketler || []
    const bakiye = h.length ? h[h.length - 1].bakiye || 0 : 0
    return { id: c.id, ad: c.ad, bakiye }
  })
  const cariAlacak = cariAlacaklar.filter(c => c.bakiye > 0).reduce((a, c) => a + c.bakiye, 0)

  return NextResponse.json({
    toplamGelir,
    toplamGider,
    netBakiye,
    cariAlacak,
    sermayeGelen,
    sermayeBekleyen,
    gelirKalemleri: [
      { ad: 'Operasyonel Kasa Girişi', tutar: kasaGelir },
      { ad: 'Marmara Lift Girişi', tutar: mlGelir },
      { ad: 'Engin Tahsilatları', tutar: enginTahsilat },
      { ad: 'Sermaye Ödemeleri (Kasa Dışı)', tutar: sermayeGelenKasaDisi },
    ],
    giderKalemleri: [
      { ad: 'Operasyonel Kasa Çıkışı', tutar: kasaGider },
      { ad: 'Marmara Lift Çıkışı', tutar: mlGider },
      { ad: 'Engin Harcamaları', tutar: enginHarcama },
    ],
    acikCariler: cariAlacaklar.filter(c => c.bakiye > 0).sort((a, b) => b.bakiye - a.bakiye),
  })
}
