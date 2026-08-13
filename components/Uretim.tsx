'use client'
import { useEffect, useState } from 'react'
import IslemlerMenu from '@/components/IslemlerMenu'
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
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n || 0)
}
function today() { return new Date().toISOString().split('T')[0] }

interface Hammadde { id: number; ad: string; birim: string; guncel_stok: number; birim_fiyat: number }
interface RKalem { hammadde_id: number; yuzde: number }
interface Recete { id: number; ad: string; aciklama: string | null; standart_kg: number; kalemler: RKalem[] }

export default function Uretim() {
  const confirmAdmin = useAdminOnay()
  const [uretimler, setUretimler] = useState<any[]>([])
  const [receteler, setReceteler] = useState<Recete[]>([])
  const [hammaddeler, setHammaddeler] = useState<Hammadde[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  const [manuelModal, setManuelModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today(), bidonlar: [{ boy: 20, adet: 0 }] })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const [receteModal, setReceteModal] = useState<{ open: boolean; data: Recete | null }>({ open: false, data: null })
  const [uretModal, setUretModal] = useState<{ open: boolean; recete: Recete | null }>({ open: false, recete: null })

  async function yukle() {
    const [uRes, rRes, hRes] = await Promise.all([
      fetch('/api/uretim', { credentials: 'include' }),
      fetch('/api/receteler', { credentials: 'include' }),
      fetch('/api/hammadde', { credentials: 'include' }),
    ])
    if (uRes.ok) setUretimler(await uRes.json())
    if (rRes.ok) setReceteler(await rRes.json())
    if (hRes.ok) setHammaddeler(await hRes.json())
    setYukleniyor(false)
  }
  useEffect(() => { yukle() }, [])

  function hammaddeAd(id: number) { return hammaddeler.find(h => h.id === id)?.ad || '?' }

  const topKg = uretimler.reduce((a, u) => a + (u.toplam_kg || 0), 0)
  const topBidon = uretimler.reduce((a, u) =>
    a + (u.bidonlar || []).reduce((b: number, x: any) => b + (x.adet || 0), 0), 0)
  const topMaliyet = uretimler.reduce((a, u) => a + (u.maliyet || 0), 0)

  async function uretimEkle() {
    if (!form.lot) { alert('Lot numarası girin!'); return }
    if (!form.urun) { alert('Ürün adı girin!'); return }
    setKaydediliyor(true)
    await fetch('/api/uretim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        lot: form.lot, tarih: form.tarih || today(), urun: form.urun,
        toplam_kg: parseFloat(form.toplam_kg || 0), maliyet: parseFloat(form.maliyet || 0),
        bidonlar: form.bidonlar || [], hammaddeler: {},
      }),
    })
    await yukle()
    setManuelModal(false)
    setForm({ tarih: today(), bidonlar: [{ boy: 20, adet: 0 }] })
    setKaydediliyor(false)
  }

  async function uretimSil(id: number) {
    if (!(await confirmAdmin('Bu üretim kaydı silinsin mi? (Otomatik düşülen hammadde stoğu GERİ EKLENMEZ — gerekirse Hammadde Stoğu sayfasından ilgili çıkış kaydını da silin.)'))) return
    await fetch(`/api/uretim/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  function bidonEkle() { setForm({ ...form, bidonlar: [...(form.bidonlar || []), { boy: 20, adet: 0 }] }) }
  function bidonGuncelle(i: number, key: string, val: any) {
    const bidonlar = [...(form.bidonlar || [])]; bidonlar[i] = { ...bidonlar[i], [key]: val }; setForm({ ...form, bidonlar })
  }
  function bidonSil(i: number) { setForm({ ...form, bidonlar: form.bidonlar.filter((_: any, idx: number) => idx !== i) }) }

  async function receteSil(id: number) {
    if (!(await confirmAdmin('Bu reçete silinsin mi?'))) return
    await fetch(`/api/receteler/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc B"><div className="l">Toplam Üretim</div><div className="v">{uretimler.length}</div><div className="s">lot</div></div>
        <div className="sc G"><div className="l">Toplam Bidon</div><div className="v">{topBidon}</div><div className="s">adet</div></div>
        <div className="sc A"><div className="l">Toplam Kg</div><div className="v">{fmt(topKg)}</div><div className="s">kg</div></div>
        <div className="sc R"><div className="l">Toplam Maliyet</div><div className="v">₺{fmt(topMaliyet)}</div><div className="s">{topKg > 0 ? '₺' + fmt(topMaliyet / topKg) + '/kg' : ''}</div></div>
      </div>

      {/* Reçeteler */}
      <div className="card">
        <div className="ch">📋 Reçeteler
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => setReceteModal({ open: true, data: null })}>+ Yeni Reçete</button>
          </div>
        </div>
        <div style={{ padding: 15, display: 'grid', gap: 10 }}>
          {receteler.length === 0 && <div style={{ color: 'var(--tx2)', fontSize: 13 }}>Henüz reçete tanımlanmamış</div>}
          {receteler.map(r => (
            <div key={r.id} style={{ border: '1px solid var(--bdr)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{r.ad}</div>
                  {r.aciklama && <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{r.aciklama} — {r.standart_kg} kg/batch</div>}
                </div>
                <button className="btn xs gn" onClick={() => setUretModal({ open: true, recete: r })}>🚗 Üret</button>
                <IslemlerMenu>
                  <IslemlerMenu.Item ikon="✏️" onClick={() => setReceteModal({ open: true, data: r })}>Düzenle</IslemlerMenu.Item>
                  <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => receteSil(r.id)}>Sil</IslemlerMenu.Item>
                </IslemlerMenu>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.kalemler.map((k, i) => (
                  <span key={i} className="badge bB">
                    {hammaddeAd(k.hammadde_id)}: {fmt((r.standart_kg * k.yuzde) / 100)}kg ({k.yuzde}%)
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Üretim Kayıtları */}
      <div className="card">
        <div className="ch">⚗️ Üretim Kayıtları
          <div className="ch-actions">
            <button className="btn xs" onClick={() => setManuelModal(true)}>+ Manuel Üretim</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'lot'))}>Lot{siraIkon(sira,'lot')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'urun'))}>Ürün{siraIkon(sira,'urun')}</th>
                <th>Reçete</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_bidonTop'))}>Bidon{siraIkon(sira,'_bidonTop')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'toplam_kg'))}>Kg{siraIkon(sira,'toplam_kg')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'maliyet'))}>Maliyet{siraIkon(sira,'maliyet')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {siraliVeri(uretimler.map(u => ({ ...u, _bidonTop: (u.bidonlar||[]).reduce((a:number,b:any)=>a+(b.adet||0),0) })), sira).map(u => {
                const bidonTop = u._bidonTop
                const bidonDetay = (u.bidonlar || []).map((b: any) => `${b.adet}×${b.boy}lt`).join(', ')
                const receteAd = receteler.find(r => r.id === u.recete_id)?.ad
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--b)' }}>{u.lot}</td>
                    <td className="tnw">{fmtTarih(u.tarih)}</td>
                    <td>{u.urun}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{receteAd || '— manuel —'}</td>
                    <td className="tr">
                      <span title={bidonDetay}>{bidonTop} bidon</span>
                      {bidonDetay && <div style={{ fontSize: 10, color: 'var(--tx2)' }}>{bidonDetay}</div>}
                    </td>
                    <td className="tr">{fmt(u.toplam_kg)} kg</td>
                    <td className="tr">₺{fmt(u.maliyet || 0)}</td>
                    <td><IslemlerMenu><IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => uretimSil(u.id)}>Sil</IslemlerMenu.Item></IslemlerMenu></td>
                  </tr>
                )
              })}
              {!yukleniyor && !uretimler.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Üretim kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manuel Üretim Modal (eski davranış, stok etkisi yok) */}
      {manuelModal && (
        <div className="modal-overlay" {...overlayProps(() => setManuelModal(false))}>
          <div className="modal-box xl" onClick={e => e.stopPropagation()}>
            <div className="modal-head">⚗️ Manuel Üretim Ekle<button onClick={() => setManuelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
            <div className="modal-body">
              <div className="finfo" style={{ marginBottom: 10 }}>Bu kayıt hammadde stoğunu otomatik düşmez. Reçeteden üretim yapmak için yukarıdaki "🚗 Üret" butonunu kullanın.</div>
              <div className="fg2">
                <div className="fr"><label>Lot Numarası *</label><input type="text" value={form.lot || ''} onChange={e => setForm({ ...form, lot: e.target.value })} placeholder="ör: LOT-2026-003" /></div>
                <div className="fr"><label>Tarih</label><input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} /></div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Ürün Adı *</label><input type="text" value={form.urun || ''} onChange={e => setForm({ ...form, urun: e.target.value })} placeholder="ör: MLK Havuz Kimyasalı %35" /></div>
                <div className="fr"><label>Toplam Kg</label><input type="number" value={form.toplam_kg || ''} onChange={e => setForm({ ...form, toplam_kg: e.target.value })} min="0" step="0.01" /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🪣 Bidon Dağılımı</div>
                {(form.bidonlar || []).map((b: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <div className="fr" style={{ margin: 0, flex: 1 }}><input type="number" value={b.boy} onChange={e => bidonGuncelle(i, 'boy', parseFloat(e.target.value))} placeholder="Lt (ör: 20)" min="1" /></div>
                    <span style={{ fontSize: 12, color: 'var(--tx2)' }}>lt ×</span>
                    <div className="fr" style={{ margin: 0, flex: 1 }}><input type="number" value={b.adet} onChange={e => bidonGuncelle(i, 'adet', parseInt(e.target.value))} placeholder="Adet" min="0" /></div>
                    <button className="btn xs dn" onClick={() => bidonSil(i)} style={{ padding: '3px 7px' }}>✕</button>
                  </div>
                ))}
                <button className="btn xs" onClick={bidonEkle}>+ Bidon Boyutu Ekle</button>
              </div>
              <div className="fr"><label>Hammadde Maliyeti (₺)</label><input type="number" value={form.maliyet || ''} onChange={e => setForm({ ...form, maliyet: e.target.value })} min="0" step="0.01" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setManuelModal(false)}>İptal</button>
              <button className="btn pr" onClick={uretimEkle} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {receteModal.open && (
        <ReceteModal
          data={receteModal.data}
          hammaddeler={hammaddeler}
          onClose={() => setReceteModal({ open: false, data: null })}
          onSaved={yukle}
        />
      )}
      {uretModal.open && uretModal.recete && (
        <UretModal
          recete={uretModal.recete}
          hammaddeler={hammaddeler}
          onClose={() => setUretModal({ open: false, recete: null })}
          onSaved={yukle}
        />
      )}
    </div>
  )
}

