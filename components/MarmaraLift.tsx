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

export default function MarmaraLift() {
  const confirmAdmin = useAdminOnay()
  const [hareketler, setHareketler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState<string|null>(null)
  const [form, setForm] = useState<any>({ tarih: today() })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [filtreKategori, setFiltreKategori] = useState('')

  async function yukle() {
    const res = await fetch('/api/marmara-lift', { credentials: 'include' })
    if (res.ok) setHareketler(await res.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const topGelir = hareketler.filter(h => h.yon === 'giris').reduce((a, h) => a + (h.tutar || 0), 0)
  const topGider = hareketler.filter(h => h.yon === 'cikis').reduce((a, h) => a + (h.tutar || 0), 0)
  const bakiye = topGelir - topGider

  async function harEkle() {
    if (!form.tutar || !form.ad) { alert('Tutar ve açıklama girin!'); return }
    setKaydediliyor(true)
    const payload = { tarih: form.tarih, ad: form.ad, tutar: parseFloat(form.tutar), yon: form.yon || 'giris', kategori: form.kategori || 'DİĞER' }
    if (duzenlenenId) {
      await fetch(`/api/marmara-lift/${duzenlenenId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      })
    } else {
      await fetch('/api/marmara-lift', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      })
    }
    await yukle()
    setModal(false)
    setDuzenlenenId(null)
    setForm({ tarih: today() })
    setKaydediliyor(false)
  }

  function duzenleAc(h: any) {
    setDuzenlenenId(h.id)
    setForm({ tarih: h.tarih, ad: h.ad, tutar: h.tutar, yon: h.yon, kategori: h.kategori })
    setModal(true)
  }

  async function harSil(id: string) {
    if (!(await confirmAdmin('Silinsin mi?'))) return
    await fetch(`/api/marmara-lift/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className={`sc ${bakiye >= 0 ? 'G' : 'R'}`}>
          <div className="l">Marmara Lift Bakiye</div>
          <div className="v">₺{fmt(Math.abs(bakiye))}</div>
          <div className="s">{bakiye >= 0 ? 'Alacağımız' : 'Borcumuz'}</div>
        </div>
        <div className="sc G"><div className="l">Toplam Giriş</div><div className="v">₺{fmt(topGelir)}</div></div>
        <div className="sc R"><div className="l">Toplam Çıkış</div><div className="v">₺{fmt(topGider)}</div></div>
      </div>

      <div className="card">
        <div className="ch">🏢 Marmara Lift Hareketleri
          <div className="ch-actions" style={{ gap: 8 }}>
            <select value={filtreKategori} onChange={e => setFiltreKategori(e.target.value)}>
              <option value="">Tüm Kategoriler</option>
              {['KİRA','NAKLİYE','HAMMADDE','DEMİRBAŞ','AMBALAJ','BAKIM','MARKA','İADE','DİĞER'].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <button className="btn xs gn" onClick={() => { setDuzenlenenId(null); setForm({ tarih: today(), yon: 'giris', kategori: 'DİĞER' }); setModal(true) }}>+ Giriş</button>
            <button className="btn xs dn" onClick={() => { setDuzenlenenId(null); setForm({ tarih: today(), yon: 'cikis', kategori: 'DİĞER' }); setModal(true) }}>+ Çıkış</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'yon'))}>Yön{siraIkon(sira,'yon')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'ad'))}>Açıklama{siraIkon(sira,'ad')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'kategori'))}>Kategori{siraIkon(sira,'kategori')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tutar'))}>Tutar{siraIkon(sira,'tutar')}</th>
                <th></th>
              </tr></thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {siraliVeri(filtreKategori ? hareketler.filter(h => h.kategori === filtreKategori) : hareketler, sira).map(h => (
                <tr key={h.id}>
                  <td className="tnw">{fmtTarih(h.tarih)}</td>
                  <td><span className={`badge ${h.yon === 'giris' ? 'bG' : 'bR'}`}>{h.yon === 'giris' ? 'Giriş' : 'Çıkış'}</span></td>
                  <td>{h.ad}</td>
                  <td>{h.kategori ? <span className="badge bX">{h.kategori}</span> : '—'}</td>
                  <td className="tr" style={{ fontWeight: 700, color: h.yon === 'giris' ? 'var(--g)' : 'var(--r)' }}>
                    {h.yon === 'giris' ? '+' : '-'}₺{fmt(h.tutar)}
                  </td>
                  <td><IslemlerMenu>
                    <IslemlerMenu.Item ikon="✏️" onClick={() => duzenleAc(h)}>Düzenle</IslemlerMenu.Item>
                    <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => harSil(h.id)}>Sil</IslemlerMenu.Item>
                  </IslemlerMenu></td>
                </tr>
              ))}
              {!yukleniyor && !hareketler.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hareket yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" {...overlayProps(() => { setModal(false); setDuzenlenenId(null) })}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {duzenlenenId ? '✏️ Hareket Düzenle' : (form.yon === 'giris' ? '+ Giriş Ekle' : '+ Çıkış Ekle')}
              <button onClick={() => { setModal(false); setDuzenlenenId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fr"><label>Tarih</label>
                <input type="date" value={form.tarih || today()} onChange={e => setForm({ ...form, tarih: e.target.value })} />
              </div>
              <div className="fr"><label>Açıklama *</label>
                <input type="text" value={form.ad || ''} onChange={e => setForm({ ...form, ad: e.target.value })} />
              </div>
              <div className="fr"><label>Tutar (₺) *</label>
                <SayiInput value={parseFloat(form.tutar) || 0} onChange={v => setForm({ ...form, tutar: v })} />
              </div>
              <div className="fr"><label>Kategori</label>
                <select value={form.kategori || 'DİĞER'} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                  {['KİRA','NAKLİYE','HAMMADDE','DEMİRBAŞ','AMBALAJ','BAKIM','MARKA','İADE','DİĞER'].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setModal(false); setDuzenlenenId(null) }}>İptal</button>
              <button className={`btn ${form.yon === 'giris' ? 'gn' : 'dn'}`} onClick={harEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
