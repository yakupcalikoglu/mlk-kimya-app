'use client'
import { useEffect, useState } from 'react'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function HammaddeStogu() {
  const [hammaddeler, setHammaddeler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'ad', yon: 'asc' })

  async function yukle() {
    const res = await fetch('/api/hammadde', { credentials: 'include' })
    if (res.ok) setHammaddeler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  async function hammaddeEkle() {
    if (!form.ad) { alert('Hammadde adı girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/hammadde', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ad: form.ad,
        birim: form.birim || 'kg',
        guncel_stok: parseFloat(form.guncel_stok || 0),
        birim_fiyat: parseFloat(form.birim_fiyat || 0)
      })
    })
    await yukle()
    setModal(false)
    setForm({})
    setKaydediliyor(false)
  }

  async function stokGuncelle(id: number, miktar: number) {
    await fetch(`/api/hammadde/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ guncel_stok: miktar })
    })
    await yukle()
  }

  async function hammaddeSil(id: number) {
    if (!confirm('Bu hammadde silinsin mi?')) return
    await fetch(`/api/hammadde/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  const topStok = hammaddeler.reduce((a, h) => a + (h.guncel_stok || 0), 0)

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="sc B"><div className="l">Hammadde Çeşidi</div><div className="v">{hammaddeler.length}</div></div>
        <div className="sc G"><div className="l">Toplam Stok</div><div className="v">{fmt(topStok)}</div><div className="s">kg</div></div>
        <div className="sc A">
          <div className="l">Kritik Stok</div>
          <div className="v">{hammaddeler.filter(h => (h.guncel_stok || 0) <= 0).length}</div>
          <div className="s">tükenen hammadde</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">🧪 Hammadde Stok Durumu
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => setModal(true)}>+ Hammadde Ekle</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'ad'))}>Hammadde{siraIkon(sira,'ad')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'birim'))}>Birim{siraIkon(sira,'birim')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'guncel_stok'))}>Stok{siraIkon(sira,'guncel_stok')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'birim_fiyat'))}>Birim Fiyat{siraIkon(sira,'birim_fiyat')}</th>
                <th>Durum</th><th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {siraliVeri(hammaddeler, sira).map(h => {
                const stok = h.guncel_stok || 0
                const durum = stok <= 0 ? { renk: 'var(--r)', yazi: 'Tükendi', bg: 'var(--rbg)' }
                  : stok < 100 ? { renk: 'var(--a)', yazi: 'Az', bg: 'var(--abg)' }
                  : { renk: 'var(--g)', yazi: 'Yeterli', bg: 'var(--gbg)' }
                const pct = Math.min(100, (stok / (stok + 500)) * 100)
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 500 }}>{h.ad}</td>
                    <td>{h.birim || 'kg'}</td>
                    <td className="tr" style={{ fontWeight: 700, color: durum.renk }}>
                      {fmt(stok)}
                      <div style={{ background: 'var(--bdr)', borderRadius: 99, height: 4, marginTop: 3, minWidth: 80 }}>
                        <div style={{ background: durum.renk, borderRadius: 99, height: 4, width: pct + '%', transition: 'width .3s' }} />
                      </div>
                    </td>
                    <td className="tr">{h.birim_fiyat ? '₺' + fmt(h.birim_fiyat) : '—'}</td>
                    <td><span className="badge" style={{ background: durum.bg, color: durum.renk }}>{durum.yazi}</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn xs te" onClick={() => {
                          const yeni = prompt('Yeni stok miktarı (kg):', String(stok))
                          if (yeni !== null) stokGuncelle(h.id, parseFloat(yeni))
                        }}>✏️</button>
                        <button className="btn xs dn" onClick={() => hammaddeSil(h.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!yukleniyor && !hammaddeler.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hammadde yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              + Hammadde Ekle
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fr"><label>Hammadde Adı *</label>
                <input type="text" value={form.ad || ''} onChange={e => setForm({ ...form, ad: e.target.value })} placeholder="ör: APCA" />
              </div>
              <div className="fg2">
                <div className="fr"><label>Birim</label>
                  <select value={form.birim || 'kg'} onChange={e => setForm({ ...form, birim: e.target.value })}>
                    <option value="kg">kg</option>
                    <option value="lt">lt</option>
                    <option value="adet">adet</option>
                  </select>
                </div>
                <div className="fr"><label>Mevcut Stok</label>
                  <input type="number" value={form.guncel_stok || ''} onChange={e => setForm({ ...form, guncel_stok: e.target.value })} min="0" step="0.01" />
                </div>
              </div>
              <div className="fr"><label>Birim Fiyat (₺)</label>
                <input type="number" value={form.birim_fiyat || ''} onChange={e => setForm({ ...form, birim_fiyat: e.target.value })} min="0" step="0.01" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={hammaddeEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
