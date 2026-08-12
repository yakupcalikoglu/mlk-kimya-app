'use client'
import { useEffect, useState } from 'react'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function TumHareketler({ onCariSec }: { onCariSec?: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [kasa, setKasa] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifSekme, setAktifSekme] = useState<'kasa'|'cari'|'tumü'>('tumü')
  const [filtreCari, setFiltreCari] = useState('')
  const [filtreBaslangic, setFiltreBaslangic] = useState('')
  const [filtreBitis, setFiltreBitis] = useState('')

  useEffect(() => {
    async function yukle() {
      const [cRes, kRes] = await Promise.all([
        fetch('/api/cariler', { credentials: 'include' }),
        fetch('/api/kasa', { credentials: 'include' })
      ])
      if (cRes.ok) setCariler(await cRes.json())
      if (kRes.ok) setKasa(await kRes.json())
      setYukleniyor(false)
    }
    yukle()
  }, [])

  // Tüm cari hareketleri
  const cariHareketler = cariler.flatMap(c =>
    (c.hareketler || []).map((h: any) => ({
      ...h, kaynak: 'cari', cariAd: c.ad, cariId: c.id
    }))
  )

  // Kasa hareketleri
  const kasaHareketler = kasa.map(h => ({
    ...h, kaynak: 'kasa', tarih: h.tarih,
    ad: h.ad, tutar: h.tutar, yon: h.yon
  }))

  // Filtrele
  function filtrele(liste: any[]) {
    return liste.filter(h => {
      if (filtreBaslangic && h.tarih < filtreBaslangic) return false
      if (filtreBitis && h.tarih > filtreBitis) return false
      if (filtreCari && h.cariId !== filtreCari) return false
      return true
    }).sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))
  }

  const kasaFiltre = filtrele(kasaHareketler)
  const cariFiltre = filtrele(cariHareketler)
  const tumFiltre = filtrele([...kasaHareketler, ...cariHareketler])

  const gosterilen = aktifSekme === 'kasa' ? kasaFiltre
    : aktifSekme === 'cari' ? cariFiltre : tumFiltre

  const kasaGelir = kasaFiltre.filter(h => h.yon === 'giris').reduce((a, h) => a + (h.tutar || 0), 0)
  const kasaGider = kasaFiltre.filter(h => h.yon === 'cikis').reduce((a, h) => a + (h.tutar || 0), 0)
  const cariSatis = cariFiltre.filter(h => h.tur === 'satis').reduce((a, h) => a + (h.tutar || 0), 0)
  const cariTah = cariFiltre.filter(h => h.tur === 'tahsilat').reduce((a, h) => a + (h.tahsilat || 0), 0)

  return (
    <div>
      {/* Özet kartlar */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc G"><div className="l">Kasa Girişi</div><div className="v">₺{fmt(kasaGelir)}</div></div>
        <div className="sc R"><div className="l">Kasa Çıkışı</div><div className="v">₺{fmt(kasaGider)}</div></div>
        <div className="sc B"><div className="l">Cari Satış</div><div className="v">₺{fmt(cariSatis)}</div></div>
        <div className="sc A"><div className="l">Tahsilat</div><div className="v">₺{fmt(cariTah)}</div></div>
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="cb" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fr" style={{ margin: 0 }}>
            <label>Başlangıç</label>
            <input type="date" value={filtreBaslangic} onChange={e => setFiltreBaslangic(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div className="fr" style={{ margin: 0 }}>
            <label>Bitiş</label>
            <input type="date" value={filtreBitis} onChange={e => setFiltreBitis(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div className="fr" style={{ margin: 0 }}>
            <label>Cari</label>
            <select value={filtreCari} onChange={e => setFiltreCari(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }}>
              <option value="">Tümü</option>
              {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </select>
          </div>
          <button className="btn xs" onClick={() => { setFiltreBaslangic(''); setFiltreBitis(''); setFiltreCari('') }}>
            Sıfırla
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="card">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)' }}>
          {([['tumü', '📋 Tümü'], ['kasa', '💰 Kasa'], ['cari', '👥 Cari']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setAktifSekme(key)}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                borderBottom: aktifSekme === key ? '2px solid var(--acc)' : '2px solid transparent',
                color: aktifSekme === key ? 'var(--acc)' : 'var(--tx2)'
              }}>
              {label} <span style={{ fontSize: 10, opacity: .7 }}>
                ({key === 'tumü' ? tumFiltre.length : key === 'kasa' ? kasaFiltre.length : cariFiltre.length})
              </span>
            </button>
          ))}
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Tarih</th><th>Kaynak</th><th>Tür</th><th>Açıklama</th>
                <th className="tr">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {gosterilen.map((h, i) => {
                const isKasa = h.kaynak === 'kasa'
                const tutar = isKasa ? h.tutar : (h.tur === 'tahsilat' ? h.tahsilat : h.tutar)
                const pozitif = isKasa ? h.yon === 'giris' : h.tur === 'tahsilat'
                const tur = isKasa
                  ? (h.yon === 'giris' ? 'Kasa Giriş' : 'Kasa Çıkış')
                  : (h.tur === 'satis' ? 'Satış' : h.tur === 'tahsilat' ? 'Tahsilat' : h.tur)

                return (
                  <tr key={i}>
                    <td className="tnw">{h.tarih}</td>
                    <td>
                      {isKasa
                        ? <span className="badge bA">Kasa</span>
                        : <span className="badge bB" style={{ cursor: 'pointer' }}
                            onClick={() => onCariSec?.(h.cariId)}>
                            {h.cariAd?.split(' ')[0]}
                          </span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${pozitif ? 'bG' : 'bR'}`}>{tur}</span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isKasa ? h.ad : (h.acik || h.fatno || '—')}
                    </td>
                    <td className="tr" style={{ fontWeight: 700, color: pozitif ? 'var(--g)' : 'var(--r)' }}>
                      {pozitif ? '+' : '-'}₺{fmt(tutar || 0)}
                    </td>
                  </tr>
                )
              })}
              {!yukleniyor && !gosterilen.length && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hareket yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '9px 15px', background: 'var(--surf2)', borderTop: '1px solid var(--bdr)', fontSize: 12 }}>
          Toplam <b>{gosterilen.length}</b> hareket
        </div>
      </div>
    </div>
  )
}
