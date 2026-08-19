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

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}
function today() { return new Date().toISOString().split('T')[0] }

export default function OperasyonelKasa() {
  const confirmAdmin = useAdminOnay()
  const [hareketler, setHareketler] = useState<any[]>([])
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState<'tahsilat'|'odeme'|null>(null)
  const [duzenlenenId, setDuzenlenenId] = useState<string|null>(null)
  const [form, setForm] = useState<any>({})
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  async function yukle() {
    const [kRes, cRes] = await Promise.all([
      fetch('/api/kasa', { credentials: 'include' }),
      fetch('/api/cariler', { credentials: 'include' })
    ])
    if (kRes.ok) setHareketler(await kRes.json())
    if (cRes.ok) setCariler(await cRes.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const gelir = hareketler.filter(h => h.yon === 'giris').reduce((a, h) => a + (h.tutar || 0), 0)
  const gider = hareketler.filter(h => h.yon === 'cikis').reduce((a, h) => a + (h.tutar || 0), 0)
  const bakiye = gelir - gider

  async function kaydet() {
    setKaydediliyor(true)
    const tutar = parseFloat(form.tutar || 0)
    if (!tutar) { alert('Tutar girin!'); setKaydediliyor(false); return }

    const payload: any = {
      yon: duzenlenenId ? form.yon : (modal === 'tahsilat' ? 'giris' : 'cikis'),
      tarih: form.tarih || today(),
      ad: form.ad || (modal === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
      tutar,
      cari_ref: form.cariRef || null
    }

    if (duzenlenenId) {
      await fetch(`/api/kasa/${duzenlenenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      await yukle()
      setModal(null)
      setDuzenlenenId(null)
      setForm({})
      setKaydediliyor(false)
      return
    }

    // Cariye yansıt: Tahsilat'ta cari borcu azalır; Ödeme'de bir cariye
    // ödeme/iade yapılıyorsa (ör. fazla ödeme iadesi) aynı şekilde borcu azaltır.
    if (form.cariRef === 'engin') {
      // Engin Hesabı, cari sistemi dışında ayrı bir defter — kasa hareketini
      // oraya da (Tahsilat -> Engin Tahsilatı, Ödeme -> Engin Harcaması) yansıt.
      await fetch(modal === 'tahsilat' ? '/api/engin/tahsilatlar' : '/api/engin/harcamalar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tarih: payload.tarih, ad: payload.ad, tutar })
      })
    } else if (form.cariRef) {
      const c = cariler.find(x => x.id === form.cariRef)
      if (c) {
        const hareketler = [...(c.hareketler || [])]
        const oncekiBak = hareketler.length ? hareketler[hareketler.length-1].bakiye : 0
        hareketler.push({
          id: Date.now(), tarih: payload.tarih, tur: 'tahsilat',
          fatno: '', adet: 0, birim: 0, tutar: 0,
          tahsilat: tutar, bakiye: oncekiBak - tutar,
          acik: modal === 'tahsilat' ? 'Kasa tahsilatı' : 'Kasadan cariye ödeme/iade'
        })
        await fetch(`/api/cariler/${form.cariRef}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hareketler })
        })
      }
    }

    await fetch('/api/kasa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    await yukle()
    setModal(null)
    setDuzenlenenId(null)
    setForm({})
    setKaydediliyor(false)
  }

  function duzenleAc(h: any) {
    setDuzenlenenId(h.id)
    setForm({ tarih: h.tarih, ad: h.ad, tutar: h.tutar, cariRef: h.cari_ref, yon: h.yon })
    setModal(h.yon === 'giris' ? 'tahsilat' : 'odeme')
  }

  async function sil(id: string) {
    if (!(await confirmAdmin('Bu hareket silinsin mi?'))) return
    await fetch(`/api/kasa/${id}`, { method: 'DELETE' })
    await yukle()
  }

  const tumHar = (() => {
    // Satır bazlı bakiye her zaman gerçek kronolojik sırayla hesaplanır
    // (görüntüleme sıralaması ne olursa olsun bu hesap sabit kalır).
    const kronolojik = [...hareketler].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || '') || (a.id || 0) - (b.id || 0))
    let bak = 0
    const zengin = kronolojik.map(h => {
      bak += h.yon === 'giris' ? (h.tutar || 0) : -(h.tutar || 0)
      return { ...h, _bakiye: bak }
    })
    return siraliVeri(zengin, sira)
  })()

  return (
    <div>
      <div className="sg" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className={`sc ${bakiye>=0?'G':'R'}`}>
          <div className="l">Kasa Bakiyesi</div>
          <div className="v">₺{fmt(bakiye)}</div>
          <div className="s">Operasyonel</div>
        </div>
        <div className="sc G">
          <div className="l">Toplam Giriş</div>
          <div className="v">₺{fmt(gelir)}</div>
          <div className="s">{hareketler.filter(h=>h.yon==='giris').length} kayıt</div>
        </div>
        <div className="sc R">
          <div className="l">Toplam Çıkış</div>
          <div className="v">₺{fmt(gider)}</div>
          <div className="s">{hareketler.filter(h=>h.yon==='cikis').length} kayıt</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">💰 Kasa Hareketleri
          <div className="ch-actions">
            <button className="btn xs gn" onClick={() => { setDuzenlenenId(null); setModal('tahsilat'); setForm({tarih:today()}) }}>📥 Tahsilat Al</button>
            <button className="btn xs dn" onClick={() => { setDuzenlenenId(null); setModal('odeme'); setForm({tarih:today()}) }}>📤 Ödeme Yap</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'yon'))}>Yön{siraIkon(sira,'yon')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'ad'))}>Açıklama{siraIkon(sira,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tutar'))}>Tutar{siraIkon(sira,'tutar')}</th>
                <th className="tr">Bakiye</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={6} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Yükleniyor...</td></tr>}
              {tumHar.map(h => {
                const cari = cariler.find(c => c.id === h.cari_ref)
                const enginMi = h.cari_ref === 'engin'
                return (
                  <tr key={h.id}>
                    <td className="tnw">{fmtTarih(h.tarih)}</td>
                    <td>
                      <span className={`badge ${h.yon==='giris'?'bG':'bR'}`}>
                        {h.yon==='giris'?'Giriş':'Çıkış'}
                      </span>
                    </td>
                    <td>
                      {h.ad}
                      {cari && <span className="badge bB" style={{marginLeft:6,fontSize:9}}>{cari.ad.split(' ')[0]}</span>}
                      {enginMi && <span className="badge bP" style={{marginLeft:6,fontSize:9}}>Engin</span>}
                    </td>
                    <td className="tr" style={{fontWeight:700,color:h.yon==='giris'?'var(--g)':'var(--r)'}}>
                      {h.yon==='giris'?'+':'-'}₺{fmt(h.tutar)}
                    </td>
                    <td className="tr" style={{fontWeight:600,color:h._bakiye>=0?'var(--tx1)':'var(--r)'}}>₺{fmt(h._bakiye)}</td>
                    <td><IslemlerMenu>
                      <IslemlerMenu.Item ikon="✏️" onClick={() => duzenleAc(h)}>Düzenle</IslemlerMenu.Item>
                      <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => sil(h.id)}>Sil</IslemlerMenu.Item>
                    </IslemlerMenu></td>
                  </tr>
                )
              })}
              {!yukleniyor && !hareketler.length && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Hareket yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{padding:'9px 15px',background:'var(--surf2)',borderTop:'1px solid var(--bdr)',fontSize:12}}>
          Giriş: <b style={{color:'var(--g)'}}>₺{fmt(gelir)}</b> &nbsp;|&nbsp;
          Çıkış: <b style={{color:'var(--r)'}}>₺{fmt(gider)}</b> &nbsp;|&nbsp;
          <b style={{color:bakiye>=0?'var(--g)':'var(--r)'}}>Bakiye: ₺{fmt(bakiye)}</b>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" {...overlayProps(() => { setModal(null); setDuzenlenenId(null) })}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {duzenlenenId ? '✏️ Hareket Düzenle' : (modal==='tahsilat' ? '📥 Tahsilat Al' : '📤 Ödeme Yap')}
              <button onClick={() => { setModal(null); setDuzenlenenId(null) }} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>×</button>
            </div>
            <div className="modal-body">
              <div className="fr"><label>Tarih</label>
                <input type="date" value={form.tarih||today()} onChange={e=>setForm({...form,tarih:e.target.value})} />
              </div>
              {(modal === 'tahsilat' || modal === 'odeme') && (
                <div className="fr"><label>Cari Hesap {modal === 'odeme' && '(iade/fazla ödeme iadesi vb.)'}</label>
                  <select value={form.cariRef||''} onChange={e=>{
                    const val = e.target.value
                    const ad = val === 'engin'
                      ? 'Engin ' + (modal==='tahsilat'?'TAHSİLAT':'HARCAMA')
                      : (cariler.find(c=>c.id===val)?.ad || '') + (val ? (modal==='tahsilat'?' TAHSİLAT':' ÖDEME/İADE') : '')
                    setForm({...form, cariRef: val, ad})
                  }}>
                    <option value="">— Cari seçin (isteğe bağlı) —</option>
                    <option value="engin">👤 Engin Hesabı</option>
                    {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
                  </select>
                  {form.cariRef === 'engin' && (
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 3 }}>
                      ✅ Bu hareket aynı zamanda Engin Hesabı'na da ({modal==='tahsilat' ? 'Tahsilat' : 'Harcama'} olarak) işlenecek.
                    </div>
                  )}
                </div>
              )}
              <div className="fr"><label>Tutar (₺) *</label>
                <SayiInput value={parseFloat(form.tutar) || 0} onChange={v => setForm({ ...form, tutar: v })} />
              </div>
              <div className="fr"><label>Açıklama</label>
                <input type="text" value={form.ad||''} onChange={e=>setForm({...form,ad:e.target.value})}
                  placeholder={modal==='tahsilat'?'ör: Nakit tahsilat':'ör: Elektrik faturası'} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setModal(null); setDuzenlenenId(null) }}>İptal</button>
              <button className={`btn ${modal==='tahsilat'?'gn':'dn'}`} onClick={kaydet} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
