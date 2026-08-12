'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Tipler ───────────────────────────────────────────────
interface Ortak {
  id: number;
  ad: string;
  pay: number;
  hedef: number | null;
  tc_no: string | null;
  notlar: string | null;
}
interface Odeme {
  id: number;
  ortak_id: number;
  ortak_ad: string;
  tarih: string;
  tutar: number;
  tur: 'nakit' | 'havale' | 'cek';
  durum: 'odendi' | 'bekliyor';
  aciklama: string | null;
  hedef: 'kasaya' | 'cariye' | 'direkt' | 'diger' | null;
  hedef_aciklama: string | null;
}
interface Iade {
  id: number;
  ortak_id: number;
  ortak_ad: string;
  tarih: string;
  tur: 'nakit_iade' | 'mahsup_mal' | 'mahsup_makine' | 'mahsup_kira' | 'diger';
  tutar: number;
  aciklama: string | null;
  kasa_etki: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);

// ─── Ana Bileşen ──────────────────────────────────────────
export default function SermayeModule() {
  const [ortaklar, setOrtaklar] = useState<Ortak[]>([]);
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [iadeler, setIadeler] = useState<Iade[]>([]);
  const [loading, setLoading] = useState(true);

  const [ortakModal, setOrtakModal] = useState<{ open: boolean; data: Ortak | null }>({ open: false, data: null });
  const [odemeModal, setOdemeModal] = useState<{ open: boolean; data: Odeme | null }>({ open: false, data: null });
  const [iadeModal, setIadeModal] = useState<{ open: boolean; ortakId: number | null }>({ open: false, ortakId: null });

  const yukle = useCallback(async () => {
    setLoading(true);
    const [o, od, ia] = await Promise.all([
      fetch('/api/sermaye/ortaklar', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/sermaye/odemeler', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/sermaye/iadeler', { credentials: 'include' }).then((r) => r.json()),
    ]);
    setOrtaklar(Array.isArray(o) ? o : []);
    setOdemeler(Array.isArray(od) ? od : []);
    setIadeler(Array.isArray(ia) ? ia : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // ─── Hesaplamalar ───────────────────────────────────────
  const topOdendi = odemeler.filter((x) => x.durum === 'odendi').reduce((a, x) => a + Number(x.tutar || 0), 0);
  const topBekliyor = odemeler.filter((x) => x.durum === 'bekliyor').reduce((a, x) => a + Number(x.tutar || 0), 0);
  const topHedef = ortaklar.reduce((a, o) => a + Number(o.hedef || 0), 0);
  const topIade = iadeler.reduce((a, x) => a + Number(x.tutar || 0), 0);

  const ortakOzet = ortaklar.map((o) => {
    const odendi = odemeler
      .filter((x) => x.ortak_id === o.id && x.durum === 'odendi')
      .reduce((a, x) => a + Number(x.tutar || 0), 0);
    const bekliyor = odemeler
      .filter((x) => x.ortak_id === o.id && x.durum === 'bekliyor')
      .reduce((a, x) => a + Number(x.tutar || 0), 0);
    const iade = iadeler.filter((x) => x.ortak_id === o.id).reduce((a, x) => a + Number(x.tutar || 0), 0);
    const fazla = Math.max(0, odendi - Number(o.hedef || 0));
    const net = odendi - iade;
    return { ...o, odendi, bekliyor, iade, fazla, net };
  });

  // ─── Aksiyonlar ─────────────────────────────────────────
  async function ortakSil(id: number) {
    if (!confirm('Bu ortak ve tüm ödeme/iade kayıtları silinsin mi?')) return;
    await fetch(`/api/sermaye/ortaklar/${id}`, { method: 'DELETE', credentials: 'include' });
    yukle();
  }
  async function odemeSil(id: number) {
    if (!confirm('Bu sermaye ödeme kaydı silinsin mi?')) return;
    await fetch(`/api/sermaye/odemeler/${id}`, { method: 'DELETE', credentials: 'include' });
    yukle();
  }
  async function odendiYap(id: number) {
    await fetch(`/api/sermaye/odemeler/${id}`, { method: 'PATCH', credentials: 'include' });
    yukle();
  }
  async function iadeSil(id: number) {
    if (!confirm('Bu iade/mahsup kaydı silinsin mi?')) return;
    await fetch(`/api/sermaye/iadeler/${id}`, { method: 'DELETE', credentials: 'include' });
    yukle();
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Yükleniyor…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ⚠️ <b>Sermaye ödemeleri şirket kasasını etkilemez.</b> Bu bölüm ortakların
        yaptığı katkıları ve iade/mahsupları takip eder.
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Toplam Ödenen" value={`₺${fmt(topOdendi)}`} sub={`${odemeler.filter((x) => x.durum === 'odendi').length} ödeme`} tone="green" />
        <StatCard label="Kalan Sermaye" value={`₺${fmt(Math.max(0, topHedef - topOdendi))}`} sub={topHedef ? `Hedef: ₺${fmt(topHedef)}` : 'Hedef girilmemiş'} tone="red" />
        <StatCard label="İade / Mahsup" value={`₺${fmt(topIade)}`} sub={`${iadeler.length} kayıt`} tone="amber" />
        <StatCard label="Net Sermaye" value={`₺${fmt(topOdendi - topIade)}`} sub="Ödenen − İade" tone="blue" />
        {topBekliyor > 0 && <StatCard label="Bekleyen" value={`₺${fmt(topBekliyor)}`} tone="amber" />}
      </div>

      {/* Ortaklar Tablosu */}
      <Card
        title="👥 Ortaklar & Net Bakiye"
        action={<Btn onClick={() => setOrtakModal({ open: true, data: null })}>+ Ortak Ekle</Btn>}
      >
        <Table
          head={['#', 'Ortak', 'Pay %', 'Hedef', 'Ödenen', 'Kalan', 'Fazla Ödeme', 'İade/Mahsup', 'Net Bakiye', '']}
        >
          {ortakOzet.length === 0 ? (
            <EmptyRow cols={10} msg="Ortak eklenmemiş" />
          ) : (
            ortakOzet.map((o, i) => {
              const kalan = Math.max(0, Number(o.hedef || 0) - o.odendi);
              return (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{o.ad}</td>
                  <td className="px-3 py-2 text-right">{o.pay || 0}%</td>
                  <td className="px-3 py-2 text-right">{o.hedef ? `₺${fmt(o.hedef)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-600">₺{fmt(o.odendi)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${kalan > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {kalan > 0 ? `₺${fmt(kalan)}` : '✅ Tamam'}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-600">{o.fazla > 0 ? `₺${fmt(o.fazla)} fazla` : '—'}</td>
                  <td className="px-3 py-2 text-right text-red-600">{o.iade > 0 ? `₺${fmt(o.iade)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-blue-600">₺{fmt(o.net)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <IconBtn title="İade / Mahsup ekle" onClick={() => setIadeModal({ open: true, ortakId: o.id })}>↩️</IconBtn>
                      <IconBtn title="Düzenle" onClick={() => setOrtakModal({ open: true, data: o })}>✏️</IconBtn>
                      <IconBtn title="Sil" onClick={() => ortakSil(o.id)}>🗑</IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </Card>

      {/* Ödeme Kayıtları */}
      <Card
        title="💼 Sermaye Ödeme Kayıtları"
        action={<Btn onClick={() => setOdemeModal({ open: true, data: null })}>+ Ödeme Ekle</Btn>}
      >
        <Table head={['#', 'Tarih', 'Ortak', 'Açıklama', 'Tür', 'Tutar', 'Durum', '']}>
          {odemeler.length === 0 ? (
            <EmptyRow cols={8} msg="Sermaye ödeme kaydı yok" />
          ) : (
            [...odemeler]
              .sort((a, b) => (a.tarih < b.tarih ? 1 : -1))
              .map((x, i) => (
                <tr key={x.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{x.tarih}</td>
                  <td className="px-3 py-2 font-medium">{x.ortak_ad}</td>
                  <td className="px-3 py-2">{x.aciklama || '—'}</td>
                  <td className="px-3 py-2">
                    <Badge>{x.tur === 'nakit' ? 'Nakit' : x.tur === 'havale' ? 'Havale' : 'Çek'}</Badge>
                  </td>
                  <td className={`px-3 py-2 text-right font-bold ${x.durum === 'odendi' ? 'text-green-600' : 'text-amber-600'}`}>
                    ₺{fmt(x.tutar)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={x.durum === 'odendi' ? 'green' : 'amber'}>
                      {x.durum === 'odendi' ? 'Ödendi' : 'Bekliyor'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {x.durum === 'bekliyor' && (
                        <IconBtn title="Ödendi işaretle" onClick={() => odendiYap(x.id)}>✅</IconBtn>
                      )}
                      <IconBtn title="Düzenle" onClick={() => setOdemeModal({ open: true, data: x })}>✏️</IconBtn>
                      <IconBtn title="Sil" onClick={() => odemeSil(x.id)}>🗑</IconBtn>
                    </div>
                  </td>
                </tr>
              ))
          )}
        </Table>
      </Card>

      {/* İade / Mahsup Kayıtları */}
      <Card
        title="↩️ İade & Mahsup Kayıtları"
        action={<Btn onClick={() => setIadeModal({ open: true, ortakId: null })}>+ İade / Mahsup Ekle</Btn>}
      >
        <Table head={['#', 'Tarih', 'Ortak', 'Tür', 'Açıklama', 'Tutar', 'Kasaya Etki', '']}>
          {iadeler.length === 0 ? (
            <EmptyRow cols={8} msg="İade/mahsup kaydı yok" />
          ) : (
            [...iadeler]
              .sort((a, b) => (a.tarih < b.tarih ? 1 : -1))
              .map((x, i) => (
                <tr key={x.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{x.tarih}</td>
                  <td className="px-3 py-2 font-medium">{x.ortak_ad}</td>
                  <td className="px-3 py-2">
                    <Badge tone="red">
                      {{
                        nakit_iade: 'Nakit İade',
                        mahsup_mal: 'Mal Mahsubu',
                        mahsup_makine: 'Makine Mahsubu',
                        mahsup_kira: 'Kira Mahsubu',
                        diger: 'Diğer Mahsup',
                      }[x.tur]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{x.aciklama || '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-red-600">₺{fmt(x.tutar)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={x.kasa_etki ? 'red' : 'gray'}>{x.kasa_etki ? 'Kasa Çıkışı' : 'Kasa Etkilemez'}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <IconBtn title="Sil" onClick={() => iadeSil(x.id)}>🗑</IconBtn>
                  </td>
                </tr>
              ))
          )}
        </Table>
        {topIade > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-sm bg-gray-50">
            Toplam İade/Mahsup: <b className="text-red-600">₺{fmt(topIade)}</b>
          </div>
        )}
      </Card>

      {ortakModal.open && (
        <OrtakModal
          data={ortakModal.data}
          onClose={() => setOrtakModal({ open: false, data: null })}
          onSaved={yukle}
        />
      )}
      {odemeModal.open && (
        <OdemeModal
          data={odemeModal.data}
          ortaklar={ortaklar}
          onClose={() => setOdemeModal({ open: false, data: null })}
          onSaved={yukle}
        />
      )}
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
  );
}

// ─── Ortak Ekle/Düzenle Modal ─────────────────────────────
function OrtakModal({
  data,
  onClose,
  onSaved,
}: {
  data: Ortak | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ad, setAd] = useState(data?.ad || '');
  const [pay, setPay] = useState(data?.pay ?? 50);
  const [hedef, setHedef] = useState(data?.hedef ?? 0);
  const [tc, setTc] = useState(data?.tc_no || '');
  const [not, setNot] = useState(data?.notlar || '');
  const [saving, setSaving] = useState(false);

  async function kaydet() {
    if (!ad.trim()) return alert('Ad zorunludur!');
    setSaving(true);
    const payload = { ad, pay, hedef: hedef || null, tc_no: tc, notlar: not };
    const url = data ? `/api/sermaye/ortaklar/${data.id}` : '/api/sermaye/ortaklar';
    await fetch(url, {
      method: data ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={data ? 'Ortak Düzenle' : 'Yeni Ortak Ekle'} onClose={onClose} width="sm">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ortak Adı *"><input className="inp" value={ad} onChange={(e) => setAd(e.target.value)} /></Field>
        <Field label="Pay Oranı (%)"><input type="number" className="inp" value={pay} onChange={(e) => setPay(Number(e.target.value))} min={0} max={100} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="Hedef Sermaye (₺)"><input type="number" className="inp" value={hedef} onChange={(e) => setHedef(Number(e.target.value))} placeholder="Boş bırakılabilir" /></Field>
        <Field label="TC No / Vergi No"><input className="inp" value={tc} onChange={(e) => setTc(e.target.value)} /></Field>
      </div>
      <Field label="Not"><textarea className="inp mt-3" value={not} onChange={(e) => setNot(e.target.value)} /></Field>
      <ModalFooter onClose={onClose} onSave={kaydet} saving={saving} />
    </Modal>
  );
}

// ─── Ödeme Ekle/Düzenle Modal ─────────────────────────────
function OdemeModal({
  data,
  ortaklar,
  onClose,
  onSaved,
}: {
  data: Odeme | null;
  ortaklar: Ortak[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ortakId, setOrtakId] = useState(data?.ortak_id || 0);
  const [tarih, setTarih] = useState(data?.tarih || today());
  const [tutar, setTutar] = useState(data?.tutar || 0);
  const [tur, setTur] = useState<Odeme['tur']>(data?.tur || 'nakit');
  const [durum, setDurum] = useState<Odeme['durum']>(data?.durum || 'odendi');
  const [aciklama, setAciklama] = useState(data?.aciklama || '');
  const [hedef, setHedef] = useState<Odeme['hedef']>(data?.hedef ?? null);
  const [hedefAciklama, setHedefAciklama] = useState(data?.hedef_aciklama || '');
  const [saving, setSaving] = useState(false);

  const seciliOrtak = ortaklar.find((o) => o.id === ortakId);

  async function kaydet() {
    if (!ortakId) return alert('Ortak seçiniz!');
    if (!tutar) return alert('Tutar giriniz!');
    setSaving(true);
    const payload = {
      ortak_id: ortakId,
      tarih,
      tutar,
      tur,
      durum,
      aciklama,
      hedef,
      hedef_aciklama: hedef ? hedefAciklama : null,
    };
    const url = data ? `/api/sermaye/odemeler/${data.id}` : '/api/sermaye/odemeler';
    await fetch(url, {
      method: data ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={data ? 'Ödeme Düzenle' : 'Sermaye Ödemesi Ekle'} onClose={onClose} width="sm">
      <div className="rounded bg-blue-50 text-blue-800 text-xs px-3 py-2 mb-3">
        Bu ödeme <b>kasa bakiyesini etkilemez</b>. Sadece sermaye takibi içindir — "Para Nereye Gitti" alanında "Kasaya yatırıldı" seçilirse otomatik kasa girişi eklenir.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ortak *">
          <select className="inp" value={ortakId} onChange={(e) => setOrtakId(Number(e.target.value))}>
            <option value={0}>-- Ortak Seçin --</option>
            {ortaklar.map((o) => (
              <option key={o.id} value={o.id}>{o.ad} (%{o.pay || 0})</option>
            ))}
          </select>
        </Field>
        <Field label="Tarih"><input type="date" className="inp" value={tarih} onChange={(e) => setTarih(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Field label="Tutar (₺) *"><input type="number" className="inp" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} /></Field>
        <Field label="Ödeme Türü">
          <select className="inp" value={tur} onChange={(e) => setTur(e.target.value as Odeme['tur'])}>
            <option value="nakit">Nakit</option>
            <option value="havale">Havale/EFT</option>
            <option value="cek">Çek</option>
          </select>
        </Field>
        <Field label="Durum">
          <select className="inp" value={durum} onChange={(e) => setDurum(e.target.value as Odeme['durum'])}>
            <option value="odendi">Ödendi</option>
            <option value="bekliyor">Bekliyor (Planlanan)</option>
          </select>
        </Field>
      </div>
      <Field label="Açıklama"><input className="inp mt-3" value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></Field>
      <Field label="💡 Para Nereye Gitti?">
        <select className="inp mt-3" value={hedef || ''} onChange={(e) => setHedef((e.target.value || null) as Odeme['hedef'])}>
          <option value="">Belirtilmemiş</option>
          <option value="kasaya">💰 Kasaya yatırıldı</option>
          <option value="cariye">👥 Cari hesaba ödendi</option>
          <option value="direkt">🏦 Direkt ödeme yapıldı (kira, fatura vs.)</option>
          <option value="diger">📝 Diğer</option>
        </select>
      </Field>
      {hedef && (
        <Field label="Hedef Açıklama">
          <input className="inp mt-3" value={hedefAciklama} onChange={(e) => setHedefAciklama(e.target.value)} placeholder="Örn: Kira ödemesi, H2O faturası..." />
        </Field>
      )}
      {seciliOrtak && (
        <div className="mt-3 rounded bg-green-50 text-green-800 text-xs px-3 py-2">
          {seciliOrtak.ad} {seciliOrtak.hedef ? `— Hedef: ₺${fmt(seciliOrtak.hedef)}` : ''}
        </div>
      )}
      <ModalFooter onClose={onClose} onSave={kaydet} saving={saving} />
    </Modal>
  );
}

// ─── İade/Mahsup Ekle Modal ────────────────────────────────
function IadeModal({
  ortakId,
  ortaklar,
  odemeler,
  iadeler,
  onClose,
  onSaved,
}: {
  ortakId: number | null;
  ortaklar: Ortak[];
  odemeler: Odeme[];
  iadeler: Iade[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selOrtakId, setSelOrtakId] = useState(ortakId || ortaklar[0]?.id || 0);
  const [tarih, setTarih] = useState(today());
  const [tur, setTur] = useState<Iade['tur']>('nakit_iade');
  const [tutar, setTutar] = useState(0);
  const [aciklama, setAciklama] = useState('');
  const [kasaEtki, setKasaEtki] = useState(false);
  const [saving, setSaving] = useState(false);

  const o = ortaklar.find((x) => x.id === selOrtakId);
  const odendi = odemeler.filter((x) => x.ortak_id === selOrtakId && x.durum === 'odendi').reduce((a, x) => a + Number(x.tutar || 0), 0);
  const iadedilen = iadeler.filter((x) => x.ortak_id === selOrtakId).reduce((a, x) => a + Number(x.tutar || 0), 0);
  const fazla = Math.max(0, odendi - Number(o?.hedef || 0));
  const kalan = odendi - iadedilen;

  async function kaydet() {
    if (!selOrtakId || !tutar) return alert('Ortak ve tutar zorunludur!');
    setSaving(true);
    await fetch('/api/sermaye/iadeler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ortak_id: selOrtakId, tarih, tur, tutar, aciklama, kasa_etki: kasaEtki }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title="↩️ İade / Mahsup Ekle" onClose={onClose} width="md">
      {o && (
        <div className="rounded bg-gray-50 text-xs px-3 py-2 mb-3">
          <b>{o.ad}</b> — Ödenen: ₺{fmt(odendi)} | Hedef: ₺{fmt(o.hedef || 0)} |{' '}
          <span className="text-amber-600 font-semibold">Fazla: ₺{fmt(fazla)}</span> | İade Edilmemiş:{' '}
          <span className="font-semibold">₺{fmt(kalan)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ortak *">
          <select className="inp" value={selOrtakId} onChange={(e) => setSelOrtakId(Number(e.target.value))}>
            {ortaklar.map((x) => (
              <option key={x.id} value={x.id}>{x.ad}</option>
            ))}
          </select>
        </Field>
        <Field label="Tarih"><input type="date" className="inp" value={tarih} onChange={(e) => setTarih(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="İade/Mahsup Türü *">
          <select className="inp" value={tur} onChange={(e) => setTur(e.target.value as Iade['tur'])}>
            <option value="nakit_iade">💵 Nakit İade — Kasadan ödendi</option>
            <option value="mahsup_mal">📦 Mal Mahsubu — Ürün/kimyasal verildi</option>
            <option value="mahsup_makine">🔧 Makine/Ekipman Mahsubu</option>
            <option value="mahsup_kira">🏢 Kira/Hizmet Mahsubu</option>
            <option value="diger">📋 Diğer Mahsup</option>
          </select>
        </Field>
        <Field label="Tutar (₺) *"><input type="number" className="inp" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} /></Field>
      </div>
      <Field label="Açıklama">
        <input className="inp mt-3" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Örn: H2O2 kimyasal bedeli, Makine alımı mahsubu..." />
      </Field>
      <label className="mt-3 flex items-start gap-2 rounded bg-gray-50 p-3 text-xs cursor-pointer">
        <input type="checkbox" checked={kasaEtki} onChange={(e) => setKasaEtki(e.target.checked)} className="mt-0.5" />
        <div>
          <div className="font-semibold">💸 Operasyonel Kasadan çıkış olarak da işle</div>
          <div className="text-gray-500 mt-0.5">Nakit iade veya kasadan yapılan ödemelerde işaretleyin — Kasa çıkışı otomatik eklenir</div>
        </div>
      </label>
      <ModalFooter onClose={onClose} onSave={kaydet} saving={saving} />
    </Modal>
  );
}

// ─── Küçük UI Yardımcıları ─────────────────────────────────
function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'green' | 'red' | 'amber' | 'blue' }) {
  const toneMap = {
    green: 'border-green-200 bg-green-50 text-green-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-lg border p-3 ${toneMap[tone]}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="font-semibold text-sm">{title}</div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 text-left text-gray-500 text-xs">
          {head.map((h, i) => (
            <th key={i} className="px-3 py-2 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-6 text-center text-gray-400 text-sm">{msg}</td>
    </tr>
  );
}

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray' }) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${toneMap[tone]}`}>{children}</span>;
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition">
      {children}
    </button>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-sm">
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, width = 'sm', children }: { title: string; onClose: () => void; width?: 'sm' | 'md'; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${width === 'md' ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">{title}</div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
      <button onClick={onClose} className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">İptal</button>
      <button onClick={onSave} disabled={saving} className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Kaydediliyor…' : '💾 Kaydet'}
      </button>
    </div>
  );
}

/*
  Kullanılan `.inp` class'ı için global CSS'inize şunu ekleyin
  (yoksa aşağıdaki class'ları doğrudan input'lara Tailwind ile yazabilirsiniz):

  .inp {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
  }
  .inp:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
  }
*/
