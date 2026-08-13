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
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n || 0)
}
function today() { return new Date().toISOString().split('T')[0] }

const TUR_ETIKET: Record<string, string> = {
  satis: 'Satış', tahsilat: 'Tahsilat',
  virman_giris: 'Virman Giriş', virman_cikis: 'Virman Çıkış',
  bedelsiz_ver: 'Bedelsiz',
}

export default function TumHareketler({ onCariSec }: { onCariSec?: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [kasa, setKasa] = useState<any[]>([])
  const [ml, setMl] = useState<any[]>([])
  const [enginHar, setEnginHar] = useState<any[]>([])
  const [enginTah, setEnginTah] = useState<any[]>([])
  const [sermayeOdeme, setSermayeOdeme] = useState<any[]>([])
  const [sermayeIade, setSermayeIade] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifSekme, setAktifSekme] = useState<'tumü'|'kasa'|'cari'|'mlift'|'engin'|'sermaye'>('tumü')
  const [filtreCari, setFiltreCari] = useState('')
  const [filtreBaslangic, setFiltreBaslangic] = useState('')
  const [filtreBitis, setFiltreBitis] = useState('')
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [ekleModal, setEkleModal] = useState<{ open: boolean; yon: 'giris'|'cikis' }>({ open: false, yon: 'giris' })

  async function yukle() {
    const [cRes, kRes, mlRes, ehRes, etRes, soRes, siRes] = await Promise.all([
      fetch('/api/cariler', { credentials: 'include' }),
      fetch('/api/kasa', { credentials: 'include' }),
      fetch('/api/marmara-lift', { credentials: 'include' }),
      fetch('/api/engin/harcamalar', { credentials: 'include' }),
      fetch('/api/engin/tahsilatlar', { credentials: 'include' }),
      fetch('/api/sermaye/odemeler', { credentials: 'include' }),
      fetch('/api/sermaye/iadeler', { credentials: 'include' }),
    ])
    if (cRes.ok) setCariler(await cRes.json())
    if (kRes.ok) setKasa(await kRes.json())
    if (mlRes.ok) setMl(await mlRes.json())
    if (ehRes.ok) setEnginHar(await ehRes.json())
    if (etRes.ok) setEnginTah(await etRes.json())
    if (soRes.ok) setSermayeOdeme(await soRes.json())
    if (siRes.ok) setSermayeIade(await siRes.json())
    setYukleniyor(false)
  }
  useEffect(() => { yukle() }, [])

  const cariHareketler = cariler.flatMap(c =>
    (c.hareketler || []).map((h: any) => ({ ...h, kaynak: 'cari', cariAd: c.ad, cariId: c.id }))
  )
  const kasaHareketler = kasa.map(h => ({ ...h, kaynak: 'kasa' }))
  const mlHareketler = ml.map((h: any) => ({ ...h, kaynak: 'mlift' }))
  const enginHareketler = [
    ...enginHar.map((h: any) => ({ ...h, kaynak: 'engin', yon: 'cikis', tip: 'Harcama' })),
    ...enginTah.map((h: any) => ({ ...h, kaynak: 'engin', yon: 'giris', tip: 'Tahsilat' })),
  ]
  const sermayeHareketler = [
    ...sermayeOdeme.map((h: any) => ({ ...h, kaynak: 'sermaye', yon: 'giris', tip: 'Ödeme', ad: `${h.ortak_ad} — ${h.aciklama || 'Sermaye ödemesi'}` })),
    ...sermayeIade.map((h: any) => ({ ...h, kaynak: 'sermaye', yon: 'cikis', tip: 'İade/Mahsup', ad: `${h.ortak_ad} — ${h.aciklama || 'İade'}` })),
  ]

  function filtrele(liste: any[]) {
    return liste.filter(h => {
      if (filtreBaslangic && h.tarih < filtreBaslangic) return false
      if (filtreBitis && h.tarih > filtreBitis) return false
      if (filtreCari && h.cariId !== filtreCari) return false
      return true
    })
  }

  const kasaFiltre = filtrele(kasaHareketler)
  const cariFiltre = filtrele(cariHareketler)
  const mlFiltre = filtrele(mlHareketler)
  const enginFiltre = filtrele(enginHareketler)
  const sermayeFiltre = filtrele(sermayeHareketler)
  const tumFiltre = filtrele([...kasaHareketler, ...cariHareketler, ...mlHareketler, ...enginHareketler, ...sermayeHareketler])

  const gosterilenOnce =
    aktifSekme === 'kasa' ? kasaFiltre :
    aktifSekme === 'cari' ? cariFiltre :
    aktifSekme === 'mlift' ? mlFiltre :
    aktifSekme === 'engin' ? enginFiltre :
    aktifSekme === 'sermaye' ? sermayeFiltre : tumFiltre

  const gosterilenZengin = gosterilenOnce.map(h => {
    const kaynakAdlari: Record<string, string> = { kasa: 'Kasa', mlift: 'Marmara Lift', engin: 'Engin', sermaye: 'Sermaye' }
    const _tutar = h.kaynak === 'cari' ? (h.tur === 'tahsilat' ? h.tahsilat : h.tutar) : h.tutar
    const _tur = h.kaynak === 'cari' ? (TUR_ETIKET[h.tur] || h.tur)
      : h.kaynak === 'kasa' ? (h.yon === 'giris' ? 'Kasa Giriş' : 'Kasa Çıkış')
      : h.kaynak === 'mlift' ? (h.yon === 'giris' ? 'ML Giriş' : 'ML Çıkış')
      : h.tip
    const _kaynakAd = h.kaynak === 'cari' ? (h.cariAd || '') : kaynakAdlari[h.kaynak]
    const _yon = h.kaynak === 'cari' ? (h.tur === 'tahsilat' ? 'giris' : (h.tur === 'virman_giris' ? 'giris' : 'cikis')) : h.yon
    return { ...h, _tutar: _tutar || 0, _tur, _kaynakAd, _yon }
  })
  const gosterilen = siraliVeri(gosterilenZengin, sira)

  const kasaGelir = kasaFiltre.filter(h => h.yon === 'giris').reduce((a, h) => a + (h.tutar || 0), 0)
  const kasaGider = kasaFiltre.filter(h => h.yon === 'cikis').reduce((a, h) => a + (h.tutar || 0), 0)
  const cariSatis = cariFiltre.filter(h => h.tur === 'satis').reduce((a, h) => a + (h.tutar || 0), 0)
  const cariTah = cariFiltre.filter(h => h.tur === 'tahsilat').reduce((a, h) => a + (h.tahsilat || 0), 0)

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc G"><div className="l">Kasa Girişi</div><div className="v">₺{fmt(kasaGelir)}</div></div>
        <div className="sc R"><div className="l">Kasa Çıkışı</div><div className="v">₺{fmt(kasaGider)}</div></div>
        <div className="sc B"><div className="l">Cari Satış</div><div className="v">₺{fmt(cariSatis)}</div></div>
        <div className="sc A"><div className="l">Tahsilat</div><div className="v">₺{fmt(cariTah)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="cb" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fr" style={{ margin: 0 }}>
            <label>Başlangıç</label>
            <input type="date" value={filtreBaslangic} onChange={e => setFiltreBaslangic(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div className="fr" style={{ margin: 0 }}>
            <label>Bitiş</label>
            <input type="date" value={filtreBitis} onChange={e => setFiltreBitis(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div className="fr" style={{ margin: 0 }}>
            <label>Cari</label>
            <select value={filtreCari} onChange={e => setFiltreCari(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }}>
              <option value="">Tümü</option>
              {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </select>
          </div>
          <button className="btn xs" onClick={() => { setFiltreBaslangic(''); setFiltreBitis(''); setFiltreCari('') }}>Sıfırla</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn xs gn" onClick={() => setEkleModal({ open: true, yon: 'giris' })}>+ Giriş</button>
            <button className="btn xs dn" onClick={() => setEkleModal({ open: true, yon: 'cikis' })}>+ Çıkış</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)', flexWrap: 'wrap' }}>
          {([
            ['tumü', '📋 Tümü', tumFiltre.length],
            ['kasa', '💰 Kasa', kasaFiltre.length],
            ['cari', '👥 Cari', cariFiltre.length],
            ['mlift', '🏢 Marmara Lift', mlFiltre.length],
            ['engin', '👤 Engin', enginFiltre.length],
            ['sermaye', '💼 Sermaye', sermayeFiltre.length],
          ] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => setAktifSekme(key)}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                borderBottom: aktifSekme === key ? '2px solid var(--acc)' : '2px solid transparent',
                color: aktifSekme === key ? 'var(--acc)' : 'var(--tx2)'
              }}>
              {label} <span style={{ fontSize: 10, opacity: .7 }}>({count})</span>
            </button>
          ))}
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_kaynakAd'))}>Kaynak{siraIkon(sira,'_kaynakAd')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_yon'))}>Yön{siraIkon(sira,'_yon')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_tur'))}>Tür{siraIkon(sira,'_tur')}</th>
                <th>Açıklama</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'_tutar'))}>Tutar{siraIkon(sira,'_tutar')}</th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {gosterilen.map((h, i) => {
                const pozitif = h._yon === 'giris'
                const acik = h.kaynak === 'cari' ? (h.acik || h.fatno || '—')
                  : h.kaynak === 'sermaye' ? h.ad
                  : h.ad
                return (
                  <tr key={i}>
                    <td className="tnw">{fmtTarih(h.tarih)}</td>
                    <td>
                      {h.kaynak === 'cari'
                        ? <span className="badge bB" style={{ cursor: 'pointer' }} onClick={() => onCariSec?.(h.cariId)}>{h.cariAd?.split(' ')[0]}</span>
                        : <span className="badge bX">{h._kaynakAd}</span>
                      }
                    </td>
                    <td><span className={`badge ${pozitif ? 'bG' : 'bR'}`}>{pozitif ? '↓ Giriş' : '↑ Çıkış'}</span></td>
                    <td><span className={`badge ${pozitif ? 'bG' : 'bR'}`}>{h._tur}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acik}</td>
                    <td className="tr" style={{ fontWeight: 700, color: pozitif ? 'var(--g)' : 'var(--r)' }}>
                      {pozitif ? '+' : '-'}₺{fmt(h._tutar || 0)}
                    </td>
                  </tr>
                )
              })}
              {!yukleniyor && !gosterilen.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Hareket yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '9px 15px', background: 'var(--surf2)', borderTop: '1px solid var(--bdr)', fontSize: 12 }}>
          Toplam <b>{gosterilen.length}</b> hareket
        </div>
      </div>

      {ekleModal.open && (
        <HizliEkleModal
          yon={ekleModal.yon}
          onClose={() => setEkleModal({ open: false, yon: 'giris' })}
          onSaved={yukle}
        />
      )}
    </div>
  )
}

