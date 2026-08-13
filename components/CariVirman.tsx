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

export default function CariVirman() {
  const [cariler, setCariler] = useState<any[]>([])
  const [virmanlar, setVirmanlar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today() })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  async function yukle() {
    const [cRes, vRes] = await Promise.all([
      fetch('/api/cariler', { credentials: 'include' }),
      fetch('/api/virman', { credentials: 'include' })
    ])
    if (cRes.ok) setCariler(await cRes.json())
    if (vRes.ok) setVirmanlar(await vRes.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  function cariAd(id: string) {
    return cariler.find(c => c.id === id)?.ad || id
  }

  function sonBakiye(cariId: string) {
    const c = cariler.find(x => x.id === cariId)
    const h = c?.hareketler || []
    return h.length ? h[h.length - 1].bakiye : 0
  }

  async function virmanYap() {
    if (!form.kaynakId || !form.hedefId) { alert('Kaynak ve hedef cari seçin!'); return }
    if (form.kaynakId === form.hedefId) { alert('Kaynak ve hedef aynı olamaz!'); return }
    if (!form.adet || !form.birimFiyat) { alert('Adet ve birim fiyat girin!'); return }
    setKaydediliyor(true)

    const adet = parseInt(form.adet)
    const birimFiyat = parseFloat(form.birimFiyat)
    const tutar = adet * birimFiyat
    const tarih = form.tarih || today()
    const acik = form.acik || ''

    // Kaynak cariden düş
    const kaynak = cariler.find(c => c.id === form.kaynakId)
    const kaynakHar = [...(kaynak?.hareketler || [])]
    const kaynakBak = kaynakHar.length ? kaynakHar[kaynakHar.length-1].bakiye : 0
    kaynakHar.push({
      id: Date.now(), tarih, tur: 'virman_cikis',
      adet, birim: birimFiyat, tutar: 0,
      tahsilat: tutar, bakiye: kaynakBak - tutar,
      acik: `Virman → ${cariAd(form.hedefId)}${acik ? ' — ' + acik : ''}`
    })

    // Hedef cariye ekle
    const hedef = cariler.find(c => c.id === form.hedefId)
    const hedefHar = [...(hedef?.hareketler || [])]
    const hedefBak = hedefHar.length ? hedefHar[hedefHar.length-1].bakiye : 0
    hedefHar.push({
      id: Date.now() + 1, tarih, tur: 'virman_giris',
      adet, birim: birimFiyat, tutar,
      tahsilat: 0, bakiye: hedefBak + tutar,
      acik: `Virman ← ${cariAd(form.kaynakId)}${acik ? ' — ' + acik : ''}`
    })

    // İkisini de güncelle
    await Promise.all([
      fetch(`/api/cariler/${form.kaynakId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hareketler: kaynakHar })
      }),
      fetch(`/api/cariler/${form.hedefId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hareketler: hedefHar })
      })
    ])

    // Virman kaydını da sakla
    await fetch('/api/virman', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ tarih, kaynak_id: form.kaynakId, hedef_id: form.hedefId, adet, birim_fiyat: birimFiyat, tutar, acik })
    })

    await yukle()
    setModal(false)
    setForm({ tarih: today() })
    setKaydediliyor(false)
  }

  async function virmanSil(v: any) {
    if (!confirm('Bu virman silinsin mi? Cari hareketlerinden de kaldırılacak.')) return

    // Kaynak cariden geri al
    const kaynak = cariler.find(c => c.id === v.kaynak_id)
    if (kaynak) {
      let har = (kaynak.hareketler || []).filter((h: any) =>
        !(h.tur === 'virman_cikis' && h.tarih === v.tarih && h.tahsilat === v.tutar)
      )
      let bak = 0
      har = har.map((h: any) => { bak += (h.tutar||0)-(h.tahsilat||0); return {...h, bakiye: bak} })
      await fetch(`/api/cariler/${v.kaynak_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hareketler: har })
      })
    }

    // Hedef cariden geri al
    const hedef = cariler.find(c => c.id === v.hedef_id)
    if (hedef) {
      let har = (hedef.hareketler || []).filter((h: any) =>
        !(h.tur === 'virman_giris' && h.tarih === v.tarih && h.tutar === v.tutar)
      )
      let bak = 0
      har = har.map((h: any) => { bak += (h.tutar||0)-(h.tahsilat||0); return {...h, bakiye: bak} })
      await fetch(`/api/cariler/${v.hedef_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hareketler: har })
      })
    }

    await fetch(`/api/virman/${v.id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  return (
    <div>
      <div className="card">
        <div className="ch">🔄 Cari Virman
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => { setForm({ tarih: today() }); setModal(true) }}>
              + Yeni Virman
            </button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'kaynak_id'))}>Kaynak{siraIkon(sira,'kaynak_id')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'hedef_id'))}>Hedef{siraIkon(sira,'hedef_id')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'adet'))}>Adet{siraIkon(sira,'adet')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'birim_fiyat'))}>Birim{siraIkon(sira,'birim_fiyat')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tutar'))}>Tutar{siraIkon(sira,'tutar')}</th>
                <th>Not</th><th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {siraliVeri(virmanlar, sira).map(v => (
                <tr key={v.id}>
                  <td className="tnw">{fmtTarih(v.tarih)}</td>
                  <td style={{ color: 'var(--r)', fontWeight: 500 }}>{cariAd(v.kaynak_id)}</td>
                  <td style={{ color: 'var(--g)', fontWeight: 500 }}>{cariAd(v.hedef_id)}</td>
                  <td className="tr">{v.adet}</td>
                  <td className="tr">₺{fmt(v.birim_fiyat)}</td>
                  <td className="tr" style={{ fontWeight: 700 }}>₺{fmt(v.tutar)}</td>
                  <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{v.acik || '—'}</td>
                  <td><button className="btn xs dn" onClick={() => virmanSil(v)}>🗑</button></td>
                </tr>
              ))}
              {!yukleniyor && !virmanlar.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Virman yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              🔄 Cari Virman
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="finfo" style={{ marginBottom: 12 }}>
                Bir carinin alacağını başka bir cariye aktarır.
              </div>
              <div className="fg2">
                <div className="fr"><label>Kaynak Cari (Alacaklı) *</label>
                  <select value={form.kaynakId || ''} onChange={e => setForm({ ...form, kaynakId: e.target.value })}>
                    <option value="">— Seçin —</option>
                    {cariler.map(c => (
                      <option key={c.id} value={c.id}>{c.ad} (₺{fmt(sonBakiye(c.id))})</option>
                    ))}
                  </select>
                </div>
                <div className="fr"><label>Hedef Cari *</label>
                  <select value={form.hedefId || ''} onChange={e => setForm({ ...form, hedefId: e.target.value })}>
                    <option value="">— Seçin —</option>
                    {cariler.filter(c => c.id !== form.kaynakId).map(c => (
                      <option key={c.id} value={c.id}>{c.ad}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Tarih</label>
                  <input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} />
                </div>
                <div className="fr"><label>Adet (Bidon) *</label>
                  <input type="number" value={form.adet || ''} onChange={e => setForm({ ...form, adet: e.target.value })} min="1" step="1" />
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Birim Fiyat (₺) *</label>
                  <input type="number" value={form.birimFiyat || ''} onChange={e => setForm({ ...form, birimFiyat: e.target.value })} min="0" step="0.01" />
                </div>
                <div className="fr"><label>Toplam</label>
                  <input type="text" readOnly value={form.adet && form.birimFiyat ? '₺' + fmt(parseInt(form.adet) * parseFloat(form.birimFiyat)) : '—'}
                    style={{ background: 'var(--surf2)', color: 'var(--tx2)' }} />
                </div>
              </div>
              <div className="fr"><label>Not</label>
                <input type="text" value={form.acik || ''} onChange={e => setForm({ ...form, acik: e.target.value })} placeholder="İsteğe bağlı" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={virmanYap} disabled={kaydediliyor}>
                {kaydediliyor ? 'İşleniyor...' : '🔄 Virman Yap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
