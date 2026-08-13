// Tüm tablolarda ortak kullanılan sıralama fonksiyonu.
// String, sayı, tarih (YYYY-MM-DD) alanlarını otomatik doğru şekilde sıralar.
export type SiraYon = 'asc' | 'desc'
export interface SiraState { alan: string | null; yon: SiraYon }

export function siraliVeri<T extends Record<string, any>>(veri: T[], sira: SiraState): T[] {
  if (!sira.alan) return veri
  const alan = sira.alan
  return [...veri].sort((a, b) => {
    let av = a[alan]
    let bv = b[alan]
    if (av == null) av = ''
    if (bv == null) bv = ''
    let cmp: number
    if (typeof av === 'string' && typeof bv === 'string') {
      cmp = av.localeCompare(bv, 'tr')
    } else {
      cmp = av > bv ? 1 : av < bv ? -1 : 0
    }
    return sira.yon === 'asc' ? cmp : -cmp
  })
}

export function siraTikla(sira: SiraState, alan: string): SiraState {
  if (sira.alan === alan) {
    return { alan, yon: sira.yon === 'asc' ? 'desc' : 'asc' }
  }
  return { alan, yon: 'asc' }
}

export function siraIkon(sira: SiraState, alan: string): string {
  if (sira.alan !== alan) return ''
  return sira.yon === 'asc' ? ' ▲' : ' ▼'
}
