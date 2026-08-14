'use client'
import { useEffect, useState } from 'react'
import IslemlerMenu from '@/components/IslemlerMenu'
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
function fmtSayi(n: number) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n || 0)
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}
function today() { return new Date().toISOString().split('T')[0] }
function yeniFaturaNo() {
  const d = new Date()
  return `FT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`
}

interface Kalem { id: string; urun: string; miktar: number; birim: number; kdv: number }
interface Fatura {
  id: number
  fatura_no: string
  tarih: string
  cari_id: string | null
  musteri_ad: string
  musteri_adres: string | null
  musteri_vergi_no: string | null
  kalemler: Kalem[]
  ara_toplam: number
  kdv_toplam: number
  genel_toplam: number
  notlar: string | null
}

export default function Fatura() {
  const confirmAdmin = useAdminOnay()
  const [faturalar, setFaturalar] = useState<Fatura[]>([])
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [yazdirFatura, setYazdirFatura] = useState<Fatura | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [duzenlenenId, setDuzenlenenId] = useState<number | null>(null)

  const [tarih, setTarih] = useState(today())
  const [faturaNo, setFaturaNo] = useState(yeniFaturaNo())
  const [cariId, setCariId] = useState('')
  const [musteriAd, setMusteriAd] = useState('')
  const [musteriAdres, setMusteriAdres] = useState('')
  const [musteriVergiNo, setMusteriVergiNo] = useState('')
  const [notlar, setNotlar] = useState('')
  const [kalemler, setKalemler] = useState<Kalem[]>([
    { id: 'k1', urun: '', miktar: 1, birim: 0, kdv: 20 },
  ])

  async function yukle() {
    const [fRes, cRes] = await Promise.all([
      fetch('/api/faturalar', { credentials: 'include' }),
      fetch('/api/cariler', { credentials: 'include' }),
    ])
    if (fRes.ok) setFaturalar(await fRes.json())
    if (cRes.ok) setCariler(await cRes.json())
    setYukleniyor(false)
  }
  useEffect(() => { yukle() }, [])

  function modalAc() {
    setDuzenlenenId(null)
    setTarih(today())
    setFaturaNo(yeniFaturaNo())
    setCariId('')
    setMusteriAd('')
    setMusteriAdres('')
    setMusteriVergiNo('')
    setNotlar('')
    setKalemler([{ id: 'k1', urun: '', miktar: 1, birim: 0, kdv: 20 }])
    setModal(true)
  }

  function duzenleAc(f: Fatura) {
    setDuzenlenenId(f.id)
    setTarih(f.tarih)
    setFaturaNo(f.fatura_no)
    setCariId(f.cari_id || '')
    setMusteriAd(f.musteri_ad)
    setMusteriAdres(f.musteri_adres || '')
    setMusteriVergiNo(f.musteri_vergi_no || '')
    setNotlar(f.notlar || '')
    setKalemler(f.kalemler.length ? f.kalemler : [{ id: 'k1', urun: '', miktar: 1, birim: 0, kdv: 20 }])
    setModal(true)
  }

  function cariSecildi(id: string) {
    setCariId(id)
    const c = cariler.find(x => x.id === id)
    if (c) setMusteriAd(c.ad)
  }

  function kalemGuncelle(id: string, alan: keyof Kalem, deger: any) {
    setKalemler(prev => prev.map(k => k.id === id ? { ...k, [alan]: deger } : k))
  }
  function kalemEkle() {
    setKalemler(prev => [...prev, { id: 'k' + Date.now(), urun: '', miktar: 1, birim: 0, kdv: 20 }])
  }
  function kalemSil(id: string) {
    setKalemler(prev => prev.length > 1 ? prev.filter(k => k.id !== id) : prev)
  }

  const araToplam = kalemler.reduce((a, k) => a + (k.miktar || 0) * (k.birim || 0), 0)
  const kdvToplam = kalemler.reduce((a, k) => a + (k.miktar || 0) * (k.birim || 0) * ((k.kdv || 0) / 100), 0)
  const genelToplam = araToplam + kdvToplam

  async function kaydet() {
    if (!musteriAd.trim()) { alert('Müşteri adı zorunludur!'); return }
    if (!kalemler.some(k => k.urun.trim() && k.miktar > 0)) { alert('En az bir geçerli kalem giriniz!'); return }
    setKaydediliyor(true)
    const payload = {
      fatura_no: faturaNo, tarih, cari_id: cariId || null,
      musteri_ad: musteriAd, musteri_adres: musteriAdres, musteri_vergi_no: musteriVergiNo,
      kalemler, ara_toplam: araToplam, kdv_toplam: kdvToplam, genel_toplam: genelToplam,
      notlar,
    }
    if (duzenlenenId) {
      await fetch(`/api/faturalar/${duzenlenenId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/faturalar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
      })
    }
    setKaydediliyor(false)
    setModal(false)
    setDuzenlenenId(null)
    yukle()
  }

  async function sil(id: number) {
    if (!(await confirmAdmin('Bu fatura silinsin mi?'))) return
    await fetch(`/api/faturalar/${id}`, { method: 'DELETE', credentials: 'include' })
    yukle()
  }

  const sirali = siraliVeri(faturalar, sira)
  const topGenel = faturalar.reduce((a, f) => a + Number(f.genel_toplam || 0), 0)

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="sc B"><div className="l">Toplam Fatura</div><div className="v">{faturalar.length}</div><div className="s">kayıt</div></div>
        <div className="sc G"><div className="l">Toplam Tutar (KDV Dahil)</div><div className="v">₺{fmt(topGenel)}</div></div>
        <div className="sc A"><div className="l">Bu Ay</div><div className="v">{faturalar.filter(f => f.tarih?.startsWith(today().slice(0, 7))).length}</div><div className="s">fatura</div></div>
      </div>

      <div className="card">
        <div className="ch">✍️ Faturalar
          <div className="ch-actions">
            <button className="btn xs pr" onClick={modalAc}>+ Fatura Oluştur</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'fatura_no'))}>Fatura No{siraIkon(sira,'fatura_no')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'musteri_ad'))}>Müşteri{siraIkon(sira,'musteri_ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'ara_toplam'))}>Ara Toplam{siraIkon(sira,'ara_toplam')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'kdv_toplam'))}>KDV{siraIkon(sira,'kdv_toplam')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'genel_toplam'))}>Genel Toplam{siraIkon(sira,'genel_toplam')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {!yukleniyor && sirali.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Henüz fatura yok</td></tr>
              )}
              {sirali.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600, color: 'var(--b)' }}>{f.fatura_no}</td>
                  <td className="tnw">{fmtTarih(f.tarih)}</td>
                  <td>{f.musteri_ad}</td>
                  <td className="tr">₺{fmt(f.ara_toplam)}</td>
                  <td className="tr">₺{fmt(f.kdv_toplam)}</td>
                  <td className="tr" style={{ fontWeight: 700 }}>₺{fmt(f.genel_toplam)}</td>
                  <td>
                    <IslemlerMenu>
                      <IslemlerMenu.Item ikon="🖨️" onClick={() => setYazdirFatura(f)}>Görüntüle / Yazdır</IslemlerMenu.Item>
                      <IslemlerMenu.Item ikon="✏️" onClick={() => duzenleAc(f)}>Düzenle</IslemlerMenu.Item>
                      <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => sil(f.id)}>Sil</IslemlerMenu.Item>
                    </IslemlerMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fatura Oluştur Modal */}
      {modal && (
        <div className="modal-overlay" {...overlayProps(() => setModal(false))}>
          <div className="modal-box xl" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {duzenlenenId ? '✏️ Fatura Düzenle' : '✍️ Fatura Oluştur'}
              <button onClick={() => { setModal(false); setDuzenlenenId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fr"><label>Fatura No</label><input type="text" value={faturaNo} onChange={e => setFaturaNo(e.target.value)} /></div>
                <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
              </div>
              <div className="fr"><label>Cariden Seç (opsiyonel)</label>
                <select value={cariId} onChange={e => cariSecildi(e.target.value)}>
                  <option value="">— Manuel giriş —</option>
                  {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fr"><label>Müşteri Adı *</label><input type="text" value={musteriAd} onChange={e => setMusteriAd(e.target.value)} /></div>
                <div className="fr"><label>Vergi No / TC</label><input type="text" value={musteriVergiNo} onChange={e => setMusteriVergiNo(e.target.value)} /></div>
              </div>
              <div className="fr"><label>Adres</label><input type="text" value={musteriAdres} onChange={e => setMusteriAdres(e.target.value)} /></div>

              <div style={{ marginTop: 12, border: '1px solid var(--bdr)', borderRadius: 8, overflow: 'hidden' }}>
                <div className="tw">
                  <table>
                    <thead>
                      <tr><th>Ürün / Açıklama</th><th style={{ width: 90 }}>Miktar</th><th style={{ width: 110 }}>Birim (₺)</th><th style={{ width: 90 }}>KDV %</th><th className="tr" style={{ width: 110 }}>Toplam</th><th></th></tr>
                    </thead>
                    <tbody>
                      {kalemler.map(k => {
                        const satirToplam = (k.miktar || 0) * (k.birim || 0) * (1 + (k.kdv || 0) / 100)
                        return (
                          <tr key={k.id}>
                            <td><input type="text" value={k.urun} onChange={e => kalemGuncelle(k.id, 'urun', e.target.value)} placeholder="Ürün adı" style={{ width: '100%' }} /></td>
                            <td><input type="number" value={k.miktar} onChange={e => kalemGuncelle(k.id, 'miktar', Number(e.target.value))} min={0} step="0.01" style={{ width: '100%' }} /></td>
                            <td><SayiInput value={k.birim} onChange={v => kalemGuncelle(k.id, 'birim', v)} style={{ width: '100%' }} /></td>
                            <td>
                              <select value={k.kdv} onChange={e => kalemGuncelle(k.id, 'kdv', Number(e.target.value))} style={{ width: '100%' }}>
                                <option value={0}>KDV Yok</option>
                                <option value={1}>%1</option>
                                <option value={8}>%8</option>
                                <option value={10}>%10</option>
                                <option value={20}>%20</option>
                              </select>
                            </td>
                            <td className="tr" style={{ fontWeight: 600 }}>₺{fmt(satirToplam)}</td>
                            <td><button className="btn xs dn" onClick={() => kalemSil(k.id)}>🗑</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: 8, borderTop: '1px solid var(--bdr)' }}>
                  <button className="btn xs" onClick={kalemEkle}>+ Kalem Ekle</button>
                </div>
              </div>

              <div className="fr" style={{ marginTop: 10 }}><label>Notlar</label><textarea value={notlar} onChange={e => setNotlar(e.target.value)} /></div>

              <div className="fsuccess" style={{ marginTop: 10, fontSize: 13 }}>
                Ara Toplam: <b>₺{fmt(araToplam)}</b> &nbsp;|&nbsp; KDV: <b>₺{fmt(kdvToplam)}</b> &nbsp;|&nbsp; Genel Toplam: <b style={{ fontSize: 15 }}>₺{fmt(genelToplam)}</b>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setModal(false); setDuzenlenenId(null) }}>İptal</button>
              <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : (duzenlenenId ? '💾 Güncelle' : '💾 Kaydet')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Yazdırma Görünümü */}
      {yazdirFatura && <FaturaYazdirGorunumu fatura={yazdirFatura} onClose={() => setYazdirFatura(null)} />}
    </div>
  )
}

function FaturaYazdirGorunumu({ fatura, onClose }: { fatura: Fatura; onClose: () => void }) {
  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fatura-print-alan, #fatura-print-alan * { visibility: visible; }
          #fatura-print-alan { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="modal-box xl" onClick={e => e.stopPropagation()}>
        <div className="modal-head no-print">
          🖨️ Fatura Önizleme
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body" id="fatura-print-alan">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Marmara Lider Kimya</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)' }}>Fatura</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{fatura.fatura_no}</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{fmtTarih(fatura.tarih)}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16, padding: 12, background: 'var(--surf2)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>{fatura.musteri_ad}</div>
            {fatura.musteri_adres && <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{fatura.musteri_adres}</div>}
            {fatura.musteri_vergi_no && <div style={{ fontSize: 12, color: 'var(--tx2)' }}>Vergi No / TC: {fatura.musteri_vergi_no}</div>}
          </div>

          <table style={{ width: '100%' }}>
            <thead>
              <tr><th>Ürün / Açıklama</th><th className="tr">Miktar</th><th className="tr">Birim (₺)</th><th className="tr">KDV %</th><th className="tr">Toplam</th></tr>
            </thead>
            <tbody>
              {fatura.kalemler.map(k => {
                const satirToplam = (k.miktar || 0) * (k.birim || 0) * (1 + (k.kdv || 0) / 100)
                return (
                  <tr key={k.id}>
                    <td>{k.urun}</td>
                    <td className="tr">{fmtSayi(k.miktar)}</td>
                    <td className="tr">₺{fmt(k.birim)}</td>
                    <td className="tr">%{k.kdv}</td>
                    <td className="tr">₺{fmt(satirToplam)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <table style={{ width: 260 }}>
              <tbody>
                <tr><td>Ara Toplam</td><td className="tr">₺{fmt(fatura.ara_toplam)}</td></tr>
                <tr><td>KDV</td><td className="tr">₺{fmt(fatura.kdv_toplam)}</td></tr>
                <tr style={{ fontWeight: 700, fontSize: 14 }}><td>Genel Toplam</td><td className="tr">₺{fmt(fatura.genel_toplam)}</td></tr>
              </tbody>
            </table>
          </div>

          {fatura.notlar && (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--tx2)' }}><b>Not:</b> {fatura.notlar}</div>
          )}
        </div>
        <div className="modal-foot no-print">
          <button className="btn" onClick={onClose}>Kapat</button>
          <button className="btn pr" onClick={() => window.print()}>🖨️ Yazdır</button>
        </div>
      </div>
    </div>
  )
}
