# Sermaye Modülü — Kurulum Adımları

## 1. Supabase
`supabase/migrations/001_sermaye.sql` dosyasını Supabase SQL Editor'e yapıştırıp çalıştırın.
Bu, 3 yeni tablo oluşturur: `mlk_sermaye_ortaklar`, `mlk_sermaye_odemeler`, `mlk_sermaye_iadeler`.

## 2. Dosyaları projeye yerleştirme
GitHub web arayüzünden yüklerken **her klasöre tek tek girip** o klasördeki dosyayı
yükleyin (klasör düzleşmesi sorununu önlemek için — bunu zaten biliyorsunuz).

```
app/api/sermaye/ortaklar/route.ts
app/api/sermaye/ortaklar/[id]/route.ts
app/api/sermaye/odemeler/route.ts
app/api/sermaye/odemeler/[id]/route.ts
app/api/sermaye/iadeler/route.ts
app/api/sermaye/iadeler/[id]/route.ts
app/sermaye/page.tsx
components/SermayeModule.tsx
```

`lib/supabase/server.ts` — **projenizde muhtemelen zaten var** (kasa/cari
route'larınızda kullandığınız `req.cookies.get()` helper'ı). Eğer varsa bu
dosyayı YÜKLEMEYİN, mevcut helper'ınızın adı/yolu `@/lib/supabase/server` ile
aynı değilse yeni route dosyalarındaki `import` satırını kendi helper'ınıza
göre güncelleyin.

## 3. ⚠️ En Kritik Adım — `mlk_kasa` kolon uyumu
`odemeler/route.ts`, `odemeler/[id]/route.ts` ve `iadeler/route.ts`
dosyalarında, sermaye ödemesi "kasaya" işaretlenince otomatik olarak
`mlk_kasa` tablosuna bir satır ekleniyor:

```ts
{ tarih, ad, tutar, tip: 'gelir' }   // veya 'gider'
```

Sizin `mlk_kasa` tablonuzda gerçek kolon adları farklı olabilir (örn. `tip`
yerine `tur`, ya da gelir/gider için iki ayrı tablo kullanıyor olabilirsiniz —
eski HTML'de `DB.kasa.gelir` ve `DB.kasa.gider` ayrı dizilerdi). Bu 3 dosyada
`kasaInsertPayload` / `.insert({...})` bloklarını arayıp gerçek şemanıza göre
düzenlemeniz gerekiyor. Düzenlemeden önce Supabase'de şu sorguyu çalıştırıp
bana sonucunu gönderirseniz, ben de bu 3 dosyayı sizin için düzeltebilirim:

```sql
select * from mlk_kasa limit 3;
```

## 4. Menüye ekleme
Sidebar bileşeninize "Sermaye" linkini `/sermaye` route'una yönlendirecek
şekilde ekleyin (muhtemelen `PAGE_TITLES` benzeri bir haritanız vardır,
eski HTML'deki `sermaye: '🏦 Sermaye'` girdisinin karşılığı).

## 5. Test senaryosu
1. `/sermaye` sayfasını açın → boş tablolar görünmeli
2. "+ Ortak Ekle" ile 2 ortak ekleyin (örn. %50-%50 pay, hedef sermaye girin)
3. "+ Ödeme Ekle" ile bir ortağa nakit ödeme ekleyin, "Kasaya yatırıldı"
   seçip kaydedin → Supabase'de `mlk_kasa` tablosuna satır eklenip
   eklenmediğini kontrol edin (adım 3'teki uyum sorunu varsa burada hata
   alırsınız)
4. Ödemeyi silin → kasa satırının da silindiğini doğrulayın
5. "↩️ İade Ekle" ile bir ortağa mahsup kaydı ekleyin, "Kasadan çıkış" işaretleyip
   kaydedin, aynı şekilde kasa senkronunu kontrol edin

Bu adımlar geçtiyse Sermaye modülü tamamdır — sırada **Virman (Para + Hammadde)**
var, onaylarsan devam ederim.
