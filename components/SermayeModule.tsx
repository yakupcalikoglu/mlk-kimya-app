'use client'

import { useEffect, useState, useCallback } from 'react'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'
import { useAdminOnay } from '@/components/AdminOnaySistemi'

function fmtTarih(t: string) {
  if (!t) return '—'
  const [y, m, d] = t.split('-')
  if (!y || !m || !d) return t
  return `${d}/${m}/${y}`
}

// ─── Tipler ───────────────────────────────────────────────
interface Ortak {
  id: number
  ad: string
  pay: number
  hedef: number | null
  tc_no: string | null
  notlar: string | null
}
interface Odeme {
  id: number
  ortak_id: number
  ortak_ad: string
  tarih: string
  tutar: number
  tur: 'nakit' | 'havale' | 'cek'
  durum: 'odendi' | 'bekliyor'
  aciklama: string | null
  hedef: 'kasaya' | 'cariye' | 'direkt' | 'diger' | null
  hedef_aciklama: string | null
}
interface Iade {
  id: number
  ortak_id: number
  ortak_ad: string
  tarih: string
  tur: 'nakit_iade' | 'mahsup_mal' | 'mahsup_makine' | 'mahsup_kira' | 'diger'
  tutar: number
  aciklama: string | null
  kasa_etki: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}
function today() { return new Date().toISOString().split('T')[0] }

