'use client'
import { useEffect, useState } from 'react'
import SayiInput from '@/components/SayiInput'
import { overlayProps } from '@/lib/modalOverlay'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'
import { useAdminOnay } from '@/components/AdminOnaySistemi'

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
  const confirmAdmin = useAdminOnay()
  const [uretimler, setUretimler] = useState<any[]>([])
  const [giderler, setGiderler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [seciliId, setSeciliId] = useState<number|null>(null)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [giderModal, setGiderModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null })
  const [dagitiliyor, setDagitiliyor] = useState(false)

  async function yukle() {
    const [uRes, gRes] = await Promise.all([
      fetch('/api/uretim', { credentials: 'include' }),
      fetch('/api/genel-giderler', { credentials: 'include' }),
    ])
    if (uRes.ok) setUretimler(await uRes.json())
    if (gRes.ok) setGiderler(await gRes.json())
    setYukleniyor(false)
  }
  useEffect(() => { yukle() }, [])

  const topGenelGider = giderler.reduce((a, g) => a + (g.tutar || 0), 0)

  async function giderSil(id: number) {
    if (!(await confirmAdmin('Bu gider kalemi silinsin mi?'))) return
    await fetch(`/api/genel-giderler/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  async function lotaDagit() {
    const topKgTum = uretimler.reduce((a, u) => a + (u.toplam_kg || 0), 0)
    if (topKgTum <= 0) { alert('Dağıtılacak üretim (kg) yok!'); return }
    if (!confirm(`₺${fmt(topGenelGider)} toplam genel gider, tüm lotlara ürettikleri kg oranında dağıtılacak. Devam edilsin mi?`)) return
    setDagitiliyor(true)
    await Promise.all(uretimler.map(u => {
      const pay = (u.toplam_kg / topKgTum) * topGenelGider
      return fetch(`/api/uretim/${u.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ genel_gider_payi: pay }),
      })
    }))
    await yukle()
    setDagitiliyor(false)
  }

  const topMaliyet = uretimler.reduce((a, u) => a + (u.maliyet || 0) + (u.genel_gider_payi || 0), 0)
  const topKg = uretimler.reduce((a, u) => a + (u.toplam_kg || 0), 0)
  const topBidon = uretimler.reduce((a, u) =>
    a + (u.bidonlar || []).reduce((b: number, x: any) => b + (x.adet || 0), 0), 0)

  const uretimlerZengin = uretimler.map(u => {
    const _bidon = (u.bidonlar||[]).reduce((a:number,b:any)=>a+(b.adet||0),0)
    const _toplamMaliyet = (u.maliyet || 0) + (u.genel_gider_payi || 0)
    const _kgFiyat = u.toplam_kg > 0 ? _toplamMaliyet / u.toplam_kg : 0
    return { ...u, _bidon, _kgFiyat, _toplamMaliyet }
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
        <div className="ch">🏭 Genel Üretim Giderleri
          <div className="ch-actions" style={{ gap: 8 }}>
            <button className="btn xs" onClick={lotaDagit} disabled={dagitiliyor}>{dagitiliyor ? 'Dağıtılıyor...' : '📊 Lota Dağıt'}</button>
            <button className="btn xs pr" onClick={() => setGiderModal({ open: true, data: null })}>+ Gider Ekle</button>
          </div>
        </div>
        <div className="finfo" style={{ margin: '10px 15px' }}>
          Genel giderleri lota dağıt: Kira, elektrik, personel gibi sabit giderler üretilen kg miktarına göre her lota dağıtılır.
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Dönem</th><th>Gider Adı</th><th>Kategori</th><th>Periyot</th><th className="tr">Tutar (₺)</th><th>Not</th><th></th></tr></thead>
            <tbody>
              {giderler.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Gider kalemi yok</td></tr>}
              {giderler.map((g: any) => (
                <tr key={g.id}>
                  <td>{g.donem}</td>
                  <td style={{ fontWeight: 500 }}>{g.gider_adi}</td>
                  <td>{g.kategori ? <span className="badge bB">{g.kategori}</span> : '—'}</td>
                  <td><span className="badge bX">{g.periyot}</span></td>
                  <td className="tr" style={{ fontWeight: 600 }}>₺{fmt(g.tutar)}</td>
                  <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{g.not_metin || '--'}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn xs te" onClick={() => setGiderModal({ open: true, data: g })}>✏️</button>
                      <button className="btn xs dn" onClick={() => giderSil(g.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="ch">📉 Lot Bazlı Maliyet Analizi</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'lot'))}>Lot{siraIkon(sira,'lot')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'urun'))}>Ürün{siraIkon(sira,'urun')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'maliyet'))}>Ham. Mal.{siraIkon(sira,'maliyet')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'genel_gider_payi'))}>Genel Gider Payı{siraIkon(sira,'genel_gider_payi')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_toplamMaliyet'))}>Toplam{siraIkon(sira,'_toplamMaliyet')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'toplam_kg'))}>Kg{siraIkon(sira,'toplam_kg')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_bidon'))}>Bidon{siraIkon(sira,'_bidon')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_kgFiyat'))}>₺/kg{siraIkon(sira,'_kgFiyat')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {uretimlerSirali.map(u => {
                const bidon = u._bidon
                const kgFiyat = u._kgFiyat
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--b)' }}>{u.lot}</td>
                    <td>{u.urun}</td>
                    <td className="tnw">{fmtTarih(u.tarih)}</td>
                    <td className="tr" style={{ color: 'var(--r)' }}>
                      {u.maliyet ? '₺' + fmt(u.maliyet) : <span style={{ color: 'var(--a)' }}>Girilmedi</span>}
                    </td>
                    <td className="tr" style={{ color: 'var(--p)' }}>{u.genel_gider_payi ? '₺' + fmt(u.genel_gider_payi) : '—'}</td>
                    <td className="tr" style={{ fontWeight: 700 }}>₺{fmt(u._toplamMaliyet)}</td>
                    <td className="tr">{u.toplam_kg}</td>
                    <td className="tr">{bidon}</td>
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
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Üretim kaydı yok</td></tr>
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
        <div className="modal-overlay" {...overlayProps(() => setModal(false))}>
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
                await yukle()
                setModal(false)
              }}>💾 Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {giderModal.open && (
        <GiderModal
          data={giderModal.data}
          onClose={() => setGiderModal({ open: false, data: null })}
          onSaved={yukle}
        />
      )}
    </div>
  )
}

