'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Giriş başarısız')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0e1720 0%,#162333 50%,#1e3a5f 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div className="login-card" style={{ background:'#fff', borderRadius:'16px', padding:'32px 28px', width:'100%', maxWidth:'380px', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px', paddingBottom:'20px', borderBottom:'1px solid #e5e3dc' }}>
          <div style={{ width:'44px', height:'44px', background:'#2563eb', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'700', fontSize:'13px' }}>MLK</div>
          <div>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'#111' }}>Marmara Lider Kimya</div>
            <div style={{ fontSize:'11px', color:'#6b7280' }}>Yönetim Sistemi v5.0</div>
          </div>
        </div>

        {error && <div className="fwarn" style={{ marginBottom:'12px' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="fr">
            <label>Kullanıcı Adı</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="kullanici_adi" autoComplete="off" spellCheck={false} required />
          </div>
          <div className="fr" style={{ marginBottom:'16px' }}>
            <label>Şifre</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
          </div>
          <button type="submit" className="btn pr" style={{ width:'100%', justifyContent:'center', padding:'10px' }} disabled={loading}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