// ─── Ana Bileşen ──────────────────────────────────────────
export default function SermayeModule() {
  const confirmAdmin = useAdminOnay()
  const [ortaklar, setOrtaklar] = useState<Ortak[]>([])
  const [odemeler, setOdemeler] = useState<Odeme[]>([])
  const [iadeler, setIadeler] = useState<Iade[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [ortakModal, setOrtakModal] = useState<{ open: boolean; data: Ortak | null }>({ open: false, data: null })
  const [odemeModal, setOdemeModal] = useState<{ open: boolean; data: Odeme | null }>({ open: false, data: null })
  const [iadeModal, setIadeModal] = useState<{ open: boolean; ortakId: number | null }>({ open: false, ortakId: null })
  const [siraOrtak, setSiraOrtak] = useState<SiraState>({ alan: 'ad', yon: 'asc' })
  const [siraOdeme, setSiraOdeme] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })
  const [siraIade, setSiraIade] = useState<SiraState>({ alan: 'tarih', yon: 'desc' })

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [o, od, ia] = await Promise.all([
      fetch('/api/sermaye/ortaklar', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/sermaye/odemeler', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/sermaye/iadeler', { credentials: 'include' }).then(r => r.json()),
    ])
    setOrtaklar(Array.isArray(o) ? o : [])
    setOdemeler(Array.isArray(od) ? od : [])
    setIadeler(Array.isArray(ia) ? ia : [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  // ─── Hesaplamalar ───────────────────────────────────────
  const topOdendi = odemeler.filter(x => x.durum === 'odendi').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const topBekliyor = odemeler.filter(x => x.durum === 'bekliyor').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const topHedef = ortaklar.reduce((a, o) => a + Number(o.hedef || 0), 0)
  const topIade = iadeler.reduce((a, x) => a + Number(x.tutar || 0), 0)

  const ortakOzet = ortaklar.map(o => {
    const odendi = odemeler.filter(x => x.ortak_id === o.id && x.durum === 'odendi').reduce((a, x) => a + Number(x.tutar || 0), 0)
    const iade = iadeler.filter(x => x.ortak_id === o.id).reduce((a, x) => a + Number(x.tutar || 0), 0)
    const fazla = Math.max(0, odendi - Number(o.hedef || 0))
    const net = odendi - iade
    const kalan = Math.max(0, Number(o.hedef || 0) - odendi)
    return { ...o, odendi, iade, fazla, net, kalan }
  })
  const ortakOzetSirali = siraliVeri(ortakOzet, siraOrtak)

  // ─── Aksiyonlar ─────────────────────────────────────────
  async function ortakSil(id: number) {
    if (!(await confirmAdmin('Bu ortak ve tüm ödeme/iade kayıtları silinsin mi?'))) return
    await fetch(`/api/sermaye/ortaklar/${id}`, { method: 'DELETE', credentials: 'include' })
    yukle()
  }
  async function odemeSil(id: number) {
    if (!(await confirmAdmin('Bu sermaye ödeme kaydı silinsin mi?'))) return
    await fetch(`/api/sermaye/odemeler/${id}`, { method: 'DELETE', credentials: 'include' })
    yukle()
  }
  async function odendiYap(id: number) {
    await fetch(`/api/sermaye/odemeler/${id}`, { method: 'PATCH', credentials: 'include' })
    yukle()
  }
  async function iadeSil(id: number) {
    if (!(await confirmAdmin('Bu iade/mahsup kaydı silinsin mi?'))) return
    await fetch(`/api/sermaye/iadeler/${id}`, { method: 'DELETE', credentials: 'include' })
    yukle()
  }

  return (
    <div>
      <div className="fwarn" style={{ marginBottom: 14 }}>
        ⚠️ <b>Sermaye ödemeleri şirket kasasını etkilemez.</b> Bu bölüm ortakların yaptığı katkıları ve iade/mahsupları takip eder.
      </div>

      {/* Özet Kartları */}
      <div className="sg">
        <div className="sc G">
          <div className="l">Toplam Ödenen</div>
          <div className="v">₺{fmt(topOdendi)}</div>
          <div className="s">{odemeler.filter(x => x.durum === 'odendi').length} ödeme</div>
        </div>
        <div className="sc R">
          <div className="l">Kalan Sermaye</div>
          <div className="v">₺{fmt(Math.max(0, topHedef - topOdendi))}</div>
          <div className="s">{topHedef ? `Hedef: ₺${fmt(topHedef)}` : 'Hedef girilmemiş'}</div>
        </div>
        <div className="sc A">
          <div className="l">İade / Mahsup</div>
          <div className="v">₺{fmt(topIade)}</div>
          <div className="s">{iadeler.length} kayıt</div>
        </div>
        <div className="sc B">
          <div className="l">Net Sermaye</div>
          <div className="v">₺{fmt(topOdendi - topIade)}</div>
          <div className="s">Ödenen − İade</div>
        </div>
        {topBekliyor > 0 && (
          <div className="sc A">
            <div className="l">Bekleyen</div>
            <div className="v">₺{fmt(topBekliyor)}</div>
          </div>
        )}
      </div>

      {/* Ortaklar */}
      <div className="card">
        <div className="ch">👥 Ortaklar & Net Bakiye
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => setOrtakModal({ open: true, data: null })}>+ Ortak Ekle</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'ad'))}>Ortak{siraIkon(siraOrtak,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'pay'))}>Pay%{siraIkon(siraOrtak,'pay')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'hedef'))}>Hedef{siraIkon(siraOrtak,'hedef')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'odendi'))}>Ödenen{siraIkon(siraOrtak,'odendi')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'kalan'))}>Kalan{siraIkon(siraOrtak,'kalan')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'fazla'))}>Fazla Ödeme{siraIkon(siraOrtak,'fazla')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'iade'))}>İade/Mahsup{siraIkon(siraOrtak,'iade')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOrtak(s => siraTikla(s,'net'))}>Net Bakiye{siraIkon(siraOrtak,'net')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Yükleniyor...</td></tr>}
              {!yukleniyor && ortakOzet.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Ortak eklenmemiş</td></tr>
              )}
              {ortakOzetSirali.map((o, i) => {
                const kalan = o.kalan
                return (
                  <tr key={o.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{o.ad}</td>
                    <td className="tr">{o.pay || 0}%</td>
                    <td className="tr">{o.hedef ? `₺${fmt(o.hedef)}` : '—'}</td>
                    <td className="tr" style={{ color: 'var(--g)', fontWeight: 600 }}>₺{fmt(o.odendi)}</td>
                    <td className="tr" style={{ fontWeight: 700, color: kalan > 0 ? 'var(--r)' : 'var(--g)' }}>
                      {kalan > 0 ? `₺${fmt(kalan)}` : '✅ Tamam'}
                    </td>
                    <td className="tr" style={{ color: o.fazla > 0 ? 'var(--a)' : 'var(--tx2)' }}>
                      {o.fazla > 0 ? <b>₺{fmt(o.fazla)} fazla</b> : '—'}
                    </td>
                    <td className="tr" style={{ color: 'var(--r)' }}>{o.iade > 0 ? `₺${fmt(o.iade)}` : '—'}</td>
                    <td className="tr" style={{ fontWeight: 700, color: 'var(--b)' }}>₺{fmt(o.net)}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn xs gn" title="İade / Mahsup ekle" onClick={() => setIadeModal({ open: true, ortakId: o.id })}>↩️</button>
                        <button className="btn xs te" title="Düzenle" onClick={() => setOrtakModal({ open: true, data: o })}>✏️</button>
                        <button className="btn xs dn" title="Sil" onClick={() => ortakSil(o.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ödeme Kayıtları */}
      <div className="card">
        <div className="ch">💼 Sermaye Ödeme Kayıtları
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => setOdemeModal({ open: true, data: null })}>+ Ödeme Ekle</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraOdeme(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(siraOdeme,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraOdeme(s => siraTikla(s,'ortak_ad'))}>Ortak{siraIkon(siraOdeme,'ortak_ad')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraOdeme(s => siraTikla(s,'aciklama'))}>Açıklama{siraIkon(siraOdeme,'aciklama')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraOdeme(s => siraTikla(s,'tur'))}>Tür{siraIkon(siraOdeme,'tur')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraOdeme(s => siraTikla(s,'tutar'))}>Tutar (₺){siraIkon(siraOdeme,'tutar')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraOdeme(s => siraTikla(s,'durum'))}>Durum{siraIkon(siraOdeme,'durum')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!yukleniyor && odemeler.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>Sermaye ödeme kaydı yok</td></tr>
              )}
              {siraliVeri(odemeler, siraOdeme).map((x, i) => (
                <tr key={x.id}>
                  <td>{i + 1}</td>
                  <td className="tnw">{fmtTarih(x.tarih)}</td>
                  <td style={{ fontWeight: 500 }}>{x.ortak_ad}</td>
                  <td>{x.aciklama || '—'}</td>
                  <td><span className="badge bB">{x.tur === 'nakit' ? 'Nakit' : x.tur === 'havale' ? 'Havale' : 'Çek'}</span></td>
                  <td className="tr" style={{ fontWeight: 700, color: x.durum === 'odendi' ? 'var(--g)' : 'var(--a)' }}>₺{fmt(x.tutar)}</td>
                  <td><span className={`badge ${x.durum === 'odendi' ? 'bG' : 'bA'}`}>{x.durum === 'odendi' ? 'Ödendi' : 'Bekliyor'}</span></td>
                  <td>
                    <div className="td-actions">
                      {x.durum === 'bekliyor' && <button className="btn xs gn" title="Ödendi işaretle" onClick={() => odendiYap(x.id)}>✅</button>}
                      <button className="btn xs te" title="Düzenle" onClick={() => setOdemeModal({ open: true, data: x })}>✏️</button>
                      <button className="btn xs dn" title="Sil" onClick={() => odemeSil(x.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* İade / Mahsup */}
      <div className="card">
        <div className="ch">↩️ İade & Mahsup Kayıtları
          <div className="ch-actions">
            <button className="btn xs pr" onClick={() => setIadeModal({ open: true, ortakId: null })}>+ İade / Mahsup Ekle</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraIade(s => siraTikla(s,'tarih'))}>Tarih{siraIkon(siraIade,'tarih')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraIade(s => siraTikla(s,'ortak_ad'))}>Ortak{siraIkon(siraIade,'ortak_ad')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraIade(s => siraTikla(s,'tur'))}>Tür{siraIkon(siraIade,'tur')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraIade(s => siraTikla(s,'aciklama'))}>Açıklama{siraIkon(siraIade,'aciklama')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSiraIade(s => siraTikla(s,'tutar'))}>Tutar (₺){siraIkon(siraIade,'tutar')}</th>
                <th style={{cursor:'pointer'}} onClick={() => setSiraIade(s => siraTikla(s,'kasa_etki'))}>Kasaya Etki{siraIkon(siraIade,'kasa_etki')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!yukleniyor && iadeler.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--tx2)' }}>İade/mahsup kaydı yok</td></tr>
              )}
              {siraliVeri(iadeler, siraIade).map((x, i) => (
                <tr key={x.id}>
                  <td>{i + 1}</td>
                  <td className="tnw">{fmtTarih(x.tarih)}</td>
                  <td style={{ fontWeight: 500 }}>{x.ortak_ad}</td>
                  <td><span className="badge bR">{
                    { nakit_iade: 'Nakit İade', mahsup_mal: 'Mal Mahsubu', mahsup_makine: 'Makine Mahsubu', mahsup_kira: 'Kira Mahsubu', diger: 'Diğer Mahsup' }[x.tur]
                  }</span></td>
                  <td>{x.aciklama || '—'}</td>
                  <td className="tr" style={{ fontWeight: 700, color: 'var(--r)' }}>₺{fmt(x.tutar)}</td>
                  <td><span className={`badge ${x.kasa_etki ? 'bR' : 'bX'}`}>{x.kasa_etki ? 'Kasa Çıkışı' : 'Kasa Etkilemez'}</span></td>
                  <td><button className="btn xs dn" title="Sil" onClick={() => iadeSil(x.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topIade > 0 && (
          <div style={{ padding: '9px 15px', background: 'var(--surf2)', borderTop: '1px solid var(--bdr)', fontSize: 12 }}>
            Toplam İade/Mahsup: <b style={{ color: 'var(--r)' }}>₺{fmt(topIade)}</b>
          </div>
        )}
      </div>

      {ortakModal.open && <OrtakModal data={ortakModal.data} onClose={() => setOrtakModal({ open: false, data: null })} onSaved={yukle} />}
      {odemeModal.open && <OdemeModal data={odemeModal.data} ortaklar={ortaklar} onClose={() => setOdemeModal({ open: false, data: null })} onSaved={yukle} />}
      {iadeModal.open && (
        <IadeModal
          ortakId={iadeModal.ortakId}
          ortaklar={ortaklar}
          odemeler={odemeler}
          iadeler={iadeler}
          onClose={() => setIadeModal({ open: false, ortakId: null })}
          onSaved={yukle}
        />
      )}
    </div>
  )
}

// ─── Ortak Ekle/Düzenle Modal ─────────────────────────────
function OrtakModal({ data, onClose, onSaved }: { data: Ortak | null; onClose: () => void; onSaved: () => void }) {
  const [ad, setAd] = useState(data?.ad || '')
  const [pay, setPay] = useState(data?.pay ?? 50)
  const [hedef, setHedef] = useState(data?.hedef ?? 0)
  const [tc, setTc] = useState(data?.tc_no || '')
  const [not, setNot] = useState(data?.notlar || '')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function kaydet() {
    if (!ad.trim()) { alert('Ad zorunludur!'); return }
    setKaydediliyor(true)
    const url = data ? `/api/sermaye/ortaklar/${data.id}` : '/api/sermaye/ortaklar'
    await fetch(url, {
      method: data ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ad, pay, hedef: hedef || null, tc_no: tc, notlar: not }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          {data ? 'Ortak Düzenle' : 'Yeni Ortak Ekle'}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body">
          <div className="fg2">
            <div className="fr"><label>Ortak Adı *</label><input type="text" value={ad} onChange={e => setAd(e.target.value)} /></div>
            <div className="fr"><label>Pay Oranı (%)</label><input type="number" value={pay} onChange={e => setPay(Number(e.target.value))} min={0} max={100} /></div>
          </div>
          <div className="fg2">
            <div className="fr"><label>Hedef Sermaye (₺)</label><input type="number" value={hedef} onChange={e => setHedef(Number(e.target.value))} placeholder="Boş bırakılabilir" /></div>
            <div className="fr"><label>TC No / Vergi No</label><input type="text" value={tc} onChange={e => setTc(e.target.value)} /></div>
          </div>
          <div className="fr"><label>Not</label><textarea value={not} onChange={e => setNot(e.target.value)} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Ödeme Ekle/Düzenle Modal ─────────────────────────────
function OdemeModal({ data, ortaklar, onClose, onSaved }: { data: Odeme | null; ortaklar: Ortak[]; onClose: () => void; onSaved: () => void }) {
  const [ortakId, setOrtakId] = useState(data?.ortak_id || 0)
  const [tarih, setTarih] = useState(data?.tarih || today())
  const [tutar, setTutar] = useState(data?.tutar || 0)
  const [tur, setTur] = useState<Odeme['tur']>(data?.tur || 'nakit')
  const [durum, setDurum] = useState<Odeme['durum']>(data?.durum || 'odendi')
  const [aciklama, setAciklama] = useState(data?.aciklama || '')
  const [hedef, setHedef] = useState<Odeme['hedef']>(data?.hedef ?? null)
  const [hedefAciklama, setHedefAciklama] = useState(data?.hedef_aciklama || '')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const seciliOrtak = ortaklar.find(o => o.id === ortakId)

  async function kaydet() {
    if (!ortakId) { alert('Ortak seçiniz!'); return }
    if (!tutar) { alert('Tutar giriniz!'); return }
    setKaydediliyor(true)
    const url = data ? `/api/sermaye/odemeler/${data.id}` : '/api/sermaye/odemeler'
    await fetch(url, {
      method: data ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ortak_id: ortakId, tarih, tutar, tur, durum, aciklama, hedef, hedef_aciklama: hedef ? hedefAciklama : null }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          {data ? 'Ödeme Düzenle' : 'Sermaye Ödemesi Ekle'}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body">
          <div className="finfo" style={{ marginBottom: 10 }}>
            Bu ödeme <b>kasa bakiyesini etkilemez</b>. "Para Nereye Gitti" alanında "Kasaya yatırıldı" seçilirse otomatik kasa girişi eklenir.
          </div>
          <div className="fg2">
            <div className="fr"><label>Ortak *</label>
              <select value={ortakId} onChange={e => setOrtakId(Number(e.target.value))}>
                <option value={0}>-- Ortak Seçin --</option>
                {ortaklar.map(o => <option key={o.id} value={o.id}>{o.ad} (%{o.pay || 0})</option>)}
              </select>
            </div>
            <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
          </div>
          <div className="fg2">
            <div className="fr"><label>Tutar (₺) *</label><input type="number" value={tutar} onChange={e => setTutar(Number(e.target.value))} /></div>
            <div className="fr"><label>Ödeme Türü</label>
              <select value={tur} onChange={e => setTur(e.target.value as Odeme['tur'])}>
                <option value="nakit">Nakit</option>
                <option value="havale">Havale/EFT</option>
                <option value="cek">Çek</option>
              </select>
            </div>
          </div>
          <div className="fr"><label>Durum</label>
            <select value={durum} onChange={e => setDurum(e.target.value as Odeme['durum'])}>
              <option value="odendi">Ödendi</option>
              <option value="bekliyor">Bekliyor (Planlanan)</option>
            </select>
          </div>
          <div className="fr"><label>Açıklama</label><input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)} /></div>
          <div className="fr"><label>💡 Para Nereye Gitti?</label>
            <select value={hedef || ''} onChange={e => setHedef((e.target.value || null) as Odeme['hedef'])}>
              <option value="">Belirtilmemiş</option>
              <option value="kasaya">💰 Kasaya yatırıldı</option>
              <option value="cariye">👥 Cari hesaba ödendi</option>
              <option value="direkt">🏦 Direkt ödeme yapıldı (kira, fatura vs.)</option>
              <option value="diger">📝 Diğer</option>
            </select>
          </div>
          {hedef && (
            <div className="fr"><label>Hedef Açıklama</label>
              <input type="text" value={hedefAciklama} onChange={e => setHedefAciklama(e.target.value)} placeholder="Örn: Kira ödemesi, H2O faturası..." />
            </div>
          )}
          {seciliOrtak && (
            <div className="fsuccess">
              {seciliOrtak.ad} {seciliOrtak.hedef ? `— Hedef: ₺${fmt(seciliOrtak.hedef)}` : ''}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── İade/Mahsup Ekle Modal ────────────────────────────────
function IadeModal({ ortakId, ortaklar, odemeler, iadeler, onClose, onSaved }: {
  ortakId: number | null; ortaklar: Ortak[]; odemeler: Odeme[]; iadeler: Iade[]; onClose: () => void; onSaved: () => void
}) {
  const [selOrtakId, setSelOrtakId] = useState(ortakId || ortaklar[0]?.id || 0)
  const [tarih, setTarih] = useState(today())
  const [tur, setTur] = useState<Iade['tur']>('nakit_iade')
  const [tutar, setTutar] = useState(0)
  const [aciklama, setAciklama] = useState('')
  const [kasaEtki, setKasaEtki] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const o = ortaklar.find(x => x.id === selOrtakId)
  const odendi = odemeler.filter(x => x.ortak_id === selOrtakId && x.durum === 'odendi').reduce((a, x) => a + Number(x.tutar || 0), 0)
  const iadedilen = iadeler.filter(x => x.ortak_id === selOrtakId).reduce((a, x) => a + Number(x.tutar || 0), 0)
  const fazla = Math.max(0, odendi - Number(o?.hedef || 0))
  const kalan = odendi - iadedilen

  async function kaydet() {
    if (!selOrtakId || !tutar) { alert('Ortak ve tutar zorunludur!'); return }
    setKaydediliyor(true)
    await fetch('/api/sermaye/iadeler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ortak_id: selOrtakId, tarih, tur, tutar, aciklama, kasa_etki: kasaEtki }),
    })
    setKaydediliyor(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          ↩️ İade / Mahsup Ekle
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body">
          {o && (
            <div className="finfo" style={{ marginBottom: 10 }}>
              <b>{o.ad}</b> — Ödenen: ₺{fmt(odendi)} | Hedef: ₺{fmt(o.hedef || 0)} |{' '}
              <span style={{ color: 'var(--a)', fontWeight: 600 }}>Fazla: ₺{fmt(fazla)}</span> | İade Edilmemiş: <b>₺{fmt(kalan)}</b>
            </div>
          )}
          <div className="fg2">
            <div className="fr"><label>Ortak *</label>
              <select value={selOrtakId} onChange={e => setSelOrtakId(Number(e.target.value))}>
                {ortaklar.map(x => <option key={x.id} value={x.id}>{x.ad}</option>)}
              </select>
            </div>
            <div className="fr"><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
          </div>
          <div className="fg2">
            <div className="fr"><label>İade/Mahsup Türü *</label>
              <select value={tur} onChange={e => setTur(e.target.value as Iade['tur'])}>
                <option value="nakit_iade">💵 Nakit İade — Kasadan ödendi</option>
                <option value="mahsup_mal">📦 Mal Mahsubu — Ürün/kimyasal verildi</option>
                <option value="mahsup_makine">🔧 Makine/Ekipman Mahsubu</option>
                <option value="mahsup_kira">🏢 Kira/Hizmet Mahsubu</option>
                <option value="diger">📋 Diğer Mahsup</option>
              </select>
            </div>
            <div className="fr"><label>Tutar (₺) *</label><input type="number" value={tutar} onChange={e => setTutar(Number(e.target.value))} /></div>
          </div>
          <div className="fr"><label>Açıklama</label>
            <input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="Örn: H2O2 kimyasal bedeli, Makine alımı mahsubu..." />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--surf2)', padding: 10, borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={kasaEtki} onChange={e => setKasaEtki(e.target.checked)} style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>💸 Operasyonel Kasadan çıkış olarak da işle</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 1 }}>Nakit iade veya kasadan yapılan ödemelerde işaretleyin — Kasa çıkışı otomatik eklenir</div>
            </div>
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>İptal</button>
          <button className="btn pr" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor...' : '💾 Kaydet'}</button>
        </div>
      </div>
    </div>
  )
}
