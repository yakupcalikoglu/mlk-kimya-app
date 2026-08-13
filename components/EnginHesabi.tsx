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

export default function EnginHesabi() {
  const confirmAdmin = useAdminOnay()
  const [harcamalar, setHarcamalar] = useState<any[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState<'harcama'|'tahsilat'|null>(null)
  const [duzenlenen, setDuzenlenen] = useState<{ id: string; tip: 'harcama'|'tahsilat' } | null>(null)
  const [form, setForm] = useState<any>({ tarih: today() })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  async function yukle() {
    const [hRes, tRes] = await Promise.all([
      fetch('/api/engin/harcamalar', { credentials: 'include' }),
      fetch('/api/engin/tahsilatlar', { credentials: 'include' })
    ])
    if (hRes.ok) setHarcamalar(await hRes.json())
    if (tRes.ok) setTahsilatlar(await tRes.json())
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const topHarcama = harcamalar.reduce((a, h) => a + (h.tutar || 0), 0)
  const topTahsilat = tahsilatlar.reduce((a, t) => a + (t.tutar || 0), 0)
  const bakiye = topTahsilat - topHarcama

  async function ekle() {
    if (!form.tutar || !form.ad) { alert('Tutar ve açıklama girin!'); return }
    setKaydediliyor(true)
    const endpoint = modal === 'harcama' ? '/api/engin/harcamalar' : '/api/engin/tahsilatlar'
    const payload = { tarih: form.tarih, ad: form.ad, tutar: parseFloat(form.tutar) }
    if (duzenlenen) {
      await fetch(`${endpoint}/${duzenlenen.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      })
    } else {
      await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      })
    }
    await yukle()
    setModal(null)
    setDuzenlenen(null)
    setForm({ tarih: today() })
    setKaydediliyor(false)
  }

  function duzenleAc(h: any) {
    setDuzenlenen({ id: h.id, tip: h.tip })
    setForm({ tarih: h.tarih, ad: h.ad, tutar: h.tutar })
    setModal(h.tip)
  }

  async function sil(id: string, tip: 'harcama'|'tahsilat') {
    if (!(await confirmAdmin('Silinsin mi?'))) return
    await fetch(`/api/engin/${tip === 'harcama' ? 'harcamalar' : 'tahsilatlar'}/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  const tumHar = [
    ...harcamalar.map(h => ({ ...h, tip: 'harcama' })),
    ...tahsilatlar.map(t => ({ ...t, tip: 'tahsilat' }))
  ]
  const tumHarSirali = siraliVeri(tumHar, sira)

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className={`sc ${bakiye >= 0 ? 'G' : 'R'}`}>
          <div className="l">Engin Bakiye</div>
          <div className="v">{bakiye >= 0 ? '+' : '-'}₺{fmt(Math.abs(bakiye))}</div>
          <div className="s">{bakiye >= 0 ? 'Alacağımız' : 'Borcumuz'}</div>
        </div>
        <div className="sc R"><div className="l">Toplam Harcama</div><div className="v">₺{fmt(topHarcama)}</div></div>
        <div className="sc G"><div className="l">Toplam Tahsilat</div><div className="v">₺{fmt(topTahsilat)}</div></div>
      </div>

      <div className="card">
        <div className="ch">👤 Engin Hesabı
          <div className="ch-actions">
            <button className="btn xs dn" onClick={() => { setDuzenlenen(null); setModal('harcama'); setForm({ tarih: today() }) }}>+ Harcama</button>
            <button className="btn xs gn" onClick={() => { setDuzenlenen(null); setModal('tahsilat'); setForm({ tarih: today() }) }}>+ Tahsilat</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tip'))}>Tür{siraIkon(sira,'tip')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'ad'))}>Açıklama{siraIkon(sira,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tutar'))}>Tutar{siraIkon(sira,'tutar')}</th>
                <th></th>
              </tr></thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {tumHarSirali.map(h => (
                <tr key={`${h.tip}-${h.id}`}>
                  <td className="tnw">{fmtTarih(h.tarih)}</td>
                  <td><span className={`badge ${h.tip === 'tahsilat' ? 'bG' : 'bR'}`}>{h.tip === 'tahsilat' ? 'Tahsilat' : 'Harcama'}</span></td>
                  <td>{h.ad}</td>
                  <td className="tr" style={{ fontWeight: 700, color: h.tip === 'tahsilat' ? 'var(--g)' : 'var(--r)' }}>
                    {h.tip === 'tahsilat' ? '+' : '-'}₺{fmt(h.tutar)}
                  </td>
                  <td><IslemlerMenu>
                    <IslemlerMenu.Item ikon="✏️" onClick={() => duzenleAc(h)}>Düzenle</IslemlerMenu.Item>
                    <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => sil(h.id, h.tip)}>Sil</IslemlerMenu.Item>
                  </IslemlerMenu></td>
                </tr>
              ))}
              {!yukleniyor && !tumHarSirali.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hareket yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" {...overlayProps(() => { setModal(null); setDuzenlenen(null) })}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {duzenlenen ? '✏️ Düzenle' : (modal === 'harcama' ? '+ Harcama Ekle' : '+ Tahsilat Ekle')}
              <button onClick={() => { setModal(null); setDuzenlenen(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
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
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setModal(null); setDuzenlenen(null) }}>İptal</button>
              <button className={`btn ${modal === 'tahsilat' ? 'gn' : 'dn'}`} onClick={ekle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
