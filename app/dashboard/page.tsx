'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import OzetDashboard from '@/components/OzetDashboard'
import TumCariler from '@/components/TumCariler'
import CariDetay from '@/components/CariDetay'

export default function Dashboard() {
  const [aktifSayfa, setAktifSayfa] = useState('ozet')
  const [sidebarAcik, setSidebarAcik] = useState(false)
  const [aktifCariId, setAktifCariId] = useState<string|null>(null)

  function sayfaDegis(s: string) {
    setAktifSayfa(s)
    setAktifCariId(null)
    setSidebarAcik(false)
  }

  function cariSec(id: string) {
    setAktifCariId(id)
    setAktifSayfa('cari_detay')
    setSidebarAcik(false)
  }

  return (
    <div className="app-layout">
      <div className={`sb-overlay ${sidebarAcik?'open':''}`} onClick={()=>setSidebarAcik(false)} />
      <Sidebar aktif={aktifSayfa} onChange={sayfaDegis} isOpen={sidebarAcik} />
      <div className="main">
        <Topbar onMenuToggle={()=>setSidebarAcik(!sidebarAcik)} />
        <div className="page-content">
          {aktifSayfa === 'ozet'       && <OzetDashboard onCariSec={cariSec} />}
          {aktifSayfa === 'cariler'    && <TumCariler onCariSec={cariSec} />}
          {aktifSayfa === 'cari_detay' && aktifCariId && (
            <CariDetay cariId={aktifCariId} onBack={() => setAktifSayfa('cariler')} />
          )}
          {!['ozet','cariler','cari_detay'].includes(aktifSayfa) && (
            <div style={{padding:40,textAlign:'center',color:'var(--tx2)'}}>Bu sayfa yapım aşamasında...</div>
          )}
        </div>
      </div>
    </div>
  )
}
