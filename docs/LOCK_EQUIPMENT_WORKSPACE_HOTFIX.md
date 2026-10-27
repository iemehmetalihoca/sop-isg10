# Kilitleme Ekipmanı görsel düzenleme — v4.2.56 hotfix

Bu değişiklik yalnızca **KİLİTLEME / ETİKETLEME TALİMATI** sayfasındaki **Kilitleme Ekipmanı** sütununun görsel düzenleyicisini günceller.

- Bir hücreye birden fazla görsel yüklenir veya dışarıdan sürüklenip bırakılır.
- Görsel seçilerek taşınır. Sekiz tutamakla boyutlandırılır: kenarlar bağımsız, köşeler oranlı değişir.
- Üç nokta menüsü: Değiştir, Kırp, Kopyala, Yapıştır, Sil.
- Kırpma arayüzünde sekiz tutamak ve Uygula / İptal / Orijinal bulunur.
- Görseller büyüdükçe ilgili tablo satırı aşağı uzar, küçülünce tekrar kısalır.
- Fotoğraf ekleme düğmesi, hücrenin sağ üstüne taşınmıştır. Küçük **+** ikonu yalnızca çalışma anında belirginleşir ve görsellere alan kaybettirmez.
- Eski projelerdeki sadece src/originalSrc içeren fotoğraf kayıtları varsayılan olarak iki sütunda açılır.
- Yedekle ve Yedekten Yükle işlemlerinde görsel konum ve boyutları korunur.
- Word aktarımında fotoğraflar artık sabit küçük kutulara indirgenmez; konum ve boyutları korunarak yerleşimleri görsele dönüştürülür.

## Kontrol listesi
1. İki farklı ekipman görseli yükle, iki görselin yan yana gelmesini kontrol et.
2. İlk görseli aşağı sürükle: tablo satırı uzamalı; geri sürükleyince kısalmalı.
3. Kenar ve köşe tutamaçlarını kullan; başka fotoğrafın üzerine bindirmemeli.
4. Kırp > Uygula, ardından Kırp > Orijinal işlemlerini dene.
5. Üç nokta menüsünü aç, sayfayı kaydır; menü kapanmalı.
6. Önizleme, Word, yedek indir/yükle kontrollerini yap.

### Doğrulama notu
TSX sözdizimi ve CSS ayrıştırma testleri yapıldı; bu ortamda npm paketleri indirilmediği için tam Next.js derleme ve tarayıcı testi yapılmadı.
