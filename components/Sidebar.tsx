'use client'
import { useEffect, useState } from 'react'

const MENU = [
  { grup: 'GENEL', items: [
    { key: 'ozet', ic: '📊', ad: 'Özet Dashboard' },
    { key: 'htum', ic: '📋', ad: 'Tüm Hareketler' },
  ]},
  { grup: 'FİNANS', items: [
    { key: 'mlift', ic: '🏢', ad: 'Marmara Lift' },
    { key: 'engin', ic: '👤', ad: 'Engin Hesabı' },
    { key: 'kasa', ic: '💰', ad: 'Operasyonel Kasa' },
    { key: 'sermaye', ic: '💼', ad: 'Sermaye Ödemeleri' },
    { key: 'satis', ic: '🛒', ad: 'Satışlar' },
  ]},
  { grup: 'CARİ HESAPLAR', items: [
    { key: 'cariler', ic: '👥', ad: 'Tüm Cariler' },
    { key: 'virman', ic: '🔄', ad: 'Cari Virman' },
  ]},
  { grup: 'ÜRETİM', items: [
    { key: 'uretim', ic: '⚗️', ad: 'Üretim' },
    { key: 'hammadde', ic: '🧪', ad: 'Hammadde Stoğu' },
    { key: 'bedelsiz', ic: '🎁', ad: 'Bedelsiz Numune' },
    { key: 'urun_stok', ic: '📦', ad: 'Ürün Stoğu' },
    { key: 'maliyet', ic: '📉', ad: 'Üretim Maliyeti' },
  ]},
  { grup: 'BELGELER & AYARLAR', items: [
    { key: 'rapor', ic: '📊', ad: 'Raporlar' },
    { key: 'ayarlar', ic: '⚙️', ad: 'Ayarlar' },
  ]},
]

export default function Sidebar({ aktif, onChange, isOpen }: {
  aktif: string
  onChange: (key: string) => void
  isOpen: boolean
}) {
  const [cariler, setCariler] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/cariler', { credentials: 'include' }).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCariler(d)
    }).catch(() => {})
  }, [])

  function fmt(n: number) {
    return new Intl.NumberFormat('tr-TR').format(Math.round(n))
  }

  function cariSonBakiye(c: any) {
    const h = c.hareketler || []
    return h.length ? h[h.length-1].bakiye : 0
  }

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sb-logo">
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', background:'var(--acc)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'700', fontSize:'11px', flexShrink:0 }}>MLK</div>
          <div>
            <div className="sb-logo-title">Marmara Lider Kimya</div>
            <div className="sb-logo-sub">v5.0 — Yönetim Sistemi</div>
          </div>
        </div>
      </div>

      {MENU.map(grup => (
        <div key={grup.grup}>
          <div className="sb-section">{grup.grup}</div>
          {grup.items.map(item => (
            <a key={item.key} className={`nav-item ${aktif === item.key ? 'active' : ''}`}
              onClick={() => onChange(item.key)} href="#">
              <span className="ic">{item.ic}</span>
              {item.ad}
            </a>
          ))}
          {grup.grup === 'CARİ HESAPLAR' && cariler.map(c => {
            const bak = cariSonBakiye(c)
            return (
              <a key={c.id} className={`nav-item ${aktif === `cari_${c.id}` ? 'active' : ''}`}
                onClick={() => onChange(`cari_${c.id}`)} href="#">
                <span className="ic">👤</span>
                {c.ad.split(' ')[0].substring(0, 12)}
                {bak > 0 && <span className="nav-bak">₺{fmt(bak)}</span>}
                {bak < 0 && <span className="nav-bak-neg">↩₺{fmt(Math.abs(bak))}</span>}
              </a>
            )
          })}
        </div>
      ))}

      <div style={{ marginTop:'auto', padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,.08)' }}>
        <button onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          window.location.href = '/'
        }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:'12px', width:'100%', textAlign:'left', padding:'4px 0' }}>
          🚪 Çıkış Yap
        </button>
      </div>
    </nav>
  )
}
