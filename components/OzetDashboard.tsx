'use client'
import { useEffect, useState } from 'react'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function StatCard({ baslik, deger, alt, tip }: { baslik: string, deger: string, alt?: string, tip: string }) {
  return (
    <div className={`sc ${tip}`}>
      <div className="l">{baslik}</div>
      <div className="v">{deger}</div>
      {alt && <div className="s">{alt}</div>}
    </div>
  )
}

export default function OzetDashboard({ onCariSec }: { onCariSec?: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [kasa, setKasa] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sira, setSira] = useState<SiraState>({ alan: 'ad', yon: 'asc' })

  useEffect(() => {
    async function yukle() {
      try {
        const [cRes, kRes] = await Promise.all([
          fetch('/api/cariler', { credentials: 'include' }),
          fetch('/api/kasa', { credentials: 'include' })
        ])
        if (cRes.ok) setCariler(await cRes.json())
        if (kRes.ok) setKasa(await kRes.json())
      } catch(e) {
        console.error(e)
      } finally {
        setYukleniyor(false)
      }
    }
    yukle()
  }, [])

  function cariSonBakiye(c: any) {
    const h = c.hareketler || []
    return h.length ? h[h.length-1].bakiye : 0
  }

  // Hesaplamalar
  let topSatis = 0, topTahsilat = 0, topBidon = 0
  cariler.forEach(c => {
    (c.hareketler || []).forEach((h: any) => {
      if (h.tur === 'satis') { topSatis += h.tutar || 0; topBidon += h.adet || 0 }
      if (h.tur === 'tahsilat') topTahsilat += h.tahsilat || 0
    })
  })
  const kalanAlacak = topSatis - topTahsilat
  const kasaGiris = kasa.filter(k => k.yon === 'giris').reduce((a, k) => a + k.tutar, 0)
  const kasaCikis = kasa.filter(k => k.yon === 'cikis').reduce((a, k) => a + k.tutar, 0)
  const kasaBakiye = kasaGiris - kasaCikis

  const acikCariler = cariler.filter(c => cariSonBakiye(c) > 0)

  if (yukleniyor) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', color:'var(--tx2)' }}>
      Yükleniyor...
    </div>
  )

  return (
    <div>
      <div className="sg">
        <StatCard baslik="Toplam Satış" deger={`₺${fmt(topSatis)}`} alt={`${topBidon} bidon`} tip="B" />
        <StatCard baslik="Tahsil Edilen" deger={`₺${fmt(topTahsilat)}`} tip="G" />
        <StatCard baslik="Kalan Alacak" deger={`₺${fmt(Math.abs(kalanAlacak))}`}
          alt={`${acikCariler.length} aktif hesap`} tip="R" />
        <StatCard baslik="Kasa Bakiyesi" deger={`₺${fmt(kasaBakiye)}`} alt="Operasyonel" tip={kasaBakiye >= 0 ? 'G' : 'R'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
        <div className="card">
          <div className="ch">📋 Cari Hesap Özeti</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'ad'))}>Cari{siraIkon(sira,'ad')}</th>
                  <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_satis'))}>Satış{siraIkon(sira,'_satis')}</th>
                  <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_tahsilat'))}>Tahsilat{siraIkon(sira,'_tahsilat')}</th>
                  <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_bakiye'))}>Bakiye{siraIkon(sira,'_bakiye')}</th>
                </tr>
              </thead>
              <tbody>
                {siraliVeri(cariler.map(c => {
                  let cSatis = 0, cTah = 0
                  ;(c.hareketler || []).forEach((h: any) => {
                    if (h.tur === 'satis') cSatis += h.tutar || 0
                    if (h.tur === 'tahsilat') cTah += h.tahsilat || 0
                  })
                  return { ...c, _satis: cSatis, _tahsilat: cTah, _bakiye: cariSonBakiye(c) }
                }), sira).map(c => {
                  const cSatis = c._satis, cTah = c._tahsilat
                  const bak = c._bakiye
                  return (
                    <tr key={c.id} style={{cursor:'pointer'}} onClick={() => onCariSec?.(c.id)}>
                      <td style={{ fontWeight: 500 }}>{c.ad}</td>
                      <td className="tr">₺{fmt(cSatis)}</td>
                      <td className="tr" style={{ color:'var(--g)' }}>₺{fmt(cTah)}</td>
                      <td className="tr" style={{ fontWeight:700, color: bak > 0 ? 'var(--r)' : bak < 0 ? 'var(--b)' : 'var(--tx2)' }}>
                        ₺{fmt(Math.abs(bak))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="ch">💰 Kasa & Finans Özeti</div>
          <div className="cb">
            {[
              { ad: 'Kasa Girişi', tutar: kasaGiris, renk: 'var(--g)' },
              { ad: 'Kasa Çıkışı', tutar: kasaCikis, renk: 'var(--r)' },
            ].map(x => (
              <div key={x.ad} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--bdr)', fontSize:'12px' }}>
                <span>{x.ad}</span>
                <span style={{ fontWeight:600, color:x.renk }}>₺{fmt(x.tutar)}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', fontSize:'13px', fontWeight:700 }}>
              <span>Operasyonel Kasa</span>
              <span style={{ color: kasaBakiye >= 0 ? 'var(--g)' : 'var(--r)' }}>₺{fmt(kasaBakiye)}</span>
            </div>
          </div>
        </div>
      </div>

      {acikCariler.length > 0 && (
        <div className="card" style={{ marginTop:'14px' }}>
          <div className="ch">💳 Açık Cari Bakiyeler</div>
          <div className="tw">
            <table>
              <thead><tr><th>Cari</th><th className="tr">Bakiye</th></tr></thead>
              <tbody>
                {acikCariler.map(c => (
                  <tr key={c.id}>
                    <td>{c.ad}</td>
                    <td className="tr" style={{ fontWeight:700, color:'var(--r)' }}>₺{fmt(cariSonBakiye(c))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
