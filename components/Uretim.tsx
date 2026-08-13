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
function today() { return new Date().toISOString().split('T')[0] }

export default function Uretim() {
  const [uretimler, setUretimler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today(), bidonlar: [{ boy: 20, adet: 0 }] })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  async function yukle() {
    const res = await fetch('/api/uretim', { credentials: 'include' })
    if (res.ok) setUretimler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const topKg = uretimler.reduce((a, u) => a + (u.toplam_kg || 0), 0)
  const topBidon = uretimler.reduce((a, u) =>
    a + (u.bidonlar || []).reduce((b: number, x: any) => b + (x.adet || 0), 0), 0)
  const topMaliyet = uretimler.reduce((a, u) => a + (u.maliyet || 0), 0)

  async function uretimEkle() {
    if (!form.lot) { alert('Lot numarası girin!'); return }
    if (!form.urun) { alert('Ürün adı girin!'); return }
    setKaydediliyor(true)

    const payload = {
      lot: form.lot,
      tarih: form.tarih || today(),
      urun: form.urun,
      toplam_kg: parseFloat(form.toplam_kg || 0),
      maliyet: parseFloat(form.maliyet || 0),
      bidonlar: form.bidonlar || [],
      hammaddeler: {}
    }

    await fetch('/api/uretim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    await yukle()
    setModal(false)
    setForm({ tarih: today(), bidonlar: [{ boy: 20, adet: 0 }] })
    setKaydediliyor(false)
  }

  async function uretimSil(id: number) {
    if (!confirm('Bu üretim kaydı silinsin mi?')) return
    await fetch(`/api/uretim/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  function bidonEkle() {
    setForm({ ...form, bidonlar: [...(form.bidonlar || []), { boy: 20, adet: 0 }] })
  }

  function bidonGuncelle(i: number, key: string, val: any) {
    const bidonlar = [...(form.bidonlar || [])]
    bidonlar[i] = { ...bidonlar[i], [key]: val }
    setForm({ ...form, bidonlar })
  }

  function bidonSil(i: number) {
    setForm({ ...form, bidonlar: form.bidonlar.filter((_: any, idx: number) => idx !== i) })
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc B"><div className="l">Toplam Üretim</div><div className="v">{uretimler.length}</div><div className="s">lot</div></div>
        <div className="sc G"><div className="l">Toplam Bidon</div><div className="v">{topBidon}</div><div className="s">adet</div></div>
        <div className="sc A"><div className="l">Toplam Kg</div><div className="v">{topKg}</div><div className="s">kg</div></div>
        <div className="sc R"><div className="l">Toplam Maliyet</div><div className="v">₺{fmt(topMaliyet)}</div><div className="s">{topKg > 0 ? '₺' + fmt(topMaliyet / topKg) + '/kg' : ''}</div></div>
      </div>

      <div className="card">
        <div className="ch">⚗️ Üretim Kayıtları
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => setModal(true)}>+ Yeni Üretim</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'lot'))}>Lot{siraIkon(sira,'lot')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'urun'))}>Ürün{siraIkon(sira,'urun')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_bidonTop'))}>Bidon{siraIkon(sira,'_bidonTop')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'toplam_kg'))}>Kg{siraIkon(sira,'toplam_kg')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'maliyet'))}>Maliyet{siraIkon(sira,'maliyet')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {siraliVeri(uretimler.map(u => ({ ...u, _bidonTop: (u.bidonlar||[]).reduce((a:number,b:any)=>a+(b.adet||0),0) })), sira).map(u => {
                const bidonTop = u._bidonTop
                const bidonDetay = (u.bidonlar || []).map((b: any) => `${b.adet}×${b.boy}lt`).join(', ')
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--b)' }}>{u.lot}</td>
                    <td className="tnw">{fmtTarih(u.tarih)}</td>
                    <td>{u.urun}</td>
                    <td className="tr">
                      <span title={bidonDetay}>{bidonTop} bidon</span>
                      {bidonDetay && <div style={{ fontSize: 10, color: 'var(--tx2)' }}>{bidonDetay}</div>}
                    </td>
                    <td className="tr">{u.toplam_kg} kg</td>
                    <td className="tr">₺{fmt(u.maliyet || 0)}</td>
                    <td><button className="btn xs dn" onClick={() => uretimSil(u.id)}>🗑</button></td>
                  </tr>
                )
              })}
              {!yukleniyor && !uretimler.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Üretim kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box xl" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              ⚗️ Yeni Üretim Ekle
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fr"><label>Lot Numarası *</label>
                  <input type="text" value={form.lot || ''} onChange={e => setForm({ ...form, lot: e.target.value })} placeholder="ör: LOT-2026-003" />
                </div>
                <div className="fr"><label>Tarih</label>
                  <input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} />
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Ürün Adı *</label>
                  <input type="text" value={form.urun || ''} onChange={e => setForm({ ...form, urun: e.target.value })} placeholder="ör: MLK Havuz Kimyasalı %35" />
                </div>
                <div className="fr"><label>Toplam Kg</label>
                  <input type="number" value={form.toplam_kg || ''} onChange={e => setForm({ ...form, toplam_kg: e.target.value })} min="0" step="0.01" />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🪣 Bidon Dağılımı</div>
                {(form.bidonlar || []).map((b: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <div className="fr" style={{ margin: 0, flex: 1 }}>
                      <input type="number" value={b.boy} onChange={e => bidonGuncelle(i, 'boy', parseFloat(e.target.value))}
                        placeholder="Lt (ör: 20)" min="1" />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--tx2)' }}>lt ×</span>
                    <div className="fr" style={{ margin: 0, flex: 1 }}>
                      <input type="number" value={b.adet} onChange={e => bidonGuncelle(i, 'adet', parseInt(e.target.value))}
                        placeholder="Adet" min="0" />
                    </div>
                    <button className="btn xs dn" onClick={() => bidonSil(i)} style={{ padding: '3px 7px' }}>✕</button>
                  </div>
                ))}
                <button className="btn xs" onClick={bidonEkle}>+ Bidon Boyutu Ekle</button>
                {form.bidonlar?.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--tx2)', marginLeft: 8 }}>
                    Toplam: {form.bidonlar.reduce((a: number, b: any) => a + (parseInt(b.adet) || 0), 0)} bidon
                  </span>
                )}
              </div>

              <div className="fr"><label>Hammadde Maliyeti (₺)</label>
                <input type="number" value={form.maliyet || ''} onChange={e => setForm({ ...form, maliyet: e.target.value })} min="0" step="0.01" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={uretimEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
