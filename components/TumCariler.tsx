'use client'
import { useEffect, useState } from 'react'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'
import { overlayProps } from '@/lib/modalOverlay'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

function idOner(ad: string) {
  const tr: Record<string, string> = { ç:'c', Ç:'c', ğ:'g', Ğ:'g', ı:'i', İ:'i', ö:'o', Ö:'o', ş:'s', Ş:'s', ü:'u', Ü:'u' }
  return ad
    .split('').map(ch => tr[ch] ?? ch).join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30)
}

export default function TumCariler({ onCariSec }: { onCariSec: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aramaKelime, setAramaKelime] = useState('')
  const [sira, setSira] = useState<SiraState>({ alan: 'ad', yon: 'asc' })
  const [modal, setModal] = useState(false)
  const [yeniAd, setYeniAd] = useState('')
  const [yeniId, setYeniId] = useState('')
  const [idElleDegisti, setIdElleDegisti] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function yukle() {
    const res = await fetch('/api/cariler', { credentials: 'include' })
    const d = await res.json()
    if (Array.isArray(d)) setCariler(d)
    setYukleniyor(false)
  }
  useEffect(() => { yukle() }, [])

  function sonBakiye(c: any) {
    const h = c.hareketler || []
    return h.length ? h[h.length-1].bakiye : 0
  }

  function topSatis(c: any) {
    return (c.hareketler||[]).filter((h:any)=>h.tur==='satis').reduce((a:number,h:any)=>a+(h.tutar||0),0)
  }

  function topTahsilat(c: any) {
    return (c.hareketler||[]).filter((h:any)=>h.tur==='tahsilat').reduce((a:number,h:any)=>a+(h.tahsilat||0),0)
  }

  const filtre = cariler
    .filter(c => c.ad?.toLowerCase().includes(aramaKelime.toLowerCase()))
    .map(c => ({ ...c, _satis: topSatis(c), _tahsilat: topTahsilat(c), _bakiye: sonBakiye(c) }))
  const gosterilecek = siraliVeri(filtre, sira)

  function modalAc() {
    setYeniAd('')
    setYeniId('')
    setIdElleDegisti(false)
    setHata('')
    setModal(true)
  }

  function adDegisti(v: string) {
    setYeniAd(v)
    if (!idElleDegisti) setYeniId(idOner(v))
  }

  async function cariEkle() {
    if (!yeniAd.trim()) { setHata('Cari adı girin!'); return }
    if (!yeniId.trim()) { setHata('Cari kodu (id) girin!'); return }
    if (cariler.some(c => c.id === yeniId.trim())) { setHata('Bu kod zaten kullanılıyor, farklı bir kod seçin.'); return }
    setHata('')
    setKaydediliyor(true)
    const res = await fetch('/api/cariler', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ id: yeniId.trim(), ad: yeniAd.trim(), tip: 'musteri', hareketler: [] }),
    })
    setKaydediliyor(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setHata(d.error || 'Cari eklenemedi')
      return
    }
    setModal(false)
    await yukle()
  }

  return (
    <div>
      <div style={{marginBottom:12, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
        <input type="text" placeholder="Cari ara..." value={aramaKelime}
          onChange={e=>setAramaKelime(e.target.value)}
          style={{padding:'7px 12px',border:'1px solid var(--bdr)',borderRadius:6,width:'100%',maxWidth:320,fontSize:13}} />
        <button className="btn xs pr" onClick={modalAc}>+ Yeni Cari Ekle</button>
      </div>
      <div className="card">
        <div className="ch">👥 Tüm Cariler
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--tx2)'}}>{cariler.length} kayıt</span>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, 'ad'))}>Cari Adı{siraIkon(sira,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, '_satis'))}>Toplam Satış{siraIkon(sira,'_satis')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, '_tahsilat'))}>Tahsilat{siraIkon(sira,'_tahsilat')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, '_bakiye'))}>Bakiye{siraIkon(sira,'_bakiye')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={5} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Yükleniyor...</td></tr>}
              {!yukleniyor && !gosterilecek.length && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Cari yok</td></tr>
              )}
              {gosterilecek.map(c => {
                const bak = c._bakiye
                return (
                  <tr key={c.id} style={{cursor:'pointer'}} onClick={() => onCariSec(c.id)}>
                    <td style={{fontWeight:500}}>{c.ad}</td>
                    <td className="tr">₺{fmt(c._satis)}</td>
                    <td className="tr" style={{color:'var(--g)'}}>₺{fmt(c._tahsilat)}</td>
                    <td className="tr" style={{fontWeight:700,color:bak>0?'var(--r)':bak<0?'var(--b)':'var(--tx2)'}}>
                      ₺{fmt(Math.abs(bak))}
                      {bak<0 && <span style={{fontSize:10,marginLeft:4,color:'var(--b)'}}>↩</span>}
                    </td>
                    <td><button className="btn xs pr">Detay →</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" {...overlayProps(() => setModal(false))}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">+ Yeni Cari Ekle<button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
            <div className="modal-body">
              <div className="fr"><label>Cari Adı *</label>
                <input type="text" value={yeniAd} onChange={e => adDegisti(e.target.value)} placeholder="ör: ABC İnşaat Ltd. Şti." autoFocus />
              </div>
              <div className="fr"><label>Cari Kodu (benzersiz, sistemde kullanılacak kısa kod)</label>
                <input type="text" value={yeniId} onChange={e => { setYeniId(e.target.value); setIdElleDegisti(true) }} placeholder="ör: abc_insaat" />
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 3 }}>İsimden otomatik önerilir, isterseniz değiştirebilirsiniz.</div>
              </div>
              {hata && <div style={{ color: 'var(--r)', fontSize: 12, marginTop: 6 }}>{hata}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={cariEkle} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
