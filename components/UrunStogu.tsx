'use client'
import { useEffect, useState } from 'react'
import { satilanHesapla } from '@/lib/stok'
import { overlayProps } from '@/lib/modalOverlay'
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

export default function UrunStogu() {
  const [uretimler, setUretimler] = useState<any[]>([])
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [sira2, setSira2] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  useEffect(() => {
    async function yukle() {
      const [uRes, cRes] = await Promise.all([
        fetch('/api/uretim', { credentials: 'include' }),
        fetch('/api/cariler', { credentials: 'include' })
      ])
      if (uRes.ok) setUretimler(await uRes.json())
      if (cRes.ok) setCariler(await cRes.json())
      setYukleniyor(false)
    }
    yukle()
  }, [])

  // Satılan bidonları hesapla — paylaşılan lib/stok.ts'ten
  function satılanBidon(lot: string) {
    const u = uretimler.find((x: any) => x.lot === lot)
    if (!u) return 0
    return satilanHesapla(u, cariler)
  }

  // Her lot için stok durumu (manuel düzeltme dahil — geçmiş kayıtlarda
  // lot etiketi olmadığı için satış otomatik düşülemiyordu; bu alanla
  // farkı elle kapatabilirsiniz)
  const stoklar = uretimler.map(u => {
    const topBidon = (u.bidonlar || []).reduce((a: number, b: any) => a + (b.adet || 0), 0)
    const satilan = satılanBidon(u.lot)
    const manuelDusum = u.manuel_dusum || 0
    const kalan = topBidon - satilan - manuelDusum
    return { ...u, topBidon, satilan, manuelDusum, kalan }
  })
  const stoklarSirali = siraliVeri(stoklar, sira)

  const topUretilen = stoklar.reduce((a, s) => a + s.topBidon, 0)
  const topSatilan = stoklar.reduce((a, s) => a + s.satilan + s.manuelDusum, 0)
  const topKalan = stoklar.reduce((a, s) => a + s.kalan, 0)

  const [duzeltModal, setDuzeltModal] = useState<{ open: boolean; uretim: any | null }>({ open: false, uretim: null })

  async function duzeltmeyiKaydet(uretimId: number, deger: number) {
    await fetch(`/api/uretim/${uretimId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ manuel_dusum: deger }),
    })
    const res = await fetch('/api/uretim', { credentials: 'include' })
    if (res.ok) setUretimler(await res.json())
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc B"><div className="l">Toplam Üretilen</div><div className="v">{topUretilen}</div><div className="s">bidon</div></div>
        <div className="sc R"><div className="l">Satılan</div><div className="v">{topSatilan}</div><div className="s">bidon</div></div>
        <div className="sc G"><div className="l">Stokta Kalan</div><div className="v">{topKalan}</div><div className="s">bidon</div></div>
        <div className="sc A"><div className="l">Lot Sayısı</div><div className="v">{uretimler.length}</div><div className="s">üretim</div></div>
      </div>

      <div className="card">
        <div className="ch">📦 Ürün Stoğu (Lot Bazlı)</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'lot'))}>Lot{siraIkon(sira,'lot')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'urun'))}>Ürün{siraIkon(sira,'urun')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'topBidon'))}>Üretilen{siraIkon(sira,'topBidon')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'satilan'))}>Satılan{siraIkon(sira,'satilan')}</th>
                <th className="tr">Manuel Düzeltme</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'kalan'))}>Kalan{siraIkon(sira,'kalan')}</th>
                <th>Bidon Dağılımı</th><th>Durum</th><th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {stoklarSirali.map(s => {
                const durum = s.kalan <= 0 ? { yazi: 'Tükendi', renk: 'var(--r)', bg: 'var(--rbg)' }
                  : s.kalan < 10 ? { yazi: 'Az Kaldı', renk: 'var(--a)', bg: 'var(--abg)' }
                  : { yazi: 'Stokta', renk: 'var(--g)', bg: 'var(--gbg)' }
                const bidonDetay = (s.bidonlar || []).map((b: any) => `${b.adet}×${b.boy}lt`).join(', ')
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--b)' }}>{s.lot}</td>
                    <td>{s.urun}</td>
                    <td className="tnw">{fmtTarih(s.tarih)}</td>
                    <td className="tr">{s.topBidon}</td>
                    <td className="tr" style={{ color: 'var(--r)' }}>{s.satilan}</td>
                    <td className="tr">
                      {s.manuelDusum > 0 ? <span style={{ color: 'var(--a)', fontWeight: 600 }}>-{s.manuelDusum}</span> : '—'}
                    </td>
                    <td className="tr" style={{ fontWeight: 700, color: durum.renk }}>{s.kalan}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{bidonDetay || '—'}</td>
                    <td><span className="badge" style={{ background: durum.bg, color: durum.renk }}>{durum.yazi}</span></td>
                    <td><button className="btn xs te" onClick={() => setDuzeltModal({ open: true, uretim: s })}>✏️</button></td>
                  </tr>
                )
              })}
              {!yukleniyor && !uretimler.length && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Üretim kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StokHareketleri uretimler={uretimler} cariler={cariler} sira={sira2} setSira={setSira2} />

      {duzeltModal.open && duzeltModal.uretim && (
        <DuzeltmeModal
          uretim={duzeltModal.uretim}
          onClose={() => setDuzeltModal({ open: false, uretim: null })}
          onKaydet={duzeltmeyiKaydet}
        />
      )}
    </div>
  )
}

function DuzeltmeModal({ uretim, onClose, onKaydet }: { uretim: any; onClose: () => void; onKaydet: (id: number, deger: number) => Promise<void> }) {
  const [deger, setDeger] = useState(uretim.manuelDusum || 0)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const yeniKalan = uretim.topBidon - uretim.satilan - deger

  async function kaydet() {
    setKaydediliyor(true)
    await onKaydet(uretim.id, deger)
    setKaydediliyor(false)
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">✏️ Manuel Stok Düzeltmesi — {uretim.lot}<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="finfo" style={{ marginBottom: 10 }}>
            Bu, geçmişte lot etiketi olmadan girilmiş satışlar/düzeltmeler için ekstra bir düşüm miktarıdır.
            Otomatik hesaplanan Satılan (<b>{uretim.satilan}</b>) rakamına eklenir.
          </div>
          <div className="fr"><label>Manuel Düşülecek Bidon</label>
            <input type="number" value={deger} onChange={e => setDeger(Number(e.target.value))} min="0" />
          </div>
          <div className="finfo" style={{ marginTop: 10 }}>
            Üretilen: {uretim.topBidon} − Satılan: {uretim.satilan} − Manuel: {deger} = <b>Yeni Kalan: {yeniKalan}</b>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}

function StokHareketleri({ uretimler, cariler, sira, setSira }: { uretimler: any[]; cariler: any[]; sira: SiraState; setSira: (fn: (s: SiraState) => SiraState) => void }) {
  // Giriş kayıtları: her üretimin kendisi
  const girisler = uretimler.map((u: any) => ({
    tarih: u.tarih, tip: 'Giriş', lot: u.lot, urun: u.urun,
    cariAd: '—', bidon: (u.bidonlar || []).reduce((a: number, b: any) => a + (b.adet || 0), 0),
    kg: u.toplam_kg, acik: 'Üretim girişi',
  }))
  // Çıkış kayıtları: cari hareketlerindeki satis/bedelsiz_ver, lotu olan
  const cikislar = cariler.flatMap((c: any) =>
    (c.hareketler || [])
      .filter((h: any) => (h.tur === 'satis' || h.tur === 'bedelsiz_ver') && h.lot)
      .map((h: any) => {
        const u = uretimler.find((x: any) => x.lot === h.lot)
        const topBidonU = u ? (u.bidonlar || []).reduce((a: number, b: any) => a + (b.adet || 0), 0) : 0
        const kg = u && topBidonU > 0 ? (h.adet / topBidonU) * u.toplam_kg : 0
        return {
          tarih: h.tarih, tip: 'Çıkış', lot: h.lot, urun: u?.urun || '—',
          cariAd: c.ad, bidon: h.adet, kg,
          acik: h.tur === 'bedelsiz_ver' ? 'Bedelsiz' : (h.acik || 'Satış'),
        }
      })
  )
  const hareketler = siraliVeri([...girisler, ...cikislar], sira)

  return (
    <div className="card">
      <div className="ch">📋 Stok Hareketleri</div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
              <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tip'))}>Tip{siraIkon(sira,'tip')}</th>
              <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'lot'))}>Lot{siraIkon(sira,'lot')}</th>
              <th>Cari/Müşteri</th>
              <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'bidon'))}>Bidon{siraIkon(sira,'bidon')}</th>
              <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'kg'))}>Kg{siraIkon(sira,'kg')}</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {hareketler.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hareket yok</td></tr>
            )}
            {hareketler.map((h, i) => (
              <tr key={i}>
                <td className="tnw">{fmtTarih(h.tarih)}</td>
                <td><span className={`badge ${h.tip === 'Giriş' ? 'bG' : 'bR'}`}>{h.tip}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--b)' }}>{h.lot}</td>
                <td>{h.cariAd}</td>
                <td className="tr" style={{ fontWeight: 600, color: h.tip === 'Giriş' ? 'var(--g)' : 'var(--r)' }}>
                  {h.tip === 'Giriş' ? '+' : '-'}{h.bidon}
                </td>
                <td className="tr">{fmt(h.kg)} kg</td>
                <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{h.acik}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
