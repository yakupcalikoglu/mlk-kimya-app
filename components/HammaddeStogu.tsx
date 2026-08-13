'use client'
import { useEffect, useState } from 'react'
import IslemlerMenu from '@/components/IslemlerMenu'
import SayiInput from '@/components/SayiInput'
import { overlayProps } from '@/lib/modalOverlay'
import { useAdminOnay } from '@/components/AdminOnaySistemi'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n || 0)
}
function fmtTarih(t: string) {
  if (!t) return '—'
  const [y, m, d] = t.split('-')
  if (!y || !m || !d) return t
  return `${d}/${m}/${y}`
}
function today() { return new Date().toISOString().split('T')[0] }

interface Hammadde { id: number; ad: string; birim: string; guncel_stok: number; birim_fiyat: number }
interface Alim {
  id: number; hammadde_id: number; tarih: string; tedarikci: string | null
  miktar: number; birim_fiyat: number; tutar: number; kk_maliyet: number
  vade: string | null; odeme: string | null; fat_no: string | null; not_metin: string | null
}
interface Cikis {
  id: number; hammadde_id: number; tarih: string; miktar: number
  neden: string | null; not_metin: string | null
}

export default function HammaddeStogu() {
  const confirmAdmin = useAdminOnay()
  const [hammaddeler, setHammaddeler] = useState<Hammadde[]>([])
  const [alimlar, setAlimlar] = useState<Alim[]>([])
  const [cikislar, setCikislar] = useState<Cikis[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [tanimModal, setTanimModal] = useState(false)
  const [alimModal, setAlimModal] = useState<{ open: boolean; hammaddeId: number | null }>({ open: false, hammaddeId: null })
  const [cikisModal, setCikisModal] = useState<{ open: boolean; hammaddeId: number | null }>({ open: false, hammaddeId: null })

  async function yukle() {
    const [hRes, aRes, cRes] = await Promise.all([
      fetch('/api/hammadde', { credentials: 'include' }),
      fetch('/api/hammadde/alimlar', { credentials: 'include' }),
      fetch('/api/hammadde/cikislar', { credentials: 'include' }),
    ])
    if (hRes.ok) setHammaddeler(await hRes.json())
    if (aRes.ok) setAlimlar(await aRes.json())
    if (cRes.ok) setCikislar(await cRes.json())
    setYukleniyor(false)
  }
  useEffect(() => { yukle() }, [])

  async function hammaddeSil(id: number) {
    if (!(await confirmAdmin('Bu hammadde ve tüm alım/çıkış kayıtları silinsin mi?'))) return
    await fetch(`/api/hammadde/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }
  async function alimSil(id: number) {
    if (!(await confirmAdmin('Bu alım kaydı silinsin mi? Stok yeniden hesaplanacak.'))) return
    await fetch(`/api/hammadde/alimlar/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }
  async function cikisSil(id: number) {
    if (!(await confirmAdmin('Bu çıkış kaydı silinsin mi? Stok yeniden hesaplanacak.'))) return
    await fetch(`/api/hammadde/cikislar/${id}`, { method: 'DELETE', credentials: 'include' })
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn xs pr" onClick={() => setAlimModal({ open: true, hammaddeId: hammaddeler[0]?.id || null })}>+ Hammadde Alımı</button>
        <button className="btn xs" onClick={() => setTanimModal(true)}>+ Yeni Hammadde Tanımla</button>
        <button className="btn xs" onClick={() => setCikisModal({ open: true, hammaddeId: hammaddeler[0]?.id || null })}>+ Manuel Çıkış</button>
      </div>

      {yukleniyor && <div style={{ textAlign: 'center', padding: 30, color: 'var(--tx2)' }}>Yükleniyor...</div>}

      {!yukleniyor && hammaddeler.length === 0 && (
        <div className="card"><div style={{ padding: 30, textAlign: 'center', color: 'var(--tx2)' }}>Henüz hammadde tanımlanmamış</div></div>
      )}

      {hammaddeler.map(h => {
        const hAlimlar = alimlar.filter(a => a.hammadde_id === h.id).sort((a, b) => b.tarih?.localeCompare(a.tarih))
        const hCikislar = cikislar.filter(c => c.hammadde_id === h.id).sort((a, b) => b.tarih?.localeCompare(a.tarih))
        const toplamAlinan = hAlimlar.reduce((a, x) => a + Number(x.miktar || 0), 0)
        const toplamCikan = hCikislar.reduce((a, x) => a + Number(x.miktar || 0), 0)
        const durum = h.guncel_stok <= 0 ? { renk: 'var(--r)', bg: 'var(--rbg)' }
          : h.guncel_stok < 100 ? { renk: 'var(--a)', bg: 'var(--abg)' }
          : { renk: 'var(--g)', bg: 'var(--gbg)' }

        return (
          <div className="card" key={h.id} style={{ marginBottom: 16 }}>
            <div className="ch">
              <span style={{ color: durum.renk }}>●</span> {h.ad}
              <div className="ch-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Toplam Alınan: <b>{fmt(toplamAlinan)} {h.birim}</b></span>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Toplam Çıkan: <b>{fmt(toplamCikan)} {h.birim}</b></span>
                <span style={{ fontSize: 12 }}>Güncel Stok: <b style={{ color: durum.renk }}>{fmt(h.guncel_stok)} {h.birim}</b></span>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Ort. Birim Fiyat: <b>₺{fmt(h.birim_fiyat)}</b></span>
                <IslemlerMenu><IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => hammaddeSil(h.id)}>Hammaddeyi Sil</IslemlerMenu.Item></IslemlerMenu>
              </div>
            </div>

            <div style={{ padding: '10px 15px 0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>ALIM KAYITLARI</div>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th><th>Tedarikçi(s)</th><th className="tr">Miktar</th><th className="tr">Birim(₺)</th>
                      <th className="tr">Tutar</th><th className="tr">KK Maliyet</th><th>Vade</th><th>Ödeme</th><th>Fat.No</th><th>Not</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hAlimlar.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', padding: 12, color: 'var(--tx2)' }}>Alım kaydı yok</td></tr>}
                    {hAlimlar.map(a => (
                      <tr key={a.id}>
                        <td className="tnw">{fmtTarih(a.tarih)}</td>
                        <td>{a.tedarikci || '—'}</td>
                        <td className="tr">{fmt(a.miktar)} {h.birim}</td>
                        <td className="tr">₺{fmt(a.birim_fiyat)}</td>
                        <td className="tr" style={{ fontWeight: 600 }}>₺{fmt(a.tutar)}</td>
                        <td className="tr">{a.kk_maliyet ? '₺' + fmt(a.kk_maliyet) : '—'}</td>
                        <td>{a.vade || '—'}</td>
                        <td>{a.odeme || '—'}</td>
                        <td>{a.fat_no || '—'}</td>
                        <td>{a.not_metin || '—'}</td>
                        <td><IslemlerMenu><IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => alimSil(a.id)}>Sil</IslemlerMenu.Item></IslemlerMenu></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '14px 15px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>ÇIKIŞ KAYITLARI</div>
              <div className="tw">
                <table>
                  <thead><tr><th>Tarih</th><th className="tr">Miktar</th><th>Neden</th><th>Not</th><th></th></tr></thead>
                  <tbody>
                    {hCikislar.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 12, color: 'var(--tx2)' }}>Çıkış kaydı yok</td></tr>}
                    {hCikislar.map(c => (
                      <tr key={c.id}>
                        <td className="tnw">{fmtTarih(c.tarih)}</td>
                        <td className="tr" style={{ color: 'var(--r)', fontWeight: 600 }}>{fmt(c.miktar)} {h.birim}</td>
                        <td>{c.neden ? <span className="badge bB">{c.neden}</span> : '—'}</td>
                        <td>{c.not_metin || '—'}</td>
                        <td><IslemlerMenu><IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => cikisSil(c.id)}>Sil</IslemlerMenu.Item></IslemlerMenu></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })}

      {tanimModal && <TanimModal onClose={() => setTanimModal(false)} onSaved={yukle} />}
      {alimModal.open && (
        <AlimModal
          hammaddeler={hammaddeler}
          hammaddeId={alimModal.hammaddeId}
          onClose={() => setAlimModal({ open: false, hammaddeId: null })}
          onSaved={yukle}
        />
      )}
      {cikisModal.open && (
        <CikisModal
          hammaddeler={hammaddeler}
          hammaddeId={cikisModal.hammaddeId}
          onClose={() => setCikisModal({ open: false, hammaddeId: null })}
          onSaved={yukle}
        />
      )}
    </div>
  )
}

// ─── Yeni Hammadde Tanımla ─────────────────────────────
function TanimModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [ad, setAd] = useState('')
  const [birim, setBirim] = useState('kg')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function kaydet() {
    if (!ad.trim()) { alert('Hammadde adı girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/hammadde', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ ad, birim, guncel_stok: 0, birim_fiyat: 0 }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">+ Yeni Hammadde Tanımla<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fr"><label>Hammadde Adı *</label><input type="text" value={ad} onChange={e => setAd(e.target.value)} placeholder="ör: APCA" /></div>
          <div className="fr"><label>Birim</label>
            <select value={birim} onChange={e => setBirim(e.target.value)}>
              <option value="kg">kg</option><option value="lt">lt</option><option value="adet">adet</option>
            </select>
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

// ─── Hammadde Alımı ─────────────────────────────────────
function AlimModal({ hammaddeler, hammaddeId, onClose, onSaved }: {
  hammaddeler: Hammadde[]; hammaddeId: number | null; onClose: () => void; onSaved: () => void
}) {
  const [hId, setHId] = useState(hammaddeId || 0)
  const [tarih, setTarih] = useState(today())
  const [tedarikci, setTedarikci] = useState('')
  const [miktar, setMiktar] = useState(0)
  const [birimFiyat, setBirimFiyat] = useState(0)
  const [kkMaliyet, setKkMaliyet] = useState(0)
  const [vade, setVade] = useState('')
  const [odeme, setOdeme] = useState('Havale/EFT')
  const [fatNo, setFatNo] = useState('')
  const [not, setNot] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const tutar = miktar * birimFiyat

  async function kaydet() {
    if (!hId) { alert('Hammadde seçin!'); return }
    if (!miktar) { alert('Miktar girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/hammadde/alimlar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        hammadde_id: hId, tarih, tedarikci, miktar, birim_fiyat: birimFiyat, tutar,
        kk_maliyet: kkMaliyet, vade, odeme, fat_no: fatNo, not_metin: not,
      }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">+ Hammadde Alımı<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fg2">
            <div className="fr"><label>Hammadde *</label>
              <select value={hId} onChange={e => setHId(Number(e.target.value))}>
                <option value={0}>-- Seçin --</option>
                {hammaddeler.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
              </select>
            </div>
            <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
          </div>
          <div className="fr"><label>Tedarikçi</label><input type="text" value={tedarikci} onChange={e => setTedarikci(e.target.value)} /></div>
          <div className="fg2">
            <div className="fr"><label>Miktar *</label><input type="number" value={miktar} onChange={e => setMiktar(Number(e.target.value))} /></div>
            <div className="fr"><label>Birim Fiyat (₺)</label><SayiInput value={birimFiyat} onChange={setBirimFiyat} /></div>
          </div>
          <div className="finfo">Tutar: <b>₺{fmt(tutar)}</b></div>
          <div className="fg2" style={{ marginTop: 10 }}>
            <div className="fr"><label>KK Maliyet (₺)</label><SayiInput value={kkMaliyet} onChange={setKkMaliyet} /></div>
            <div className="fr"><label>Vade</label><input type="text" value={vade} onChange={e => setVade(e.target.value)} placeholder="ör: 30 gün" /></div>
          </div>
          <div className="fg2">
            <div className="fr"><label>Ödeme Şekli</label>
              <select value={odeme} onChange={e => setOdeme(e.target.value)}>
                <option>Havale/EFT</option><option>Nakit</option><option>Çek</option><option>Kredi Kartı</option>
              </select>
            </div>
            <div className="fr"><label>Fatura No</label><input type="text" value={fatNo} onChange={e => setFatNo(e.target.value)} /></div>
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

// ─── Manuel Çıkış ────────────────────────────────────────
function CikisModal({ hammaddeler, hammaddeId, onClose, onSaved }: {
  hammaddeler: Hammadde[]; hammaddeId: number | null; onClose: () => void; onSaved: () => void
}) {
  const [hId, setHId] = useState(hammaddeId || 0)
  const [tarih, setTarih] = useState(today())
  const [miktar, setMiktar] = useState(0)
  const [neden, setNeden] = useState('')
  const [not, setNot] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function kaydet() {
    if (!hId) { alert('Hammadde seçin!'); return }
    if (!miktar) { alert('Miktar girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/hammadde/cikislar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ hammadde_id: hId, tarih, miktar, neden, not_metin: not }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">+ Manuel Çıkış<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fr"><label>Hammadde *</label>
            <select value={hId} onChange={e => setHId(Number(e.target.value))}>
              <option value={0}>-- Seçin --</option>
              {hammaddeler.map(h => <option key={h.id} value={h.id}>{h.ad} (Stok: {fmt(h.guncel_stok)} {h.birim})</option>)}
            </select>
          </div>
          <div className="fg2">
            <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
            <div className="fr"><label>Miktar *</label><input type="number" value={miktar} onChange={e => setMiktar(Number(e.target.value))} /></div>
          </div>
          <div className="fr"><label>Neden</label><input type="text" value={neden} onChange={e => setNeden(e.target.value)} placeholder="ör: LOT-2026-005, Bozulma, Fire..." /></div>
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
