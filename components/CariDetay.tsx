'use client'
import { useEffect, useState } from 'react'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}
function today() {
  return new Date().toISOString().split('T')[0]
}

export default function CariDetay({ cariId, onBack }: { cariId: string, onBack: () => void }) {
  const [cari, setCari] = useState<any>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState<'satis'|'tahsilat'|null>(null)
  const [form, setForm] = useState<any>({})
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function yukle() {
    const res = await fetch(`/api/cariler/${cariId}`, { credentials: 'include' })
    if (res.ok) setCari(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [cariId])

  function sonBakiye() {
    const h = cari?.hareketler || []
    return h.length ? h[h.length - 1].bakiye : 0
  }

  function topSatis() {
    return (cari?.hareketler || []).filter((h:any) => h.tur === 'satis').reduce((a:number,h:any) => a + (h.tutar||0), 0)
  }

  function topTahsilat() {
    return (cari?.hareketler || []).filter((h:any) => h.tur === 'tahsilat').reduce((a:number,h:any) => a + (h.tahsilat||0), 0)
  }

  async function harEkle() {
    setKaydediliyor(true)
    const hareketler = [...(cari.hareketler || [])]
    const id = Date.now()

    if (modal === 'satis') {
      const tutar = parseFloat(form.adet || 0) * parseFloat(form.birim || 0)
      const oncekiBak = hareketler.length ? hareketler[hareketler.length-1].bakiye : 0
      hareketler.push({
        id, tarih: form.tarih || today(), tur: 'satis',
        fatno: form.fatno || '', adet: parseFloat(form.adet||0),
        birim: parseFloat(form.birim||0), tutar,
        tahsilat: 0, bakiye: oncekiBak + tutar,
        acik: form.acik || ''
      })
    } else {
      const tahsilat = parseFloat(form.tahsilat || 0)
      const oncekiBak = hareketler.length ? hareketler[hareketler.length-1].bakiye : 0
      hareketler.push({
        id, tarih: form.tarih || today(), tur: 'tahsilat',
        fatno: '', adet: 0, birim: 0, tutar: 0,
        tahsilat, bakiye: oncekiBak - tahsilat,
        acik: form.acik || ''
      })
    }

    const res = await fetch(`/api/cariler/${cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hareketler })
    })

    if (res.ok) {
      await yukle()
      setModal(null)
      setForm({})
    }
    setKaydediliyor(false)
  }

  async function harSil(harId: number) {
    if (!confirm('Bu hareket silinsin mi?')) return
    const hareketler = (cari.hareketler || []).filter((h:any) => h.id !== harId)
    // Bakiyeleri yeniden hesapla
    let bak = 0
    hareketler.forEach((h:any) => {
      bak += (h.tutar || 0) - (h.tahsilat || 0)
      h.bakiye = bak
    })
    await fetch(`/api/cariler/${cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hareketler })
    })
    await yukle()
  }

  if (yukleniyor) return <div style={{padding:40,textAlign:'center',color:'var(--tx2)'}}>Yükleniyor...</div>
  if (!cari) return <div style={{padding:40}}>Cari bulunamadı.</div>

  const bak = sonBakiye()

  return (
    <div>
      {/* Başlık */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button className="btn" onClick={onBack}>← Geri</button>
        <h2 style={{fontSize:16,fontWeight:700,margin:0}}>{cari.ad}</h2>
      </div>

      {/* Stat kartlar */}
      <div className="sg" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className={`sc ${topSatis()>0?'B':''}`}>
          <div className="l">Toplam Satış</div>
          <div className="v">₺{fmt(topSatis())}</div>
        </div>
        <div className={`sc G`}>
          <div className="l">Tahsil Edilen</div>
          <div className="v">₺{fmt(topTahsilat())}</div>
        </div>
        <div className={`sc ${bak>0?'R':bak<0?'B':''}`}>
          <div className="l">Bakiye</div>
          <div className="v">₺{fmt(Math.abs(bak))}</div>
          {bak < 0 && <div className="s" style={{color:'var(--b)'}}>Müşteri Alacaklı</div>}
        </div>
      </div>

      {/* Hareketler */}
      <div className="card">
        <div className="ch">
          📋 Hareketler
          <div className="ch-actions">
            <button className="btn xs gn" onClick={() => { setModal('tahsilat'); setForm({tarih:today()}) }}>📥 Tahsilat</button>
            <button className="btn xs pr" onClick={() => { setModal('satis'); setForm({tarih:today()}) }}>+ Satış</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Tarih</th><th>Tür</th><th>Fatura</th>
                <th className="tr">Adet</th><th className="tr">Birim</th>
                <th className="tr">Tutar</th><th className="tr">Tahsilat</th>
                <th className="tr">Bakiye</th><th>Açıklama</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(cari.hareketler || []).slice().reverse().map((h:any) => (
                <tr key={h.id}>
                  <td className="tnw">{h.tarih}</td>
                  <td>
                    <span className={`badge ${h.tur==='satis'?'bB':h.tur==='tahsilat'?'bG':'bX'}`}>
                      {h.tur==='satis'?'Satış':h.tur==='tahsilat'?'Tahsilat':h.tur}
                    </span>
                  </td>
                  <td>{h.fatno||'—'}</td>
                  <td className="tr">{h.adet||'—'}</td>
                  <td className="tr">{h.birim?'₺'+fmt(h.birim):'—'}</td>
                  <td className="tr" style={{color:h.tutar>0?'var(--r)':'',fontWeight:600}}>
                    {h.tutar?'₺'+fmt(h.tutar):'—'}
                  </td>
                  <td className="tr" style={{color:h.tahsilat>0?'var(--g)':'',fontWeight:600}}>
                    {h.tahsilat?'₺'+fmt(h.tahsilat):'—'}
                  </td>
                  <td className="tr" style={{fontWeight:700,color:h.bakiye>0?'var(--r)':h.bakiye<0?'var(--b)':'var(--tx2)'}}>
                    ₺{fmt(Math.abs(h.bakiye||0))}
                  </td>
                  <td style={{fontSize:11,color:'var(--tx2)',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {h.acik||'—'}
                  </td>
                  <td>
                    <button className="btn xs dn" onClick={() => harSil(h.id)}>🗑</button>
                  </td>
                </tr>
              ))}
              {(!cari.hareketler?.length) && (
                <tr><td colSpan={10} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Hareket yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {modal === 'satis' ? '+ Satış Ekle' : '📥 Tahsilat Ekle'}
              <button onClick={() => setModal(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>×</button>
            </div>
            <div className="modal-body">
              <div className="fr"><label>Tarih</label>
                <input type="date" value={form.tarih||today()} onChange={e=>setForm({...form,tarih:e.target.value})} />
              </div>
              {modal === 'satis' ? <>
                <div className="fr"><label>Fatura No</label>
                  <input type="text" value={form.fatno||''} onChange={e=>setForm({...form,fatno:e.target.value})} placeholder="ör: FT-2026-001" />
                </div>
                <div className="fg2">
                  <div className="fr"><label>Adet (Bidon)</label>
                    <input type="number" value={form.adet||''} onChange={e=>setForm({...form,adet:e.target.value})} min="0" step="1" />
                  </div>
                  <div className="fr"><label>Birim Fiyat (₺)</label>
                    <input type="number" value={form.birim||''} onChange={e=>setForm({...form,birim:e.target.value})} min="0" step="0.01" />
                  </div>
                </div>
                {form.adet && form.birim && (
                  <div className="finfo">Toplam: ₺{fmt(parseFloat(form.adet)*parseFloat(form.birim))}</div>
                )}
              </> : <>
                <div className="fr"><label>Tahsilat Tutarı (₺)</label>
                  <input type="number" value={form.tahsilat||''} onChange={e=>setForm({...form,tahsilat:e.target.value})} min="0" step="0.01" />
                </div>
              </>}
              <div className="fr"><label>Açıklama</label>
                <input type="text" value={form.acik||''} onChange={e=>setForm({...form,acik:e.target.value})} placeholder="İsteğe bağlı" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(null)}>İptal</button>
              <button className="btn pr" onClick={harEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
