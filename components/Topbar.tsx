'use client'
import { useState, useEffect } from 'react'

export default function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [tarih, setTarih] = useState('')
  const [syncDurum, setSyncDurum] = useState<'ok'|'yukleniyor'|'hata'>('ok')

  useEffect(() => {
    setTarih(new Date().toLocaleDateString('tr-TR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }))
  }, [])

  return (
    <div className="topbar">
      <button className="mb-toggle" onClick={onMenuToggle}>☰</button>
      <div style={{ fontWeight: 600, fontSize: '14px' }}>Marmara Lider Kimya</div>
      <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--tx2)' }}>{tarih}</div>
      <div style={{ 
        fontSize: '11px', padding: '3px 8px', borderRadius: '99px',
        background: syncDurum === 'ok' ? 'var(--gbg)' : syncDurum === 'hata' ? 'var(--rbg)' : 'var(--abg)',
        color: syncDurum === 'ok' ? 'var(--g)' : syncDurum === 'hata' ? 'var(--r)' : 'var(--a)'
      }}>
        {syncDurum === 'ok' ? '☁️ Sync OK' : syncDurum === 'hata' ? '❌ Hata' : '⏳ Kaydediliyor'}
      </div>
    </div>
  )
}