function GiderModal({ data, onClose, onSaved }: { data: any | null; onClose: () => void; onSaved: () => void }) {
  const su = new Date()
  const [donem, setDonem] = useState(data?.donem || `${su.getFullYear()}-${String(su.getMonth() + 1).padStart(2, '0')}`)
  const [giderAdi, setGiderAdi] = useState(data?.gider_adi || '')
  const [kategori, setKategori] = useState(data?.kategori || 'KİRA')
  const [periyot, setPeriyot] = useState(data?.periyot || 'Aylık')
  const [tutar, setTutar] = useState(data?.tutar || 0)
  const [not, setNot] = useState(data?.not_metin || '')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function kaydet() {
    if (!giderAdi.trim()) { alert('Gider adı girin!'); return }
    if (!tutar) { alert('Tutar girin!'); return }
    setKaydediliyor(true)
    const url = data ? `/api/genel-giderler/${data.id}` : '/api/genel-giderler'
    await fetch(url, {
      method: data ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ donem, gider_adi: giderAdi, kategori, periyot, tutar, not_metin: not }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">{data ? 'Gider Düzenle' : '+ Gider Ekle'}<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fg2">
            <div className="fr"><label>Dönem</label><input type="text" value={donem} onChange={e => setDonem(e.target.value)} placeholder="ör: 2026-03" /></div>
            <div className="fr"><label>Periyot</label>
              <select value={periyot} onChange={e => setPeriyot(e.target.value)}>
                <option>Aylık</option><option>Yıllık</option><option>Tek Seferlik</option>
              </select>
            </div>
          </div>
          <div className="fr"><label>Gider Adı *</label><input type="text" value={giderAdi} onChange={e => setGiderAdi(e.target.value)} placeholder="ör: Fabrika Kirası" /></div>
          <div className="fg2">
            <div className="fr"><label>Kategori</label>
              <select value={kategori} onChange={e => setKategori(e.target.value)}>
                {['KİRA','ELEKTRİK','SU','PERSONEL','BAKIM','SİGORTA','DİĞER'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="fr"><label>Tutar (₺) *</label><SayiInput value={tutar} onChange={setTutar} /></div>
          </div>
          <div className="fr"><label>Not</label><input type="text" value={not} onChange={e => setNot(e.target.value)} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}
