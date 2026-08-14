'use client'
import { useState, useEffect } from 'react'
import { overlayProps } from '@/lib/modalOverlay'
import { useAdminOnay } from '@/components/AdminOnaySistemi'

export default function Topbar({ onMenuToggle, baslik }: { onMenuToggle: () => void, baslik?: string }) {
  const confirmAdmin = useAdminOnay()
  const [tarih, setTarih] = useState('')
  const [yedekIniyor, setYedekIniyor] = useState(false)
  const [geriYuklemeModal, setGeriYuklemeModal] = useState<{ open: boolean; icerik: any | null; dosyaAdi: string }>({ open: false, icerik: null, dosyaAdi: '' })
  const [geriYukleniyor, setGeriYukleniyor] = useState(false)
  const [onayMetni, setOnayMetni] = useState('')
  const [mesaj, setMesaj] = useState('')

  useEffect(() => {
    setTarih(new Date().toLocaleDateString('tr-TR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }))
  }, [])

  async function yedekIndir() {
    setYedekIniyor(true)
    try {
      const res = await fetch('/api/yedek', { credentials: 'include' })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Yedek alınamadı'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mlk-yedek-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMesaj('✅ Yedek indirildi')
      setTimeout(() => setMesaj(''), 3000)
    } finally {
      setYedekIniyor(false)
    }
  }

  function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const icerik = JSON.parse(reader.result as string)
        setGeriYuklemeModal({ open: true, icerik, dosyaAdi: dosya.name })
      } catch {
        alert('Dosya okunamadı — geçerli bir yedek JSON dosyası seçin.')
      }
    }
    reader.readAsText(dosya)
    e.target.value = ''
  }

  async function geriYuklemeyiOnayla() {
    if (onayMetni !== 'GERİ YÜKLE') { alert('Onaylamak için tam olarak "GERİ YÜKLE" yazmalısınız.'); return }
    if (!(await confirmAdmin('Bu işlem TÜM MEVCUT VERİLERİ SİLİP yedekteki veriyle değiştirecek. Geri alınamaz!'))) return

    setGeriYukleniyor(true)
    try {
      const res = await fetch('/api/yedek/geri-yukle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ veri: geriYuklemeModal.icerik?.veri }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error || 'Geri yükleme başarısız'); return }
      const hataliTablolar = Object.entries(d.sonuc || {}).filter(([, v]: any) => v.hata)
      if (hataliTablolar.length) {
        alert('Bazı tablolarda hata oluştu:\n' + hataliTablolar.map(([k, v]: any) => `${k}: ${v.hata}`).join('\n'))
      } else {
        alert('✅ Geri yükleme tamamlandı. Sayfa yenileniyor...')
        window.location.reload()
      }
    } finally {
      setGeriYukleniyor(false)
      setGeriYuklemeModal({ open: false, icerik: null, dosyaAdi: '' })
      setOnayMetni('')
    }
  }

  return (
    <div className="topbar">
      <button className="mb-toggle" onClick={onMenuToggle}>☰</button>
      <div style={{ fontWeight: 600, fontSize: '14px' }}>{baslik || 'Marmara Lider Kimya'}</div>
      <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--tx2)' }}>{tarih}</div>

      {mesaj && <div style={{ fontSize: 11, color: 'var(--g)', fontWeight: 600 }}>{mesaj}</div>}

      <button className="btn xs" onClick={yedekIndir} disabled={yedekIniyor} title="Tüm verileri JSON olarak indir">
        {yedekIniyor ? '⏳' : '💾'} Yedekle
      </button>
      <label className="btn xs" style={{ cursor: 'pointer' }} title="Bir yedek dosyasından geri yükle">
        📂 Yükle
        <input type="file" accept="application/json" onChange={dosyaSecildi} style={{ display: 'none' }} />
      </label>

      {geriYuklemeModal.open && (
        <div className="modal-overlay" {...overlayProps(() => { setGeriYuklemeModal({ open: false, icerik: null, dosyaAdi: '' }); setOnayMetni('') })}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              ⚠️ Yedekten Geri Yükle
              <button onClick={() => { setGeriYuklemeModal({ open: false, icerik: null, dosyaAdi: '' }); setOnayMetni('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fwarn" style={{ marginBottom: 12, lineHeight: 1.6 }}>
                <b>Bu işlem geri alınamaz.</b> "{geriYuklemeModal.dosyaAdi}" dosyasındaki veri,
                sistemdeki <b>TÜM MEVCUT VERİNİN YERİNE</b> yazılacak — cariler, kasa, üretim,
                hammadde, sermaye vb. her şey bu yedekteki haliyle değişecek. Kullanıcı hesapları
                (şifreler) bu işlemden etkilenmez.
              </div>
              {geriYuklemeModal.icerik?.olusturulma && (
                <div className="finfo" style={{ marginBottom: 12 }}>
                  Yedek tarihi: <b>{new Date(geriYuklemeModal.icerik.olusturulma).toLocaleString('tr-TR')}</b>
                </div>
              )}
              <div className="fr">
                <label>Onaylamak için kutuya tam olarak <b>GERİ YÜKLE</b> yazın</label>
                <input type="text" value={onayMetni} onChange={e => setOnayMetni(e.target.value)} placeholder="GERİ YÜKLE" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setGeriYuklemeModal({ open: false, icerik: null, dosyaAdi: '' }); setOnayMetni('') }}>İptal</button>
              <button className="btn dn" onClick={geriYuklemeyiOnayla} disabled={geriYukleniyor || onayMetni !== 'GERİ YÜKLE'}>
                {geriYukleniyor ? 'Geri yükleniyor...' : '⚠️ Geri Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
