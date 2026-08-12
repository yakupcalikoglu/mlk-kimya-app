'use client'
import { useEffect, useState } from 'react'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}
function today() { return new Date().toISOString().split('T')[0] }

export default function SermayeOdemeleri() {
  const [odemeler, setOdemeler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today(), tur: 'giris' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function yukle() {
    const res = await fetch('/api/sermaye', { credentials: 'include' })
    if (res.ok) setOdemeler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const topGiris = odemeler.filter(o => o.tur === 'giris').reduce((a, o) => a + (o.tutar || 0), 0)
  const topCikis = odemeler.filter(o => o.tur === 'cikis').reduce((a, o) => a + (o.tutar || 0), 0)
  const netSermaye = topGiris - topCikis

  async function ekle() {
    if (!form.tutar || !form.ad) { alert('Tutar ve açıklama girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/sermaye', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        tarih: form.tarih || today(),
        ad: form.ad,
        tutar: parseFloat(form.tutar),
        tur: form.tur || 'giris',
        acik: form.acik || ''
      })
    })
    await yukle()
    setModal(false)
    setForm({ tarih: today(), tur: 'giris' })
    setKaydediliyor(false)
  }

  async function sil(id: number) {
    if (!confirm('Bu kayıt silinsin mi?')) return
    await fetch(`/api/sermaye/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  const sirali = [...odemeler].sort((a, b) => b.tarih?.localeCompare(a.tarih))

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className={`sc ${netSermaye >= 0 ? 'G' : 'R'}`}>
          <div className="l">Net Sermaye</div>
          <div className="v">₺{fmt(netSermaye)}</div>
          <div className="s">{netSermaye >= 0 ? 'Ödenen' : 'Borç'}</div>
        </div>
        <div className="sc G">
          <div className="l">Toplam Giriş</div>
          <div className="v">₺{fmt(topGiris)}</div>
          <div className="s">{odemeler.filter(o => o.tur === 'giris').length} kayıt</div>
        </div>
        <div className="sc R">
          <div className="l">Toplam Çıkış</div>
          <div className="v">₺{fmt(topCikis)}</div>
          <div className="s">{odemeler.filter(o => o.tur === 'cikis').length} kayıt</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">💼 Sermaye Ödemeleri
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => { setForm({ tarih: today(), tur: 'giris' }); setModal(true) }}>
              + Ekle
            </button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th className="tr">Tutar</th><th className="tr">Kalan</th><th></th></tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {(() => {
                let kalan = 0
                return sirali.map(o => {
                  kalan += o.tur === 'giris' ? o.tutar : -o.tutar
                  return (
                    <tr key={o.id}>
                      <td className="tnw">{o.tarih}</td>
                      <td><span className={`badge ${o.tur === 'giris' ? 'bG' : 'bR'}`}>{o.tur === 'giris' ? 'Giriş' : 'Çıkış'}</span></td>
                      <td>{o.ad}{o.acik && <span style={{ fontSize: 11, color: 'var(--tx2)', marginLeft: 6 }}>{o.acik}</span>}</td>
                      <td className="tr" style={{ fontWeight: 700, color: o.tur === 'giris' ? 'var(--g)' : 'var(--r)' }}>
                        {o.tur === 'giris' ? '+' : '-'}₺{fmt(o.tutar)}
                      </td>
                      <td className="tr" style={{ color: kalan >= 0 ? 'var(--g)' : 'var(--r)' }}>₺{fmt(kalan)}</td>
                      <td><button className="btn xs dn" onClick={() => sil(o.id)}>🗑</button></td>
                    </tr>
                  )
                })
              })()}
              {!yukleniyor && !odemeler.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Kayıt yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              + Sermaye Kaydı
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fr"><label>Tarih</label>
                  <input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} />
                </div>
                <div className="fr"><label>Tür</label>
                  <select value={form.tur || 'giris'} onChange={e => setForm({ ...form, tur: e.target.value })}>
                    <option value="giris">Giriş (Sermaye Eklendi)</option>
                    <option value="cikis">Çıkış (Sermaye Alındı)</option>
                  </select>
                </div>
              </div>
              <div className="fr"><label>Açıklama *</label>
                <input type="text" value={form.ad || ''} onChange={e => setForm({ ...form, ad: e.target.value })} placeholder="ör: Uğur sermaye ödemesi" />
              </div>
              <div className="fr"><label>Tutar (₺) *</label>
                <input type="number" value={form.tutar || ''} onChange={e => setForm({ ...form, tutar: e.target.value })} min="0" step="0.01" />
              </div>
              <div className="fr"><label>Not</label>
                <input type="text" value={form.acik || ''} onChange={e => setForm({ ...form, acik: e.target.value })} placeholder="İsteğe bağlı" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={ekle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
