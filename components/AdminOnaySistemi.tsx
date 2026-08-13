'use client'
import { createContext, useContext, useState, useCallback, useRef } from 'react'

type OnayFn = (mesaj: string) => Promise<boolean>
const AdminOnayContext = createContext<OnayFn | null>(null)

export function useAdminOnay(): OnayFn {
  const ctx = useContext(AdminOnayContext)
  if (!ctx) throw new Error('useAdminOnay, AdminOnayProvider içinde kullanılmalı')
  return ctx
}

export function AdminOnayProvider({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<{ acik: boolean; mesaj: string }>({ acik: false, mesaj: '' })
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [dogrulaniyor, setDogrulaniyor] = useState(false)
  const cozRef = useRef<(v: boolean) => void>()

  const confirmAdmin = useCallback((mesaj: string) => {
    setDurum({ acik: true, mesaj })
    setSifre('')
    setHata('')
    return new Promise<boolean>((resolve) => { cozRef.current = resolve })
  }, [])

  async function dogrula() {
    if (!sifre) { setHata('Şifre girin'); return }
    setDogrulaniyor(true)
    setHata('')
    try {
      const res = await fetch('/api/auth/admin-dogrula', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ password: sifre }),
      })
      const d = await res.json()
      if (d.ok) {
        setDurum({ acik: false, mesaj: '' })
        cozRef.current?.(true)
      } else {
        setHata(d.error || 'Şifre hatalı')
      }
    } catch {
      setHata('Bağlantı hatası, tekrar deneyin')
    } finally {
      setDogrulaniyor(false)
    }
  }

  function iptal() {
    setDurum({ acik: false, mesaj: '' })
    cozRef.current?.(false)
  }

  return (
    <AdminOnayContext.Provider value={confirmAdmin}>
      {children}
      {durum.acik && (
        <div className="modal-overlay" onClick={iptal}>
          <div className="modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              🔒 Yönetici Onayı Gerekli
              <button onClick={iptal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <div className="fwarn" style={{ marginBottom: 12 }}>{durum.mesaj}</div>
              <div className="fr">
                <label>Yönetici Şifresi</label>
                <input
                  type="password"
                  value={sifre}
                  autoFocus
                  onChange={e => setSifre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') dogrula() }}
                  placeholder="Yönetici (admin) şifresini girin"
                />
              </div>
              {hata && <div style={{ color: 'var(--r)', fontSize: 12, marginTop: 6 }}>{hata}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={iptal}>İptal</button>
              <button className="btn dn" onClick={dogrula} disabled={dogrulaniyor}>
                {dogrulaniyor ? 'Kontrol ediliyor...' : '🗑 Onayla ve Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminOnayContext.Provider>
  )
}
