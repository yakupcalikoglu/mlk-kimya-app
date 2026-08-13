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

export default function BedelsizNumune() {
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today(), borcaDus: true })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  async function yukle() {
    const res = await fetch('/api/cariler', { credentials: 'include' })
    if (res.ok) setCariler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  // Tüm bedelsiz hareketleri topla
  const bedelsizler = cariler.flatMap(c =>
    (c.hareketler || [])
      .filter((h: any) => h.tur === 'bedelsiz_ver')
      .map((h: any) => ({ ...h, cariAd: c.ad, cariId: c.id }))
  )
  const bedelsizlerSirali = siraliVeri(bedelsizler, sira)

  const topAdet = bedelsizler.reduce((a, b) => a + (b.adet || 0), 0)
  const topTutar = bedelsizler.reduce((a, b) => a + (b.tahsilat || 0), 0)

  async function bedelsizEkle() {
    if (!form.cariId) { alert('Cari seçin!'); return }
    if (!form.adet || !form.birimFiyat) { alert('Adet ve birim fiyat girin!'); return }
    setKaydediliyor(true)

    const c = cariler.find(x => x.id === form.cariId)
    const hareketler = [...(c?.hareketler || [])]
    const oncekiBak = hareketler.length ? hareketler[hareketler.length-1].bakiye : 0
    const adet = parseInt(form.adet)
    const birimFiyat = parseFloat(form.birimFiyat)
    const tutar = adet * birimFiyat
    const yeniBak = form.borcaDus ? oncekiBak - tutar : oncekiBak

    hareketler.push({
      id: Date.now(),
      tarih: form.tarih || today(),
      tur: 'bedelsiz_ver',
      adet, birim: birimFiyat,
      fatno: form.fatno || '',
      tutar: 0,
      tahsilat: form.borcaDus ? tutar : 0,
      bakiye: yeniBak,
      acik: form.acik || 'Bedelsiz numune',
      bedBorcDus: form.borcaDus,
      bedBorcYaz: false,
      bedStoktan: true
    })

    await fetch(`/api/cariler/${form.cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hareketler })
    })

    await yukle()
    setModal(false)
    setForm({ tarih: today(), borcaDus: true })
    setKaydediliyor(false)
  }

  async function bedelsizSil(cariId: string, harId: number) {
    if (!confirm('Bu bedelsiz kayıt silinsin mi?')) return
    const c = cariler.find(x => x.id === cariId)
    let hareketler = (c?.hareketler || []).filter((h: any) => h.id !== harId)
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
        <div className="sc P">
          <div className="l">Toplam Bedelsiz</div>
          <div className="v">{topAdet}</div>
          <div className="s">bidon</div>
        </div>
        <div className="sc R">
          <div className="l">Toplam Değer</div>
          <div className="v">₺{fmt(topTutar)}</div>
          <div className="s">maliyet</div>
        </div>
        <div className="sc B">
          <div className="l">Kayıt Sayısı</div>
          <div className="v">{bedelsizler.length}</div>
          <div className="s">işlem</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">🎁 Bedelsiz Numune Kayıtları
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => { setForm({ tarih: today(), borcaDus: true }); setModal(true) }}>
              + Bedelsiz Ekle
            </button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'cariAd'))}>Cari{siraIkon(sira,'cariAd')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'adet'))}>Adet{siraIkon(sira,'adet')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'birim'))}>Birim ₺{siraIkon(sira,'birim')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tahsilat'))}>Değer{siraIkon(sira,'tahsilat')}</th>
                <th>Borçtan Düşme</th><th>Açıklama</th><th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {bedelsizlerSirali.map((b, i) => (
                <tr key={i}>
                  <td className="tnw">{fmtTarih(b.tarih)}</td>
                  <td style={{ fontWeight: 500 }}>{b.cariAd}</td>
                  <td className="tr">{b.adet}</td>
                  <td className="tr">₺{fmt(b.birim || 0)}</td>
                  <td className="tr" style={{ color: 'var(--r)', fontWeight: 600 }}>₺{fmt(b.tahsilat || 0)}</td>
                  <td>
                    <span className={`badge ${b.bedBorcDus ? 'bR' : 'bG'}`}>
                      {b.bedBorcDus ? 'Düşüldü' : 'Düşülmedi'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{b.acik || '—'}</td>
                  <td><button className="btn xs dn" onClick={() => bedelsizSil(b.cariId, b.id)}>🗑</button></td>
                </tr>
              ))}
              {!yukleniyor && !bedelsizler.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Bedelsiz kayıt yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              🎁 Bedelsiz Numune Ekle
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
                  <input type="text" value={form.fatno || ''} onChange={e => setForm({ ...form, fatno: e.target.value })} />
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Adet (Bidon) *</label>
                  <input type="number" value={form.adet || ''} onChange={e => setForm({ ...form, adet: e.target.value })} min="1" />
                </div>
                <div className="fr"><label>Birim Fiyat (₺) *</label>
                  <input type="number" value={form.birimFiyat || ''} onChange={e => setForm({ ...form, birimFiyat: e.target.value })} min="0" step="0.01" />
                </div>
              </div>
              {form.adet && form.birimFiyat && (
                <div className="finfo" style={{ marginBottom: 10 }}>
                  Değer: <b>₺{fmt(parseInt(form.adet || 0) * parseFloat(form.birimFiyat || 0))}</b>
                </div>
              )}
              <div className="fr"><label>Açıklama</label>
                <input type="text" value={form.acik || ''} onChange={e => setForm({ ...form, acik: e.target.value })} placeholder="ör: HERA BUNGOLOV BEDELSİZ" />
              </div>
              <div className="fr">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.borcaDus !== false}
                    onChange={e => setForm({ ...form, borcaDus: e.target.checked })} />
                  Cari borcundan düşülsün
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={bedelsizEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
