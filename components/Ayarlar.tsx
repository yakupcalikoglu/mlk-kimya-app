'use client'
import { useEffect, useState } from 'react'

export default function Ayarlar() {
  const [kullanicilar, setKullanicilar] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')

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
    if (!confirm('Bu kullanıcı silinsin mi?')) return
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
              <tr><th>Ad</th><th>Kullanıcı Adı</th><th>Rol</th><th>Durum</th><th></th></tr>
            </thead>
            <tbody>
              {kullanicilar.map(u => (
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
                    <div className="td-actions">
                      <button className="btn xs te" onClick={() => { setForm({ ...u, password: '', password2: '' }); setModal(true) }}>✏️</button>
                      {u.username !== 'yakup' && (
                        <button className="btn xs dn" onClick={() => kulSil(u.id)}>🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
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
    </div>
  )
}
