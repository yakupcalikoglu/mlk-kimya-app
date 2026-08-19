// Ürün stoğu (lot bazlı kalan bidon) hesaplama mantığının TEK ve ORTAK
// kaynağı. Önceden bu mantık 6 farklı dosyada ayrı ayrı kopyalanmıştı —
// bu, bir düzeltmenin (örn. manuel_dusum) bir yerde yapılıp diğerlerinde
// unutulması gibi hatalara yol açtı. Artık tüm sayfalar buradan
// import ediyor; bir düzeltme gerekirse SADECE burada yapılır.

export interface UretimKaydi {
  lot: string
  urun?: string
  tarih?: string
  toplam_kg?: number
  bidonlar?: { boy: number; adet: number }[]
  manuel_dusum?: number
}

export interface CariHareket {
  tur?: string
  adet?: number
  lot?: string | null
}

export interface CariKaydi {
  hareketler?: CariHareket[]
}

/** Bir üretim kaydından sadece "satılan" (cari hareketlerinden düşülen) miktarı hesaplar. */
export function satilanHesapla(uretim: UretimKaydi, cariler: CariKaydi[]): number {
  let satilan = 0
  cariler.forEach(c => {
    ;(c.hareketler || []).forEach(h => {
      if ((h.tur === 'satis' || h.tur === 'bedelsiz_ver') && h.lot === uretim.lot) satilan += h.adet || 0
    })
  })
  return satilan
}

/** Bir üretim kaydının kaç bidonunun (satış/bedelsiz + manuel düzeltme sonrası) kaldığını hesaplar. */
export function lotKalanHesapla(uretim: UretimKaydi | undefined | null, cariler: CariKaydi[]): number {
  if (!uretim) return 0
  const topBidon = (uretim.bidonlar || []).reduce((a, b) => a + (b.adet || 0), 0)
  let satilan = 0
  cariler.forEach(c => {
    ;(c.hareketler || []).forEach(h => {
      if ((h.tur === 'satis' || h.tur === 'bedelsiz_ver') && h.lot === uretim.lot) satilan += h.adet || 0
    })
  })
  return Math.max(0, topBidon - satilan - (uretim.manuel_dusum || 0))
}

/** Lot koduna göre (üretimler listesinden bularak) kalan bidon hesaplar. */
export function lotKalanKoduIle(uretimler: UretimKaydi[], cariler: CariKaydi[], lot: string): number {
  const u = uretimler.find(x => x.lot === lot)
  return lotKalanHesapla(u, cariler)
}

/** Lot manuel seçilmediğinde, en eski (ilk üretilen) ve stoğu olan lotu bulur (FIFO). */
export function otoLotSec(uretimler: UretimKaydi[], cariler: CariKaydi[]): string | null {
  const sirali = [...uretimler].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''))
  for (const u of sirali) {
    if (lotKalanHesapla(u, cariler) > 0) return u.lot
  }
  return null
}

/** Bir üretim kaydı için kalan bidon + kalan kg'ı birlikte hesaplar (Dashboard/Ürün Stoğu özet kartları için). */
export function lotDurumHesapla(uretim: UretimKaydi, cariler: CariKaydi[]) {
  const topBidon = (uretim.bidonlar || []).reduce((a, b) => a + (b.adet || 0), 0)
  const kalanBidon = lotKalanHesapla(uretim, cariler)
  const kalanKg = topBidon > 0 ? (kalanBidon / topBidon) * (uretim.toplam_kg || 0) : 0
  return { topBidon, kalanBidon, kalanKg }
}
