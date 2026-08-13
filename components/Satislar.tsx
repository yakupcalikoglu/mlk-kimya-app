'use client'
import { useEffect, useState } from 'react'

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

export default function Satislar({ onCariSec }: { onCariSec?: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today() })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [filtreCari, setFiltreCari] = useState('')

  async function yukle() {
    const res = await fetch('/api/cariler', { credentials: 'include' })
    if (res.ok) setCariler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  // Tüm satış hareketleri
  const tumSatislar = cariler.flatMap(c =>
    (c.hareketler || [])
      .filter((h: any) => h.tur === 'satis')
      .map((h: any) => ({ ...h, cariAd: c.ad, cariId: c.id }))
  ).sort((a, b) => b.tarih?.localeCompare(a.tarih))

  const filtrelendi = filtreCari
    ? tumSatislar.filter(s => s.cariId === filtreCari)
    : tumSatislar

  const topSatis = filtrelendi.reduce((a, s) => a + (s.tutar || 0), 0)
  const topBidon = filtrelendi.reduce((a, s) => a + (s.adet || 0), 0)

  async function satisEkle() {
    if (!form.cariId) { alert('Cari seçin!'); return }
    if (!form.adet || !form.birim) { alert('Adet ve birim fiyat girin!'); return }
    setKaydediliyor(true)

    const c = cariler.find(x => x.id === form.cariId)
    const hareketler = [...(c?.hareketler || [])]
    const oncekiBak = hareketler.length ? hareketler[hareketler.length-1].bakiye : 0
    const tutar = parseFloat(form.adet) * parseFloat(form.birim)

    hareketler.push({
      id: Date.now(),
      tarih: form.tarih || today(),
      tur: 'satis',
      fatno: form.fatno || '',
      adet: parseFloat(form.adet),
      birim: parseFloat(form.birim),
      tutar,
      tahsilat: 0,
      bakiye: oncekiBak + tutar,
      acik: form.acik || ''
    })

    await fetch(`/api/cariler/${form.cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hareketler })
    })

    await yukle()
    setModal(false)
    setForm({ tarih: today() })
    setKaydediliyor(false)
  }

  async function satisSil(cariId: string, harId: number) {
    if (!confirm('Bu satış silinsin mi?')) return
    const c = cariler.find(x => x.id === cariId)
    let hareketler = (c?.hareketler || []).filter((h: any) => h.id !== harId)
    // Bakiyeleri yeniden hesapla
    let bak = 0
    hareketler = hareketler.map((h: any) => {
      bak += (h.tutar || 0) - (h.tahsilat || 0)
      return { ...h, bakiye: bak }
    })
    await fetch(`/api/cariler/${cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hareketler })
    })
    await yukle()
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="sc B">
          <div className="l">Toplam Satış</div>
          <div className="v">₺{fmt(topSatis)}</div>
          <div className="s">{topBidon} bidon</div>
        </div>
        <div className="sc G">
          <div className="l">Satış Adedi</div>
          <div className="v">{filtrelendi.length}</div>
          <div className="s">işlem</div>
        </div>
        <div className="sc A">
          <div className="l">Ort. Birim Fiyat</div>
          <div className="v">{topBidon > 0 ? '₺' + fmt(topSatis / topBidon) : '—'}</div>
          <div className="s">₺/bidon</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">🛒 Satışlar
          <div className="ch-actions" style={{ gap: 8 }}>
            <select value={filtreCari} onChange={e => setFiltreCari(e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }}>
              <option value="">Tüm Cariler</option>
              {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </select>
            <button className="btn xs pr" onClick={() => { setModal(true); setForm({ tarih: today() }) }}>
              + Satış Ekle
            </button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Tarih</th><th>Cari</th><th>Fatura No</th>
                <th className="tr">Adet</th><th className="tr">Birim ₺</th>
                <th className="tr">Tutar</th><th>Açıklama</th><th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {filtrelendi.map(s => (
                <tr key={`${s.cariId}-${s.id}`}>
                  <td className="tnw">{fmtTarih(s.tarih)}</td>
                  <td>
                    <span style={{ cursor: 'pointer', color: 'var(--b)', fontWeight: 500 }}
                      onClick={() => onCariSec?.(s.cariId)}>
                      {s.cariAd}
                    </span>
                  </td>
                  <td>{s.fatno || '—'}</td>
                  <td className="tr">{s.adet}</td>
                  <td className="tr">₺{fmt(s.birim)}</td>
                  <td className="tr" style={{ fontWeight: 700, color: 'var(--r)' }}>₺{fmt(s.tutar)}</td>
                  <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{s.acik || '—'}</td>
                  <td><button className="btn xs dn" onClick={() => satisSil(s.cariId, s.id)}>🗑</button></td>
                </tr>
              ))}
              {!yukleniyor && !filtrelendi.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Satış yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              + Satış Ekle
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fr"><label>Cari *</label>
                <select value={form.cariId || ''} onChange={e => setForm({ ...form, cariId: e.target.value })}>
                  <option value="">— Cari seçin —</option>
                  {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fr"><label>Tarih</label>
                  <input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} />
                </div>
                <div className="fr"><label>Fatura No</label>
                  <input type="text" value={form.fatno || ''} onChange={e => setForm({ ...form, fatno: e.target.value })} placeholder="ör: FT-2026-001" />
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Adet (Bidon) *</label>
                  <input type="number" value={form.adet || ''} onChange={e => setForm({ ...form, adet: e.target.value })} min="0" step="1" />
                </div>
                <div className="fr"><label>Birim Fiyat (₺) *</label>
                  <input type="number" value={form.birim || ''} onChange={e => setForm({ ...form, birim: e.target.value })} min="0" step="0.01" />
                </div>
              </div>
              {form.adet && form.birim && (
                <div className="finfo" style={{ marginBottom: 10 }}>
                  Toplam: <b>₺{fmt(parseFloat(form.adet) * parseFloat(form.birim))}</b>
                </div>
              )}
              <div className="fr"><label>Açıklama</label>
                <input type="text" value={form.acik || ''} onChange={e => setForm({ ...form, acik: e.target.value })} placeholder="İsteğe bağlı" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={satisEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
