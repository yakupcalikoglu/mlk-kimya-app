'use client'
import { useEffect, useState } from 'react'
import { lotKalanKoduIle, otoLotSec as otoLotSecLib } from '@/lib/stok'
import IslemlerMenu from '@/components/IslemlerMenu'
import SayiInput from '@/components/SayiInput'
import { overlayProps } from '@/lib/modalOverlay'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'
import { useAdminOnay } from '@/components/AdminOnaySistemi'

function fmtTarih(t: string) {
  if (!t) return '—'
  const [y, m, d] = t.split('-')
  if (!y || !m || !d) return t
  return `${d}/${m}/${y}`
}
function fmtSayi(n: number) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n || 0)
}
function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n || 0)
}
function today() { return new Date().toISOString().split('T')[0] }

export default function Satislar({ onCariSec }: { onCariSec?: (id: string) => void }) {
  const confirmAdmin = useAdminOnay()
  const [cariler, setCariler] = useState<any[]>([])
  const [uretimler, setUretimler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ tarih: today(), pesinAlinan: 0 })
  const [duzenlenen, setDuzenlenen] = useState<{ cariId: string; harId: number } | null>(null)
  const [tahsilModal, setTahsilModal] = useState<{ open: boolean; satis: any | null }>({ open: false, satis: null })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [filtreCari, setFiltreCari] = useState('')
  const [sira, setSira] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  async function yukle() {
    const [cRes, uRes] = await Promise.all([
      fetch('/api/cariler', { credentials: 'include' }),
      fetch('/api/uretim', { credentials: 'include' }),
    ])
    if (cRes.ok) setCariler(await cRes.json())
    if (uRes.ok) setUretimler(await uRes.json())
    setYukleniyor(false)
  }

  // Lot bazlı kalan bidon (Ürün Stoğu ile aynı mantık — satış/bedelsiz hareketlerinde
  // bu lota bağlı olarak düşülenler hariç tutulur)
  function lotKalan(lot: string) {
    return lotKalanKoduIle(uretimler, cariler, lot)
  }

  // Kullanıcı lot seçmediyse otomatik olarak en eski (ilk üretilen) ve
  // yeterli stoğu olan lottan düşülür — gerçek depo mantığı (FIFO).
  function otoLotSec(): string | null {
    return otoLotSecLib(uretimler, cariler)
  }

  useEffect(() => { yukle() }, [])

  // Bir satışa özel bağlı tahsilatların toplamı (peşin + sonradan alınanlar)
  function satisAlinan(cariHareketler: any[], satisId: number) {
    return cariHareketler
      .filter((h: any) => h.tur === 'tahsilat' && h.iliskiliSatisId === satisId)
      .reduce((a: number, h: any) => a + (h.tahsilat || 0), 0)
  }

  // Tüm satış VE bedelsiz hareketleri (eski sistemdeki gibi tek tabloda, iç içe)
  const tumSatislar = cariler.flatMap(c =>
    (c.hareketler || [])
      .filter((h: any) => h.tur === 'satis' || h.tur === 'bedelsiz_ver')
      .map((h: any) => ({
        ...h,
        cariAd: c.ad,
        cariId: c.id,
        alinan: h.tur === 'satis' ? satisAlinan(c.hareketler || [], h.id) : 0,
      }))
  )

  const filtrelendiOnce = filtreCari
    ? tumSatislar.filter(s => s.cariId === filtreCari)
    : tumSatislar
  const filtrelendi = siraliVeri(filtrelendiOnce, sira)

  const sadeceSatislar = filtrelendi.filter(s => s.tur === 'satis')
  const topSatis = sadeceSatislar.reduce((a, s) => a + (s.tutar || 0), 0)
  const topAlinan = sadeceSatislar.reduce((a, s) => a + (s.alinan || 0), 0)
  const topKalan = topSatis - topAlinan
  const topBidon = filtrelendi.reduce((a, s) => a + (s.adet || 0), 0)
  const bedelsizAdet = filtrelendi.filter(s => s.tur === 'bedelsiz_ver').length

  async function satisEkle() {
    if (!form.cariId) { alert('Cari seçin!'); return }
    if (!form.adet || !form.birim) { alert('Adet ve birim fiyat girin!'); return }
    setKaydediliyor(true)

    const tutar = parseFloat(form.adet) * parseFloat(form.birim)

    if (duzenlenen) {
      // Düzenleme: sadece satış hareketinin kendi alanlarını güncelle,
      // bağlı tahsilatlara dokunma, sonra tüm bakiye zincirini yeniden hesapla.
      const c = cariler.find(x => x.id === duzenlenen.cariId)
      let hareketler = (c?.hareketler || []).map((h: any) =>
        h.id === duzenlenen.harId
          ? { ...h, tarih: form.tarih || today(), fatno: form.fatno || '', adet: parseFloat(form.adet), birim: parseFloat(form.birim), tutar, acik: form.acik || '', lot: form.lot || null }
          : h
      )
      let bak = 0
      hareketler = hareketler.map((h: any) => { bak += (h.tutar||0)-(h.tahsilat||0); return {...h, bakiye: bak} })
      await fetch(`/api/cariler/${duzenlenen.cariId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hareketler })
      })
      await yukle()
      setModal(false)
      setDuzenlenen(null)
      setForm({ tarih: today(), pesinAlinan: 0 })
      setKaydediliyor(false)
      return
    }

    const c = cariler.find(x => x.id === form.cariId)
    const hareketler = [...(c?.hareketler || [])]
    const oncekiBak = hareketler.length ? hareketler[hareketler.length - 1].bakiye : 0
    const pesinAlinan = parseFloat(form.pesinAlinan || 0)
    const satisId = Date.now()
    const secilenLot = form.lot || otoLotSec()

    hareketler.push({
      id: satisId,
      tarih: form.tarih || today(),
      tur: 'satis',
      fatno: form.fatno || '',
      adet: parseFloat(form.adet),
      birim: parseFloat(form.birim),
      tutar,
      tahsilat: 0,
      bakiye: oncekiBak + tutar,
      acik: form.acik || '',
      lot: secilenLot,
    })

    // Peşin alınan varsa, bu satışa bağlı bir tahsilat hareketi olarak ekle.
    if (pesinAlinan > 0) {
      const bakiyeSonrasi = oncekiBak + tutar
      hareketler.push({
        id: satisId + 1,
        tarih: form.tarih || today(),
        tur: 'tahsilat',
        adet: 0, birim: 0, tutar: 0,
        tahsilat: pesinAlinan,
        bakiye: bakiyeSonrasi - pesinAlinan,
        acik: 'Peşin tahsilat',
        iliskiliSatisId: satisId,
      })
    }

    await fetch(`/api/cariler/${form.cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hareketler })
    })

    await yukle()
    setModal(false)
    setForm({ tarih: today(), pesinAlinan: 0 })
    setKaydediliyor(false)
  }

  function satisDuzenleAc(s: any) {
    setDuzenlenen({ cariId: s.cariId, harId: s.id })
    setForm({ cariId: s.cariId, tarih: s.tarih, fatno: s.fatno, adet: s.adet, birim: s.birim, acik: s.acik, lot: s.lot })
    setModal(true)
  }

  async function satisSil(cariId: string, harId: number) {
    if (!(await confirmAdmin('Bu satış silinsin mi? Bağlı tahsilatlar da silinecek.'))) return
    const c = cariler.find(x => x.id === cariId)
    // Bu satışa bağlı tahsilatları da birlikte kaldır
    let hareketler = (c?.hareketler || []).filter((h: any) => h.id !== harId && h.iliskiliSatisId !== harId)
    let bak = 0
    hareketler = hareketler.map((h: any) => {
      bak += (h.tutar || 0) - (h.tahsilat || 0)
      return { ...h, bakiye: bak }
    })
    await fetch(`/api/cariler/${cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hareketler })
    })
    await yukle()
  }

  async function tahsilatEkle(satis: any, tutar: number) {
    const c = cariler.find(x => x.id === satis.cariId)
    const hareketler = [...(c?.hareketler || [])]
    const oncekiBak = hareketler.length ? hareketler[hareketler.length - 1].bakiye : 0
    hareketler.push({
      id: Date.now(),
      tarih: today(),
      tur: 'tahsilat',
      adet: 0, birim: 0, tutar: 0,
      tahsilat: tutar,
      bakiye: oncekiBak - tutar,
      acik: `Satış tahsilatı (${satis.fatno || satis.id})`,
      iliskiliSatisId: satis.id,
    })
    await fetch(`/api/cariler/${satis.cariId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hareketler })
    })
    await yukle()
  }

  return (
    <div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc B">
          <div className="l">Toplam Satış</div>
          <div className="v">₺{fmt(topSatis)}</div>
          <div className="s">{fmtSayi(topBidon)} bidon</div>
        </div>
        <div className="sc G">
          <div className="l">Alınan</div>
          <div className="v">₺{fmt(topAlinan)}</div>
        </div>
        <div className="sc R">
          <div className="l">Kalan Tahsil</div>
          <div className="v">₺{fmt(topKalan)}</div>
        </div>
        <div className="sc P">
          <div className="l">Bedelsiz Numune</div>
          <div className="v">{bedelsizAdet} adet</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">🛒 Satışlar
          <div className="ch-actions" style={{ gap: 8 }}>
            <select value={filtreCari} onChange={e => setFiltreCari(e.target.value)}>
              <option value="">Tüm Cariler</option>
              {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </select>
            <button className="btn xs pr" onClick={() => { setDuzenlenen(null); setForm({ tarih: today(), pesinAlinan: 0 }); setModal(true) }}>+ Satış Ekle</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(sira,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'cariAd'))}>Cari{siraIkon(sira,'cariAd')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'fatno'))}>Fatura No{siraIkon(sira,'fatno')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'adet'))}>Adet{siraIkon(sira,'adet')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'birim'))}>Birim ₺{siraIkon(sira,'birim')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s,'tutar'))}>Tutar{siraIkon(sira,'tutar')}</th>
                <th className="tr">Alınan</th>
                <th className="tr">Kalan</th>
                <th>Tür</th>
                <th>Açıklama</th><th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={11} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {!yukleniyor && filtrelendi.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Kayıt yok</td></tr>
              )}
              {filtrelendi.map(s => {
                const bedelsiz = s.tur === 'bedelsiz_ver'
                const kalan = bedelsiz ? 0 : (s.tutar || 0) - (s.alinan || 0)
                return (
                  <tr key={s.id}>
                    <td className="tnw">{fmtTarih(s.tarih)}</td>
                    <td>
                      <a onClick={() => onCariSec?.(s.cariId)} style={{ color: 'var(--b)', cursor: onCariSec ? 'pointer' : 'default', textDecoration: onCariSec ? 'underline dotted' : 'none' }}>
                        {s.cariAd}
                      </a>
                    </td>
                    <td>{s.fatno || '—'}</td>
                    <td className="tr">{fmtSayi(s.adet)}</td>
                    <td className="tr">{bedelsiz ? '—' : '₺' + fmt(s.birim)}</td>
                    <td className="tr" style={{ fontWeight: 600 }}>₺{fmt(s.tutar)}</td>
                    <td className="tr" style={{ color: 'var(--g)' }}>{bedelsiz ? '—' : '₺' + fmt(s.alinan)}</td>
                    <td className="tr" style={{ fontWeight: 600, color: kalan > 0 ? 'var(--r)' : 'var(--tx2)' }}>{bedelsiz ? '—' : '₺' + fmt(kalan)}</td>
                    <td><span className={`badge ${bedelsiz ? 'bP' : 'bB'}`}>{bedelsiz ? 'Bedelsiz' : 'Satış'}</span></td>
                    <td>{s.acik || '—'}</td>
                    <td>
                      {!bedelsiz && (
                        <IslemlerMenu>
                          {kalan > 0 && <IslemlerMenu.Item ikon="💰" onClick={() => setTahsilModal({ open: true, satis: s })}>Tahsilat Al</IslemlerMenu.Item>}
                          <IslemlerMenu.Item ikon="✏️" onClick={() => satisDuzenleAc(s)}>Düzenle</IslemlerMenu.Item>
                          <IslemlerMenu.Item ikon="🗑" tehlikeli onClick={() => satisSil(s.cariId, s.id)}>Sil</IslemlerMenu.Item>
                        </IslemlerMenu>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" {...overlayProps(() => { setModal(false); setDuzenlenen(null) })}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">{duzenlenen ? '✏️ Satış Düzenle' : '+ Satış Ekle'}<button onClick={() => { setModal(false); setDuzenlenen(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
            <div className="modal-body">
              <div className="fr"><label>Cari *</label>
                <select value={form.cariId || ''} onChange={e => setForm({ ...form, cariId: e.target.value })}>
                  <option value="">-- Seçin --</option>
                  {cariler.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fr"><label>Tarih</label><input type="date" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} /></div>
                <div className="fr"><label>Fatura No</label><input type="text" value={form.fatno || ''} onChange={e => setForm({ ...form, fatno: e.target.value })} /></div>
              </div>
              <div className="fr"><label>Lot (boş bırakılırsa otomatik seçilir — en eski stoklu lot)</label>
                <select value={form.lot || ''} onChange={e => setForm({ ...form, lot: e.target.value })}>
                  <option value="">— Otomatik (en eski lot) —</option>
                  {uretimler.map((u: any) => (
                    <option key={u.lot} value={u.lot}>{u.lot} — {u.urun} (Kalan: {lotKalan(u.lot)} bidon)</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 3 }}>
                  ✅ Stoktan otomatik düşülür (FIFO — en önce üretilen lottan). Belirli bir lottan düşürmek isterseniz elle seçin.
                </div>
              </div>
              <div className="fg2">
                <div className="fr"><label>Adet (bidon) *</label><input type="number" value={form.adet || ''} onChange={e => setForm({ ...form, adet: e.target.value })} /></div>
                <div className="fr"><label>Birim Fiyat (₺) *</label><input type="number" value={form.birim || ''} onChange={e => setForm({ ...form, birim: e.target.value })} /></div>
              </div>
              <div className="finfo">Tutar: <b>₺{fmt((parseFloat(form.adet || 0)) * (parseFloat(form.birim || 0)))}</b></div>
              {!duzenlenen && (
                <div className="fr" style={{ marginTop: 10 }}><label>💰 Peşin Alınan (₺)</label>
                  <input type="number" value={form.pesinAlinan || ''} onChange={e => setForm({ ...form, pesinAlinan: e.target.value })} placeholder="0 — hiç alınmadıysa boş bırakın" />
                </div>
              )}
              <div className="fr"><label>Açıklama</label><input type="text" value={form.acik || ''} onChange={e => setForm({ ...form, acik: e.target.value })} /></div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setModal(false); setDuzenlenen(null) }}>İptal</button>
              <button className="btn pr" onClick={satisEkle} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : (duzenlenen ? '💾 Güncelle' : '💾 Kaydet')}</button>
            </div>
          </div>
        </div>
      )}

      {tahsilModal.open && tahsilModal.satis && (
        <TahsilatModal
          satis={tahsilModal.satis}
          onClose={() => setTahsilModal({ open: false, satis: null })}
          onKaydet={tahsilatEkle}
        />
      )}
    </div>
  )
}

function TahsilatModal({ satis, onClose, onKaydet }: { satis: any; onClose: () => void; onKaydet: (satis: any, tutar: number) => Promise<void> }) {
  const kalan = (satis.tutar || 0) - (satis.alinan || 0)
  const [tutar, setTutar] = useState(kalan)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function kaydet() {
    if (!tutar || tutar <= 0) { alert('Tutar girin!'); return }
    setKaydediliyor(true)
    await onKaydet(satis, tutar)
    setKaydediliyor(false)
    onClose()
  }

  return (
    <div className="modal-overlay" {...overlayProps(onClose)}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">💰 Tahsilat Al<button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button></div>
        <div className="modal-body">
          <div className="finfo">
            {satis.cariAd} — {satis.fatno ? `Fat.No: ${satis.fatno}` : ''} — Satış Tutarı: ₺{fmt(satis.tutar)} — Kalan: <b>₺{fmt(kalan)}</b>
          </div>
          <div className="fr" style={{ marginTop: 10 }}><label>Tahsil Edilecek Tutar (₺) *</label>
            <SayiInput value={tutar} onChange={setTutar} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Tahsil Et'}</button>
        </div>
      </div>
    </div>
  )
}
