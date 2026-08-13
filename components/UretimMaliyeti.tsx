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

export default function UretimMaliyeti() {
  const [uretimler, setUretimler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [seciliId, setSeciliId] = useState<number|null>(null)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  useEffect(() => {
    fetch('/api/uretim', { credentials: 'include' })
      .then(r => r.json()).then(d => { setUretimler(d); setYukleniyor(false) })
  }, [])

  const topMaliyet = uretimler.reduce((a, u) => a + (u.maliyet || 0), 0)
  const topKg = uretimler.reduce((a, u) => a + (u.toplam_kg || 0), 0)
  const topBidon = uretimler.reduce((a, u) =>
    a + (u.bidonlar || []).reduce((b: number, x: any) => b + (x.adet || 0), 0), 0)

  const uretimlerZengin = uretimler.map(u => {
    const _bidon = (u.bidonlar||[]).reduce((a:number,b:any)=>a+(b.adet||0),0)
    const _kgFiyat = u.toplam_kg > 0 ? u.maliyet / u.toplam_kg : 0
    return { ...u, _bidon, _kgFiyat }
  })
  const uretimlerSirali = siraliVeri(uretimlerZengin, sira)

  const secili = uretimler.find(u => u.id === seciliId)

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc R"><div className="l">Toplam Maliyet</div><div className="v">₺{fmt(topMaliyet)}</div></div>
        <div className="sc B"><div className="l">Toplam Kg</div><div className="v">{topKg}</div><div className="s">kg</div></div>
        <div className="sc G"><div className="l">Toplam Bidon</div><div className="v">{topBidon}</div><div className="s">adet</div></div>
        <div className="sc A">
          <div className="l">Ort. ₺/kg</div>
          <div className="v">{topKg > 0 ? '₺' + fmt(topMaliyet / topKg) : '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">📉 Üretim Maliyeti (Lot Bazlı)</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'lot'))}>Lot{siraIkon(sira,'lot')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'urun'))}>Ürün{siraIkon(sira,'urun')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'toplam_kg'))}>Kg{siraIkon(sira,'toplam_kg')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_bidon'))}>Bidon{siraIkon(sira,'_bidon')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'maliyet'))}>Maliyet{siraIkon(sira,'maliyet')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_kgFiyat'))}>₺/kg{siraIkon(sira,'_kgFiyat')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {uretimlerSirali.map(u => {
                const bidon = u._bidon
                const kgFiyat = u._kgFiyat
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--b)' }}>{u.lot}</td>
                    <td>{u.urun}</td>
                    <td className="tnw">{fmtTarih(u.tarih)}</td>
                    <td className="tr">{u.toplam_kg}</td>
                    <td className="tr">{bidon}</td>
                    <td className="tr" style={{ fontWeight: 700, color: 'var(--r)' }}>
                      {u.maliyet ? '₺' + fmt(u.maliyet) : <span style={{ color: 'var(--a)' }}>Girilmedi</span>}
                    </td>
                    <td className="tr" style={{ color: 'var(--tx2)' }}>
                      {kgFiyat > 0 ? '₺' + fmt(kgFiyat) : '—'}
                    </td>
                    <td>
                      <button className="btn xs te" onClick={() => { setSeciliId(u.id); setModal(true) }}>
                        ✏️ Düzenle
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!yukleniyor && !uretimler.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Üretim kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '9px 15px', background: 'var(--surf2)', borderTop: '1px solid var(--bdr)', fontSize: 12 }}>
          Toplam: <b style={{ color: 'var(--r)' }}>₺{fmt(topMaliyet)}</b> &nbsp;|&nbsp;
          {topKg} kg &nbsp;|&nbsp; {topBidon} bidon &nbsp;|&nbsp;
          Ort: <b>₺{topKg > 0 ? fmt(topMaliyet / topKg) : '0'}/kg</b>
        </div>
      </div>

      {modal && secili && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              ✏️ Maliyet Düzenle — {secili.lot}
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="finfo" style={{ marginBottom: 12 }}>
                <b>{secili.urun}</b> — {fmtTarih(secili.tarih)} — {secili.toplam_kg} kg
              </div>
              <div className="fr"><label>Hammadde Maliyeti (₺)</label>
                <input type="number"
                  defaultValue={secili.maliyet || 0}
                  id="maliyet-input"
                  min="0" step="0.01" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={async () => {
                const val = parseFloat((document.getElementById('maliyet-input') as HTMLInputElement).value)
                await fetch(`/api/uretim/${secili.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ maliyet: val })
                })
                const res = await fetch('/api/uretim', { credentials: 'include' })
                if (res.ok) setUretimler(await res.json())
                setModal(false)
              }}>💾 Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
