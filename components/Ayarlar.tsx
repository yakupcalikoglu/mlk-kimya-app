'use client'
import { useEffect, useState } from 'react'
import IslemlerMenu from '@/components/IslemlerMenu'
import { overlayProps } from '@/lib/modalOverlay'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'
import { useAdminOnay } from '@/components/AdminOnaySistemi'

export default function Ayarlar() {
  const confirmAdmin = useAdminOnay()
  const [kullanicilar, setKullanicilar] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [sira, setSira] = useState<SiraState>({ alan: 'name', yon: 'asc' })
  const [yedekIniyor, setYedekIniyor] = useState(false)
  const [geriYuklemeModal, setGeriYuklemeModal] = useState<{ open: boolean; icerik: any | null; dosyaAdi: string }>({ open: false, icerik: null, dosyaAdi: '' })
  const [geriYukleniyor, setGeriYukleniyor] = useState(false)
  const [onayMetni, setOnayMetni] = useState('')

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

  async function yukle() {
    const res = await fetch('/api/kullanicilar', { credentials: 'include' })
    if (res.ok) setKullanicilar(await res.json())
  }

  useEffect(() => { yukle() }, [])

  async function kulKaydet() {
    if (!form.username || !form.name) { alert('Ad ve kullanıcı adı zorunlu!'); return }
    if (!form.id && (!form.password || form.password.length < 6)) { alert('Şifre en az 6 karakter!'); return }
    if (!form.id && form.password !== form.password2) { alert('Şifreler eşleşmiyor!'); return }
    setKaydediliyor(true)

    const payload: any = {
      username: form.username.toLowerCase(),
      name: form.name,
      role: form.role || 'goruntule',
      aktif: form.aktif !== false
    }
    if (form.password) payload.password = form.password

    const res = await fetch(form.id ? `/api/kullanicilar/${form.id}` : '/api/kullanicilar', {
      method: form.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      await yukle()
      setModal(false)
      setForm({})
      setMesaj('✅ Kaydedildi')
      setTimeout(() => setMesaj(''), 3000)
    } else {
      const d = await res.json()
      alert(d.error || 'Hata oluştu')
    }
    setKaydediliyor(false)
  }

  async function kulSil(id: number) {
    if (!(await confirmAdmin('Bu kullanıcı silinsin mi?'))) return
    await fetch(`/api/kullanicilar/${id}`, { method: 'DELETE', credentials: 'include' })
    await yukle()
  }

  const roller: Record<string, string> = {
    admin: 'Admin', muhasebe: 'Muhasebe', depo: 'Depo', satis: 'Satış', goruntule: 'Sadece Görüntüle'
  }

  return (
    <div>
      {mesaj && <div className="fsuccess" style={{ marginBottom: 14 }}>{mesaj}</div>}

      <div className="card">
        <div className="ch">💾 Yedekleme</div>
        <div className="cb">
          <div className="fwarn" style={{ marginBottom: 12 }}>
            Bu, Supabase'in kendi otomatik yedeklemesinin YERİNE geçmez — sadece ek bir
            kolaylık katmanıdır. Kritik bir işlem öncesi elle yedek almanız önerilir.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn pr" onClick={yedekIndir} disabled={yedekIniyor}>
              {yedekIniyor ? 'Hazırlanıyor...' : '📥 Yedek İndir (.json)'}
            </button>
            <label className="btn dn" style={{ cursor: 'pointer' }}>
              📤 Yedekten Geri Yükle
              <input type="file" accept="application/json" onChange={dosyaSecildi} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">👥 Kullanıcı Yönetimi
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => { setForm({ role: 'goruntule', aktif: true }); setModal(true) }}>
              + Kullanıcı Ekle
            </button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'name'))}>Ad{siraIkon(sira,'name')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'username'))}>Kullanıcı Adı{siraIkon(sira,'username')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'role'))}>Rol{siraIkon(sira,'role')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'aktif'))}>Durum{siraIkon(sira,'aktif')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {siraliVeri(kullanicilar, sira).map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: 'var(--tx2)', fontFamily: 'monospace' }}>{u.username}</td>
                  <td><span className="badge bB">{roller[u.role] || u.role}</span></td>
                  <td>
                    <span className={`badge ${u.aktif ? 'bG' : 'bR'}`}>
                      {u.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <IslemlerMenu>
                      <IslemlerMenu.Item ikon="✏️" onClick={() => { setForm({ ...u, password: '', password2: '' }); setModal(true) }}>Düzenle</IslemlerMenu.Item>
                      {u.username !== 'yakup' && (
                        <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => kulSil(u.id)}>Sil</IslemlerMenu.Item>
                      )}
                    </IslemlerMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" {...overlayProps(() => setModal(false))}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              {form.id ? '✏️ Kullanıcı Düzenle' : '+ Yeni Kullanıcı'}
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fr"><label>Ad Soyad *</label>
                  <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="fr"><label>Kullanıcı Adı *</label>
                  <input type="text" value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })}
                    disabled={!!form.id} placeholder="küçük harf, boşluksuz" />
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Rol</label>
                  <select value={form.role || 'goruntule'} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {Object.entries(roller).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="fr"><label>Durum</label>
                  <select value={form.aktif ? '1' : '0'} onChange={e => setForm({ ...form, aktif: e.target.value === '1' })}>
                    <option value="1">Aktif</option>
                    <option value="0">Pasif</option>
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>{form.id ? 'Yeni Şifre (boş = değiştirme)' : 'Şifre *'}</label>
                  <input type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password" />
                </div>
                <div className="fr"><label>Şifre Tekrar</label>
                  <input type="password" value={form.password2 || ''} onChange={e => setForm({ ...form, password2: e.target.value })}
                    autoComplete="new-password" />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(false)}>İptal</button>
              <button className="btn pr" onClick={kulKaydet} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

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
