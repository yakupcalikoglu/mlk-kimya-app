'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import OzetDashboard from '@/components/OzetDashboard'

export default function Dashboard() {
  const [aktifSayfa, setAktifSayfa] = useState('ozet')
  const [sidebarAcik, setSidebarAcik] = useState(false)

  return (
    <div className="app-layout">
      <div className={`sb-overlay ${sidebarAcik ? 'open' : ''}`} onClick={() => setSidebarAcik(false)} />
      <Sidebar aktif={aktifSayfa} onChange={(s) => { setAktifSayfa(s); setSidebarAcik(false); }} isOpen={sidebarAcik} />
      <div className="main">
        <Topbar onMenuToggle={() => setSidebarAcik(!sidebarAcik)} />
        <div className="page-content">
          {aktifSayfa === 'ozet' && <OzetDashboard />}
          {aktifSayfa !== 'ozet' && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tx2)' }}>
              Bu sayfa hazırlanıyor...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
