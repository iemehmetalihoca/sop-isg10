# LOTO SOP Editor

LOTO SOP ve Kilitleme / Etiketleme Talimatı dokümanlarının tarayıcı üzerinden hazırlanması, düzenlenmesi ve standart formatta dışa aktarılması için geliştirilmiş web uygulamasıdır.

## Teknik yapı

- Next.js 16.3.4
- React 19.2.8
- TypeScript
- Zustand + Immer
- Zod
- IndexedDB + Dexie
- dnd-kit
- docx

Uygulamanın mevcut sürümünde backend API ve merkezi veritabanı bulunmamaktadır. Doküman verisi çalışma sırasında tarayıcıda tutulur. Otomatik yerel taslak kaydı IndexedDB üzerinde yapılır.

## Gereksinimler

- Node.js 22
- npm
- Güncel Chromium tabanlı tarayıcı (Microsoft Edge / Google Chrome)

## Geliştirme ortamında çalıştırma

```powershell
npm install
npm run dev
```

Uygulama varsayılan olarak aşağıdaki adreste açılır:

```text
http://localhost:5174
```

## Tip kontrolü

```powershell
npm run typecheck
```

## Production build

```powershell
npm install
npm run build
```

Build tamamlandığında statik yayın paketi `out/` klasöründe oluşur.

`out/` klasörü IIS veya standart bir statik web sunucusu üzerinden yayınlanabilir. Mevcut sürüm çalışmak için sürekli çalışan Node.js servisine ihtiyaç duymaz.

## Ana klasörler

```text
src/app/                 Uygulama giriş noktaları
src/components/          Editör ve doküman bileşenleri
src/lib/                 Veri modeli, validasyon, dosya ve Word işlemleri
src/store/               Uygulama state yönetimi
src/styles/              Ekran, A4 ve yazdırma stilleri
src/assets/              Uygulama içinde kullanılan ikon ve görseller
public/                  Statik genel dosyalar
```

## Veri ve dosya yapısı

- Otomatik taslak: Browser IndexedDB
- Ana yedek formatı: JSON
- Düzenlenebilir çıktı: DOCX
- PDF: Tarayıcının Yazdır / PDF akışı
- JSON içe aktarma sırasında veri Zod şeması ile doğrulanır ve normalize edilir.
- JSON dışa aktarmadan önce veri bütünlüğü için round-trip kontrolü yapılır.

## Güvenlik ve yetkilendirme

Bu kaynak paketinde kullanıcı giriş sistemi, rol yönetimi veya merkezi erişim kontrolü bulunmamaktadır. Kurumsal ağda kullanıcı bazlı erişim gerekiyorsa kimlik doğrulama ve yetkilendirme şirketin mevcut IT standardına göre ayrıca eklenmelidir.

## Deployment notu

Bu paket herhangi bir belirli kaynak kod platformuna veya hosting sağlayıcısına bağlı değildir. Production build sonucu oluşan `out/` klasörü statik web içeriğidir.

IIS kullanılması halinde temel beklenti:

1. `npm run build` ile build alınması.
2. Oluşan `out/` klasörünün onaylı web dizinine aktarılması.
3. IIS üzerinde Static Content özelliğinin aktif olması.
4. Uygulamanın HTTPS ve şirket erişim politikalarına uygun şekilde yayınlanması.
5. Yeni sürüm geçişlerinde mevcut production paketin geri dönüş için korunması.

## Sürüm

- Uygulama sürümü: 4.2.56
- Doküman veri şeması: 4.2


## 4.2.55 Notu
- 5. LOTO Talimatı bölümündeki Fotoğraf hücreleri ile 2. Kullanılacak LOTO Ekipmanları bölümündeki ekipman fotoğrafları, kapak fotoğrafındaki gibi sürükleyerek taşıma ve kenar/köşe tutamaçlarıyla yeniden boyutlandırma desteği almıştır.


## 4.2.56 Notu
- # KİLİTLEME / ETİKETLEME TALİMATI sayfasındaki **Kilitleme Ekipmanı** sütunu görsel giriş alanına dönüştürüldü.
- Her satıra birden fazla görsel yüklenebilir; görseller hücre içinde yan yana gösterilir.
- Hücreye çoklu dosya seçimi veya sürükle-bırak ile görsel eklenebilir; görseller tek tek silinebilir.
- Word çıktısında da Kilitleme Ekipmanı görselleri aynı sütunda yan yana yer alır.
