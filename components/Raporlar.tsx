'use client'
import { useEffect, useState } from 'react'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'

function fmtTarih(t: string) {
  if (!t) return '—'
  const [y, m, d] = t.split('-')
  if (!y || !m || !d) return t
  return `${d}/${m}/${y}`
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function Raporlar() {
  const [cariler, setCariler] = useState<any[]>([])
  const [kasa, setKasa] = useState<any[]>([])
  const [uretimler, setUretimler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifRapor, setAktifRapor] = useState<'ozet'|'cari'|'kasa'|'uretim'>('ozet')
  const [donem, setDonem] = useState({ baslangic: '2026-01-01', bitis: new Date().toISOString().split('T')[0] })
  const [siraCari, setSiraCari] = useState<SiraState>({ alan: 'ad', yon: 'asc' })
  const [siraKasa, setSiraKasa] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [siraUretim, setSiraUretim] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  useEffect(() => {
    async function yukle() {
      const [cRes, kRes, uRes] = await Promise.all([
        fetch('/api/cariler', { credentials: 'include' }),
        fetch('/api/kasa', { credentials: 'include' }),
        fetch('/api/uretim', { credentials: 'include' })
      ])
      if (cRes.ok) setCariler(await cRes.json())
      if (kRes.ok) setKasa(await kRes.json())
      if (uRes.ok) setUretimler(await uRes.json())
      setYukleniyor(false)
    }
    yukle()
  }, [])

  function donemFiltre(tarih: string) {
    return tarih >= donem.baslangic && tarih <= donem.bitis
  }

  // Hesaplamalar
  const kasaGelir = kasa.filter(h => h.yon === 'giris' && donemFiltre(h.tarih)).reduce((a, h) => a + h.tutar, 0)
  const kasaGider = kasa.filter(h => h.yon === 'cikis' && donemFiltre(h.tarih)).reduce((a, h) => a + h.tutar, 0)

  const cariHareketler = cariler.flatMap(c =>
    (c.hareketler || []).filter((h: any) => donemFiltre(h.tarih)).map((h: any) => ({ ...h, cariAd: c.ad }))
  )
  const topSatis = cariHareketler.filter(h => h.tur === 'satis').reduce((a, h) => a + (h.tutar || 0), 0)
  const topTahsilat = cariHareketler.filter(h => h.tur === 'tahsilat').reduce((a, h) => a + (h.tahsilat || 0), 0)
  const topBidon = cariHareketler.filter(h => h.tur === 'satis').reduce((a, h) => a + (h.adet || 0), 0)

  const donemUretim = uretimler.filter(u => donemFiltre(u.tarih || ''))
  const topMaliyet = donemUretim.reduce((a, u) => a + (u.maliyet || 0), 0)
  const topUretimBidon = donemUretim.reduce((a, u) =>
    a + (u.bidonlar || []).reduce((b: number, x: any) => b + (x.adet || 0), 0), 0)

  // Cari bazlı özet
  const cariOzetler = cariler.map(c => {
    const har = (c.hareketler || []).filter((h: any) => donemFiltre(h.tarih))
    const satis = har.filter((h: any) => h.tur === 'satis').reduce((a: number, h: any) => a + (h.tutar || 0), 0)
    const tahsilat = har.filter((h: any) => h.tur === 'tahsilat').reduce((a: number, h: any) => a + (h.tahsilat || 0), 0)
    const bidon = har.filter((h: any) => h.tur === 'satis').reduce((a: number, h: any) => a + (h.adet || 0), 0)
    const sonBak = c.hareketler?.length ? c.hareketler[c.hareketler.length-1].bakiye : 0
    return { id: c.id, ad: c.ad, satis, tahsilat, bidon, sonBak }
  }).filter(c => c.satis > 0 || c.tahsilat > 0)
  const cariOzetlerSirali = siraliVeri(cariOzetler, siraCari)
  const kasaSirali = siraliVeri(kasa.filter(h => donemFiltre(h.tarih)), siraKasa)
  const uretimZengin = donemUretim.map(u => ({ ...u, _bidon: (u.bidonlar||[]).reduce((a:number,b:any)=>a+(b.adet||0),0) }))
  const uretimSirali = siraliVeri(uretimZengin, siraUretim)

  if (yukleniyor) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx2)' }}>Yükleniyor...</div>

  return (
    <div>
      {/* Dönem filtresi */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="cb" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="fr" style={{ margin: 0 }}>
            <label>Dönem Başlangıç</label>
            <input type="date" value={donem.baslangic} onChange={e => setDonem({ ...donem, baslangic: e.target.value })}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div className="fr" style={{ margin: 0 }}>
            <label>Dönem Bitiş</label>
            <input type="date" value={donem.bitis} onChange={e => setDonem({ ...donem, bitis: e.target.value })}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <button className="btn xs" onClick={() => setDonem({ baslangic: '2026-01-01', bitis: new Date().toISOString().split('T')[0] })}>
            Tümü
          </button>
          <button className="btn xs" onClick={() => {
            const now = new Date()
            const ay = String(now.getMonth() + 1).padStart(2, '0')
            const yil = now.getFullYear()
            setDonem({ baslangic: `${yil}-${ay}-01`, bitis: now.toISOString().split('T')[0] })
          }}>Bu Ay</button>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 14 }}>
        <div className="sc B"><div className="l">Toplam Satış</div><div className="v">₺{fmt(topSatis)}</div><div className="s">{topBidon} bidon</div></div>
        <div className="sc G"><div className="l">Tahsilat</div><div className="v">₺{fmt(topTahsilat)}</div></div>
        <div className="sc A"><div className="l">Kasa Net</div><div className="v">₺{fmt(kasaGelir - kasaGider)}</div></div>
        <div className="sc R"><div className="l">Üretim Maliyeti</div><div className="v">₺{fmt(topMaliyet)}</div><div className="s">{topUretimBidon} bidon</div></div>
      </div>

      {/* Sekmeler */}
      <div className="card">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)' }}>
          {([['ozet','📊 Genel Özet'],['cari','👥 Cari Bazlı'],['kasa','💰 Kasa'],['uretim','⚗️ Üretim']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setAktifRapor(key)}
              style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                borderBottom: aktifRapor === key ? '2px solid var(--acc)' : '2px solid transparent',
                color: aktifRapor === key ? 'var(--acc)' : 'var(--tx2)' }}>
              {label}
            </button>
          ))}
        </div>

        {aktifRapor === 'ozet' && (
          <div className="cb">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>💰 Kasa Özeti</div>
                {[
                  { ad: 'Kasa Girişi', tutar: kasaGelir, renk: 'var(--g)' },
                  { ad: 'Kasa Çıkışı', tutar: kasaGider, renk: 'var(--r)' },
                  { ad: 'Net Kasa', tutar: kasaGelir - kasaGider, renk: (kasaGelir-kasaGider)>=0?'var(--g)':'var(--r)' },
                ].map(x => (
                  <div key={x.ad} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bdr)', fontSize: 13 }}>
                    <span>{x.ad}</span><span style={{ fontWeight: 700, color: x.renk }}>₺{fmt(x.tutar)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>📋 Satış Özeti</div>
                {[
                  { ad: 'Toplam Satış', tutar: topSatis, renk: 'var(--b)' },
                  { ad: 'Tahsilat', tutar: topTahsilat, renk: 'var(--g)' },
                  { ad: 'Kalan Alacak', tutar: topSatis - topTahsilat, renk: 'var(--r)' },
                ].map(x => (
                  <div key={x.ad} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bdr)', fontSize: 13 }}>
                    <span>{x.ad}</span><span style={{ fontWeight: 700, color: x.renk }}>₺{fmt(x.tutar)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {aktifRapor === 'cari' && (
          <div className="tw">
            <table>
              <thead><tr>
                <th style={{cursor:'pointer'}} onClick={() => setSiraCari(s => siraTikla(s,'ad'))}>Cari{siraIkon(siraCari,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraCari(s => siraTikla(s,'satis'))}>Satış{siraIkon(siraCari,'satis')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraCari(s => siraTikla(s,'tahsilat'))}>Tahsilat{siraIkon(siraCari,'tahsilat')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraCari(s => siraTikla(s,'bidon'))}>Bidon{siraIkon(siraCari,'bidon')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraCari(s => siraTikla(s,'sonBak'))}>Güncel Bakiye{siraIkon(siraCari,'sonBak')}</th>
              </tr></thead>
              <tbody>
                {cariOzetlerSirali.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.ad}</td>
                    <td className="tr">₺{fmt(c.satis)}</td>
                    <td className="tr" style={{ color: 'var(--g)' }}>₺{fmt(c.tahsilat)}</td>
                    <td className="tr">{c.bidon}</td>
                    <td className="tr" style={{ fontWeight: 700, color: c.sonBak > 0 ? 'var(--r)' : c.sonBak < 0 ? 'var(--b)' : 'var(--tx2)' }}>
                      ₺{fmt(Math.abs(c.sonBak))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aktifRapor === 'kasa' && (
          <div className="tw">
            <table>
              <thead><tr>
                <th style={{cursor:'pointer'}} onClick={() => setSiraKasa(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(siraKasa,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraKasa(s => siraTikla(s,'yon'))}>Yön{siraIkon(siraKasa,'yon')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraKasa(s => siraTikla(s,'ad'))}>Açıklama{siraIkon(siraKasa,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraKasa(s => siraTikla(s,'tutar'))}>Tutar{siraIkon(siraKasa,'tutar')}</th>
              </tr></thead>
              <tbody>
                {kasaSirali.map(h => (
                  <tr key={h.id}>
                    <td className="tnw">{fmtTarih(h.tarih)}</td>
                    <td><span className={`badge ${h.yon==='giris'?'bG':'bR'}`}>{h.yon==='giris'?'Giriş':'Çıkış'}</span></td>
                    <td>{h.ad}</td>
                    <td className="tr" style={{ fontWeight: 700, color: h.yon==='giris'?'var(--g)':'var(--r)' }}>
                      {h.yon==='giris'?'+':'-'}₺{fmt(h.tutar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {aktifRapor === 'uretim' && (
          <div className="tw">
            <table>
              <thead><tr>
                <th style={{cursor:'pointer'}} onClick={() => setSiraUretim(s => siraTikla(s,'lot'))}>Lot{siraIkon(siraUretim,'lot')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraUretim(s => siraTikla(s,'urun'))}>Ürün{siraIkon(siraUretim,'urun')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraUretim(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(siraUretim,'tarih')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraUretim(s => siraTikla(s,'_bidon'))}>Bidon{siraIkon(siraUretim,'_bidon')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraUretim(s => siraTikla(s,'toplam_kg'))}>Kg{siraIkon(siraUretim,'toplam_kg')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraUretim(s => siraTikla(s,'maliyet'))}>Maliyet{siraIkon(siraUretim,'maliyet')}</th>
              </tr></thead>
              <tbody>
                {uretimSirali.map(u => {
                  const bidon = u._bidon
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--b)' }}>{u.lot}</td>
                      <td>{u.urun}</td>
                      <td className="tnw">{fmtTarih(u.tarih)}</td>
                      <td className="tr">{bidon}</td>
                      <td className="tr">{u.toplam_kg}</td>
                      <td className="tr" style={{ fontWeight: 700 }}>₺{fmt(u.maliyet||0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
