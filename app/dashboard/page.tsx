'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import OzetDashboard from '@/components/OzetDashboard'
import TumCariler from '@/components/TumCariler'
import CariDetay from '@/components/CariDetay'
import OperasyonelKasa from '@/components/OperasyonelKasa'
import Satislar from '@/components/Satislar'
import Uretim from '@/components/Uretim'
import HammaddeStogu from '@/components/HammaddeStogu'
import TumHareketler from '@/components/TumHareketler'
import Ayarlar from '@/components/Ayarlar'
import MarmaraLift from '@/components/MarmaraLift'
import EnginHesabi from '@/components/EnginHesabi'
import SermayeModule from '@/components/SermayeModule'
import CariVirman from '@/components/CariVirman'
import BedelsizNumune from '@/components/BedelsizNumune'
import UrunStogu from '@/components/UrunStogu'
import UretimMaliyeti from '@/components/UretimMaliyeti'
import Raporlar from '@/components/Raporlar'
import AnaKasa from '@/components/AnaKasa'
import Fatura from '@/components/Fatura'
import { AdminOnayProvider } from '@/components/AdminOnaySistemi'

export default function Dashboard() {
  const [aktifSayfa, setAktifSayfa] = useState('ozet')
  const [sidebarAcik, setSidebarAcik] = useState(false)
  const [aktifCariId, setAktifCariId] = useState<string|null>(null)

  function sayfaDegis(s: string) {
    if (s.startsWith('cari_')) {
      setAktifCariId(s.replace('cari_', ''))
      setAktifSayfa('cari_detay')
    } else {
      setAktifSayfa(s)
      setAktifCariId(null)
    }
    setSidebarAcik(false)
  }

  function cariSec(id: string) {
    setAktifCariId(id)
    setAktifSayfa('cari_detay')
    setSidebarAcik(false)
  }

  const sayfaBasliklari: Record<string, string> = {
    ozet: 'Özet Dashboard', cariler: 'Tüm Cariler',
    kasa: 'Operasyonel Kasa', satis: 'Satışlar',
    uretim: 'Üretim', hammadde: 'Hammadde Stoğu',
    htum: 'Tüm Hareketler', ayarlar: 'Ayarlar',
    mlift: 'Marmara Lift', engin: 'Engin Hesabı',
    sermaye: 'Sermaye', virman: 'Cari Virman',
    bedelsiz: 'Bedelsiz Numune', urun_stok: 'Ürün Stoğu',
    maliyet: 'Üretim Maliyeti', rapor: 'Raporlar', cari_detay: 'Cari Detay',
    ana_kasa: 'Ana Kasa', fatura: 'Fatura',
  }

  const sayfalar = Object.keys(sayfaBasliklari)

  return (
    <AdminOnayProvider>
    <div className="app-layout">
      <div className={`sb-overlay ${sidebarAcik ? 'open' : ''}`} onClick={() => setSidebarAcik(false)} />
      <Sidebar aktif={aktifSayfa} onChange={sayfaDegis} isOpen={sidebarAcik} />
      <div className="main">
        <Topbar onMenuToggle={() => setSidebarAcik(!sidebarAcik)} baslik={sayfaBasliklari[aktifSayfa] || ''} />
        <div className="page-content">
          {aktifSayfa === 'ozet'       && <OzetDashboard onCariSec={cariSec} />}
          {aktifSayfa === 'ana_kasa'   && <AnaKasa onCariSec={cariSec} />}
          {aktifSayfa === 'cariler'    && <TumCariler onCariSec={cariSec} />}
          {aktifSayfa === 'kasa'       && <OperasyonelKasa />}
          {aktifSayfa === 'satis'      && <Satislar onCariSec={cariSec} />}
          {aktifSayfa === 'uretim'     && <Uretim />}
          {aktifSayfa === 'hammadde'   && <HammaddeStogu />}
          {aktifSayfa === 'htum'       && <TumHareketler onCariSec={cariSec} />}
          {aktifSayfa === 'ayarlar'    && <Ayarlar />}
          {aktifSayfa === 'mlift'      && <MarmaraLift />}
          {aktifSayfa === 'engin'      && <EnginHesabi />}
          {aktifSayfa === 'sermaye'    && <SermayeModule />}
          {aktifSayfa === 'virman'     && <CariVirman />}
          {aktifSayfa === 'bedelsiz'   && <BedelsizNumune />}
          {aktifSayfa === 'urun_stok'  && <UrunStogu />}
          {aktifSayfa === 'maliyet'    && <UretimMaliyeti />}
          {aktifSayfa === 'rapor'      && <Raporlar />}
          {aktifSayfa === 'fatura'     && <Fatura />}
          {aktifSayfa === 'cari_detay' && aktifCariId && (
            <CariDetay cariId={aktifCariId} onBack={() => setAktifSayfa('cariler')} />
          )}
          {!sayfalar.includes(aktifSayfa) && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx2)' }}>
              Bu sayfa yapım aşamasında...
            </div>
          )}
        </div>
      </div>
    </div>
    </AdminOnayProvider>
  )
}
