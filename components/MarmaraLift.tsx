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

export default function MarmaraLift() {
  const [hareketler, setHareketler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today() })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function yukle() {
    const res = await fetch('/api/marmara-lift', { credentials: 'include' })
    if (res.ok) setHareketler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const topGelir = hareketler.filter(h => h.yon === 'giris').reduce((a, h) => a + (h.tutar || 0), 0)
  const topGider = hareketler.filter(h => h.yon === 'cikis').reduce((a, h) => a + (h.tutar || 0), 0)
  const bakiye = topGelir - topGider

  async function harEkle() {
    if (!form.tutar || !form.ad) { alert('Tutar ve açıklama girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/marmara-lift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tarih: form.tarih, ad: form.ad, tutar: parseFloat(form.tutar), yon: form.yon || 'giris' })
    })
    await yukle()
    setModal(false)
    setForm({ tarih: today() })
    setKaydediliyor(false)
  }

  async function harSil(id: string) {
    if (!confirm('Silinsin mi?')) return
    await fetch(`/api/marmara-lift/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className={`sc ${bakiye >= 0 ? 'G' : 'R'}`}>
          <div className="l">Marmara Lift Bakiye</div>
          <div className="v">₺{fmt(Math.abs(bakiye))}</div>
          <div className="s">{bakiye >= 0 ? 'Alacağımız' : 'Borcumuz'}</div>
        </div>
        <div className="sc G"><div className="l">Toplam Giriş</div><div className="v">₺{fmt(topGelir)}</div></div>
        <div className="sc R"><div className="l">Toplam Çıkış</div><div className="v">₺{fmt(topGider)}</div></div>
      </div>

      <div className="card">
        <div className="ch">🏢 Marmara Lift Hareketleri
          <div className="ch-actions">
            <button className="btn xs gn" onClick={() => { setForm({ tarih: today(), yon: 'giris' }); setModal(true) }}>+ Giriş</button>
            <button className="btn xs dn" onClick={() => { setForm({ tarih: today(), yon: 'cikis' }); setModal(true) }}>+ Çıkış</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Tarih</th><th>Yön</th><th>Açıklama</th><th className="tr">Tutar</th><th></th></tr></thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {[...hareketler].sort((a, b) => b.tarih?.localeCompare(a.tarih)).map(h => (
                <tr key={h.id}>
                  <td className="tnw">{fmtTarih(h.tarih)}</td>
                  <td><span className={`badge ${h.yon === 'giris' ? 'bG' : 'bR'}`}>{h.yon === 'giris' ? 'Giriş' : 'Çıkış'}</span></td>
                  <td>{h.ad}</td>
                  <td className="tr" style={{ fontWeight: 700, color: h.yon === 'giris' ? 'var(--g)' : 'var(--r)' }}>
                    {h.yon === 'giris' ? '+' : '-'}₺{fmt(h.tutar)}
                  </td>
                  <td><button className="btn xs dn" onClick={() => harSil(h.id)}>🗑</button></td>
                </tr>
              ))}
              {!yukleniyor && !hareketler.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hareket yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {form.yon === 'giris' ? '+ Giriş Ekle' : '+ Çıkış Ekle'}
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fr"><label>Tarih</label>
                <input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} />
              </div>
              <div className="fr"><label>Açıklama *</label>
                <input type="text" value={form.ad || ''} onChange={e => setForm({ ...form, ad: e.target.value })} />
              </div>
              <div className="fr"><label>Tutar (₺) *</label>
                <input type="number" value={form.tutar || ''} onChange={e => setForm({ ...form, tutar: e.target.value })} min="0" step="0.01" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className={`btn ${form.yon === 'giris' ? 'gn' : 'dn'}`} onClick={harEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