function HizliEkleModal({ yon, onClose, onSaved }: { yon: 'giris'|'cikis'; onClose: () => void; onSaved: () => void }) {
  const secenekler = yon === 'giris'
    ? [['kasa', '💰 Operasyonel Kasa'], ['mlift', '🏢 Marmara Lift'], ['engin_tahsilat', '👤 Engin Tahsilatı']]
    : [['kasa', '💰 Operasyonel Kasa'], ['mlift', '🏢 Marmara Lift'], ['engin_harcama', '👤 Engin Harcaması']]

  const [defter, setDefter] = useState(secenekler[0][0])
  const [tarih, setTarih] = useState(today())
  const [ad, setAd] = useState('')
  const [tutar, setTutar] = useState(0)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function kaydet() {
    if (!ad.trim()) { alert('Açıklama girin!'); return }
    if (!tutar) { alert('Tutar girin!'); return }
    setKaydediliyor(true)

    if (defter === 'kasa') {
      await fetch('/api/kasa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ tarih, ad, tutar, yon }),
      })
    } else if (defter === 'mlift') {
      await fetch('/api/marmara-lift', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ tarih, ad, tutar, yon, kategori: 'DİĞER' }),
      })
    } else if (defter === 'engin_tahsilat') {
      await fetch('/api/engin/tahsilatlar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ tarih, ad, tutar }),
      })
    } else if (defter === 'engin_harcama') {
      await fetch('/api/engin/harcamalar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ tarih, ad, tutar }),
      })
    }

    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">{yon === 'giris' ? '+ Giriş Ekle' : '+ Çıkış Ekle'}<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="fr"><label>Hangi Deftere?</label>
            <select value={defter} onChange={e => setDefter(e.target.value)}>
              {secenekler.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div className="fg2">
            <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
            <div className="fr"><label>Tutar (₺) *</label><input type="number" value={tutar} onChange={e => setTutar(Number(e.target.value))} min="0" step="0.01" /></div>
          </div>
          <div className="fr"><label>Açıklama *</label><input type="text" value={ad} onChange={e => setAd(e.target.value)} placeholder="ör: Ofis kirtasiye alımı" /></div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}