// ─── Reçete Oluştur/Düzenle ─────────────────────────────
function ReceteModal({ data, hammaddeler, onClose, onSaved }: {
  data: Recete | null; hammaddeler: Hammadde[]; onClose: () => void; onSaved: () => void
}) {
  const [ad, setAd] = useState(data?.ad || '')
  const [aciklama, setAciklama] = useState(data?.aciklama || '')
  const [standartKg, setStandartKg] = useState(data?.standart_kg || 1000)
  const [kalemler, setKalemler] = useState<RKalem[]>(data?.kalemler?.length ? data.kalemler : [{ hammadde_id: 0, yuzde: 0 }])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const toplamYuzde = kalemler.reduce((a, k) => a + (k.yuzde || 0), 0)

  function kalemGuncelle(i: number, key: keyof RKalem, val: any) {
    const yeni = [...kalemler]; yeni[i] = { ...yeni[i], [key]: val }; setKalemler(yeni)
  }
  function kalemEkle() { setKalemler([...kalemler, { hammadde_id: 0, yuzde: 0 }]) }
  function kalemSil(i: number) { setKalemler(kalemler.length > 1 ? kalemler.filter((_, idx) => idx !== i) : kalemler) }

  async function kaydet() {
    if (!ad.trim()) { alert('Reçete adı girin!'); return }
    if (!kalemler.some(k => k.hammadde_id && k.yuzde > 0)) { alert('En az bir hammadde kalemi ekleyin!'); return }
    setKaydediliyor(true)
    const url = data ? `/api/receteler/${data.id}` : '/api/receteler'
    await fetch(url, {
      method: data ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ ad, aciklama, standart_kg: standartKg, kalemler: kalemler.filter(k => k.hammadde_id) }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">{data ? 'Reçete Düzenle' : '+ Yeni Reçete'}<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fg2">
            <div className="fr"><label>Reçete Adı *</label><input type="text" value={ad} onChange={e => setAd(e.target.value)} placeholder="ör: MLK Havuz Kimyasalı %35 (Standart)" /></div>
            <div className="fr"><label>Standart Batch (kg)</label><input type="number" value={standartKg} onChange={e => setStandartKg(Number(e.target.value))} min="1" /></div>
          </div>
          <div className="fr"><label>Açıklama</label><input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="ör: Havuz kimyasalı" /></div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>
              Hammadde Oranları — Toplam: <span style={{ color: Math.abs(toplamYuzde - 100) < 0.5 ? 'var(--g)' : 'var(--r)' }}>%{fmt(toplamYuzde)}</span>
            </div>
            {kalemler.map((k, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <select value={k.hammadde_id} onChange={e => kalemGuncelle(i, 'hammadde_id', Number(e.target.value))} style={{ flex: 2 }}>
                  <option value={0}>-- Hammadde Seç --</option>
                  {hammaddeler.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
                </select>
                <input type="number" value={k.yuzde} onChange={e => kalemGuncelle(i, 'yuzde', Number(e.target.value))} placeholder="%" style={{ flex: 1 }} min="0" step="0.01" />
                <span style={{ fontSize: 11, color: 'var(--tx2)', width: 70 }}>{fmt((standartKg * (k.yuzde || 0)) / 100)}kg</span>
                <button className="btn xs dn" onClick={() => kalemSil(i)} style={{ padding: '3px 7px' }}>✕</button>
              </div>
            ))}
            <button className="btn xs" onClick={kalemEkle}>+ Hammadde Ekle</button>
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

// ─── Reçeteden Üret ──────────────────────────────────────
function UretModal({ recete, hammaddeler, onClose, onSaved }: {
  recete: Recete; hammaddeler: Hammadde[]; onClose: () => void; onSaved: () => void
}) {
  const [hedefKg, setHedefKg] = useState(recete.standart_kg)
  const [lot, setLot] = useState('')
  const [tarih, setTarih] = useState(today())
  const [bidonlar, setBidonlar] = useState([{ boy: 20, adet: 0 }])
  const [uretiliyor, setUretiliyor] = useState(false)

  const oran = hedefKg / recete.standart_kg

  const tuketimler = recete.kalemler.map(k => {
    const h = hammaddeler.find(x => x.id === k.hammadde_id)
    const kg = (recete.standart_kg * k.yuzde / 100) * oran
    const yetersiz = h ? h.guncel_stok < kg : true
    return { hammadde: h, kg, yetersiz, birimFiyat: h?.birim_fiyat || 0 }
  })
  const toplamMaliyet = tuketimler.reduce((a, t) => a + t.kg * t.birimFiyat, 0)
  const herhangiYetersiz = tuketimler.some(t => t.yetersiz)

  function bidonEkle() { setBidonlar([...bidonlar, { boy: 20, adet: 0 }]) }
  function bidonGuncelle(i: number, key: string, val: any) {
    const yeni = [...bidonlar]; yeni[i] = { ...yeni[i], [key]: val }; setBidonlar(yeni)
  }
  function bidonSil(i: number) { setBidonlar(bidonlar.length > 1 ? bidonlar.filter((_, idx) => idx !== i) : bidonlar) }

  async function uret() {
    if (!lot.trim()) { alert('Lot numarası girin!'); return }
    if (herhangiYetersiz && !confirm('Bazı hammaddelerde yeterli stok yok. Yine de devam edilsin mi? (Stok negatife düşebilir)')) return
    setUretiliyor(true)

    const hammaddelerMap: Record<string, number> = {}
    tuketimler.forEach(t => { if (t.hammadde) hammaddelerMap[t.hammadde.id] = t.kg })

    // 1) Üretim kaydı oluştur
    await fetch('/api/uretim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        lot, tarih, urun: recete.ad, toplam_kg: hedefKg, maliyet: toplamMaliyet,
        bidonlar, hammaddeler: hammaddelerMap, recete_id: recete.id,
      }),
    })

    // 2) Her hammadde için otomatik stok çıkışı
    await Promise.all(tuketimler.filter(t => t.hammadde).map(t =>
      fetch('/api/hammadde/cikislar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hammadde_id: t.hammadde!.id, tarih, miktar: t.kg, neden: lot, not_metin: `Üretim: ${recete.ad}` }),
      })
    ))

    setUretiliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">🚗 Reçeteden Üret — {recete.ad}<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fg2">
            <div className="fr"><label>Lot Numarası *</label><input type="text" value={lot} onChange={e => setLot(e.target.value)} placeholder="ör: LOT-2026-006" /></div>
            <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
          </div>
          <div className="fr"><label>Üretilecek Miktar (kg)</label><input type="number" value={hedefKg} onChange={e => setHedefKg(Number(e.target.value))} min="1" /></div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Otomatik Düşülecek Hammaddeler</div>
            <div className="tw">
              <table>
                <thead><tr><th>Hammadde</th><th className="tr">Gerekli</th><th className="tr">Mevcut Stok</th><th className="tr">Maliyet</th><th>Durum</th></tr></thead>
                <tbody>
                  {tuketimler.map((t, i) => (
                    <tr key={i}>
                      <td>{t.hammadde?.ad || '⚠️ bulunamadı'}</td>
                      <td className="tr">{fmt(t.kg)} {t.hammadde?.birim}</td>
                      <td className="tr">{t.hammadde ? fmt(t.hammadde.guncel_stok) + ' ' + t.hammadde.birim : '—'}</td>
                      <td className="tr">₺{fmt(t.kg * t.birimFiyat)}</td>
                      <td>{t.yetersiz ? <span className="badge bR">Yetersiz</span> : <span className="badge bG">Yeterli</span>}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}><td colSpan={3}>Toplam Maliyet</td><td className="tr">₺{fmt(toplamMaliyet)}</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🪣 Bidon Dağılımı</div>
            {bidonlar.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <div className="fr" style={{ margin: 0, flex: 1 }}><input type="number" value={b.boy} onChange={e => bidonGuncelle(i, 'boy', parseFloat(e.target.value))} placeholder="Lt" min="1" /></div>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>lt ×</span>
                <div className="fr" style={{ margin: 0, flex: 1 }}><input type="number" value={b.adet} onChange={e => bidonGuncelle(i, 'adet', parseInt(e.target.value))} placeholder="Adet" min="0" /></div>
                <button className="btn xs dn" onClick={() => bidonSil(i)} style={{ padding: '3px 7px' }}>✕</button>
              </div>
            ))}
            <button className="btn xs" onClick={bidonEkle}>+ Bidon Boyutu Ekle</button>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={uret} disabled={uretiliyor}>{uretiliyor ? 'Üretiliyor...' : '🚗 Üret ve Stoktan Düş'}</button>
        </div>
      </div>
    </div>
  )
}
