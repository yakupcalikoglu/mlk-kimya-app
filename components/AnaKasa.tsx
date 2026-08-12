'use client'
import { useEffect, useState } from 'react'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}

interface AnaKasaVerisi {
  toplamGelir: number
  toplamGider: number
  netBakiye: number
  cariAlacak: number
  sermayeGelen: number
  sermayeBekleyen: number
  gelirKalemleri: { ad: string; tutar: number }[]
  giderKalemleri: { ad: string; tutar: number }[]
  acikCariler: { id: string; ad: string; bakiye: number }[]
}

export default function AnaKasa({ onCariSec }: { onCariSec?: (id: string) => void }) {
  const [veri, setVeri] = useState<AnaKasaVerisi | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    fetch('/api/ana-kasa', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setVeri(d); setYukleniyor(false) })
      .catch(() => setYukleniyor(false))
  }, [])

  if (yukleniyor) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>Yükleniyor...</div>
  if (!veri) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>Veri alınamadı</div>

  const { toplamGelir, toplamGider, netBakiye, cariAlacak, sermayeGelen, sermayeBekleyen, gelirKalemleri, giderKalemleri, acikCariler } = veri

  return (
    <div>
      <div className="finfo" style={{ marginBottom: 14 }}>
        📌 <b>Ana Kasa</b>, şirketin tüm para hareketlerinin birleşik görünümüdür. Operasyonel kasa, Marmara Lift, Engin hesabı ve sermaye ödemeleri burada özetlenir. <b>Sermaye ödemeleri</b> ortak takibi amaçlıdır — kasaya yatırılmış olanlar Kasa Girişi kaleminde de görünebilir.
      </div>

      <div className="sg">
        <div className="sc B"><div className="l">Toplam Gelir</div><div className="v">₺{fmt(toplamGelir)}</div><div className="s">Tüm kaynaklar</div></div>
        <div className="sc R"><div className="l">Toplam Gider</div><div className="v">₺{fmt(toplamGider)}</div><div className="s">Kasa + ML + Engin</div></div>
        <div className={`sc ${netBakiye >= 0 ? 'G' : 'R'}`}><div className="l">Net Bakiye</div><div className="v">₺{fmt(netBakiye)}</div><div className="s">{netBakiye >= 0 ? 'Pozitif' : 'Negatif'}</div></div>
        <div className="sc A"><div className="l">Cari Alacak</div><div className="v">₺{fmt(cariAlacak)}</div><div className="s">Tahsil edilmemiş</div></div>
        <div className="sc P"><div className="l">Sermaye Girişi (Toplam)</div><div className="v">₺{fmt(sermayeGelen)}</div><div className="s">Kasaya yansıyanlar dahil</div></div>
        {sermayeBekleyen > 0 && (
          <div className="sc A"><div className="l">Bekleyen Sermaye</div><div className="v">₺{fmt(sermayeBekleyen)}</div></div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ch">📥 Gelir Kalemleri (Özet)</div>
          <div className="tw">
            <table>
              <thead><tr><th>Kaynak</th><th className="tr">Tutar (₺)</th><th className="tr">%</th></tr></thead>
              <tbody>
                {gelirKalemleri.filter(x => x.tutar > 0).map(x => (
                  <tr key={x.ad}>
                    <td>{x.ad}</td>
                    <td className="tr" style={{ fontWeight: 600, color: 'var(--g)' }}>₺{fmt(x.tutar)}</td>
                    <td className="tr" style={{ color: 'var(--tx2)' }}>{toplamGelir > 0 ? ((x.tutar / toplamGelir) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--gbg)', fontWeight: 700 }}>
                  <td>TOPLAM GELİR</td>
                  <td className="tr" style={{ color: 'var(--g)' }}>₺{fmt(toplamGelir)}</td>
                  <td className="tr">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="ch">📤 Gider Kalemleri (Özet)</div>
          <div className="tw">
            <table>
              <thead><tr><th>Kaynak</th><th className="tr">Tutar (₺)</th><th className="tr">%</th></tr></thead>
              <tbody>
                {giderKalemleri.filter(x => x.tutar > 0).map(x => (
                  <tr key={x.ad}>
                    <td>{x.ad}</td>
                    <td className="tr" style={{ fontWeight: 600, color: 'var(--r)' }}>₺{fmt(x.tutar)}</td>
                    <td className="tr" style={{ color: 'var(--tx2)' }}>{toplamGider > 0 ? ((x.tutar / toplamGider) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--rbg)', fontWeight: 700 }}>
                  <td>TOPLAM GİDER</td>
                  <td className="tr" style={{ color: 'var(--r)' }}>₺{fmt(toplamGider)}</td>
                  <td className="tr">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">📋 Tahsil Edilmemiş Alacaklar</div>
        <div className="tw">
          <table>
            <thead><tr><th>Müşteri/Cari</th><th className="tr">Alacak (₺)</th><th>Durum</th></tr></thead>
            <tbody>
              {acikCariler.length === 0 && sermayeBekleyen === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Tüm alacaklar tahsil edilmiş ✅</td></tr>
              )}
              {acikCariler.map(c => (
                <tr key={c.id} style={{ cursor: onCariSec ? 'pointer' : 'default' }} onClick={() => onCariSec?.(c.id)}>
                  <td style={{ color: 'var(--b)', textDecoration: onCariSec ? 'underline dotted' : 'none' }}>{c.ad}</td>
                  <td className="tr" style={{ fontWeight: 600, color: 'var(--r)' }}>₺{fmt(c.bakiye)}</td>
                  <td><span className="badge bA">Açık</span></td>
                </tr>
              ))}
              {sermayeBekleyen > 0 && (
                <tr>
                  <td>Bekleyen sermaye ödemeleri</td>
                  <td className="tr" style={{ fontWeight: 600, color: 'var(--p)' }}>₺{fmt(sermayeBekleyen)}</td>
                  <td><span className="badge bX">Bekliyor</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
