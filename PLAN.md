# Adnan Walk — Proje Planı

Three.js koridoru üzerine kurulu tek sayfalık portfolyo. Ziyaretçi kaydırdıkça kamera
koridorda ilerliyor; her bölüm uçuşun bir durağı. Bu belge sitenin bugünkü hâlini,
altyapının kodda görünmeyen kurallarını ve sıradaki işi tarif ediyor.

| | |
|---|---|
| Depo | `Delixch/adnanwalk` |
| Canlı | adnanwalk.vercel.app |
| Son commit | `d2a5506` |
| Güncelleme | 13 Ağustos 2026 |

---

## Bugünkü durum

- **6.797 satır** kod, beş dosyada. `main.js` tek başına 3.242.
- **5 bölüm**: Giriş, Projeler, Yetenekler, Adnan Walk, İletişim.
- **8 commit** bu hafta: layout, yükleme, silme, ses, palet, balonlar.
- **2 açık iş**: rehber sistemi ve iletişim formu.

---

## Mimari

Yapı kasıtlı olarak sade: derleme aşaması Vite, çalışma zamanı düz tarayıcı JavaScript.
Framework yok, durum yönetimi kütüphanesi yok. Sunucu tarafı sadece dört küçük fonksiyon.

**Önyüz** — Three.js sahnesi `#webgl-canvas` üzerinde sabit duruyor, tüm HTML bölümleri
onun üstünde kayıyor. Kamera uçuşu GSAP ScrollTrigger ile scroll'a bağlı (`scrub: 1.8`).

**Medya** — Dosyalar Cloudinary'de, kayıtlar Supabase `adnan_walk_media` tablosunda.
Tarayıcı `/api/sign`'dan imza alıp dosyayı doğrudan Cloudinary'ye yüklüyor; sunucuya
sadece URL geliyor.

**Sunucu** — Vercel fonksiyonları: `sign`, `upload`, `delete`, `media`. Geliştirmede
aynı uçlar `vite.config.js` içindeki ara katmanla taklit ediliyor.

**Ses** — Dosya yok, hepsi Web Audio ile üretiliyor. Ortam pad'i, hover çınlaması,
scroll uğultusu, balon patlaması ve düşme sesi tek bir master bus üzerinden geçiyor.

---

## Kodda görünmeyen kurallar

Bu dördü koda bakarak anlaşılmaz ve üçü zaten birer hatanın bedeliydi. Bir şey
bozulduğunda önce buraya bak.

### Bölge eşleşmesi
Supabase `eu-west-1`'de (İrlanda). `vercel.json` fonksiyonları bu yüzden `dub1`'e
sabitliyor. Birini taşıyıp diğerini bırakırsan her veritabanı yazması Atlantik'i geçer
ve `fetch failed` hataları geri gelir.

### Silme yetkisi
Tablodaki RLS politikaları `anon` rolüne DELETE izni **vermiyor**, ve PostgREST
engellenen silmeyi hata değil, sıfır satır silen bir başarı olarak bildiriyor. Silme
yalnızca `SUPABASE_SERVICE_KEY` tanımlıyken çalışır. Silme sessizce durursa ilk
bakılacak yer bu.

### Yükleme yolu
Vercel bir fonksiyona 4,5 MB'dan büyük gövde kabul etmiyor. Dosya sunucudan geçmediği
için bu tavan artık geçerli değil; video yükleme buna bağlı. `/api/upload`'a dosya
göndermeye geri dönme.

### Anlam renkleri
Site paleti üç renk (`#f13024` crimson, `#f97316` turuncu, `#fbbf5a` açık altın), ama
bildirimlerdeki başarı yeşili ve hata kırmızısı **kasıtlı olarak dışarıda**. Marka
değil, anlam taşıyorlar; palete katılırlarsa "yüklendi" ile "yükleme başarısız" aynı
görünür.

---

## Bu hafta biten

| Commit | İş | Neden |
|---|---|---|
| `a2c40da` | Projeler bölümü ve mobil davranış | Fazladan bir `</div>` kapsayıcıyı erken kapatıyordu; kart sütunu flex kabının çocuğu değil kardeşiydi. Mobilde akordeon yerine yatay kaydırmalı kart destesi geldi. |
| `f0db331` | Yükleme hataları ve fonksiyon bölgesi | Ham sürücü hatası tarayıcıya dönüyordu — ekranda `TypeError: fetch failed` yazmasının sebebi buydu. Veritabanı yazması yeniden denemeli hâle geldi, fonksiyonlar Dublin'e taşındı. |
| `fea0153` | Doğrudan Cloudinary yükleme | 3,2 MB tavanı kalktı, video gerçekten yüklenebiliyor. Büyük fotoğraflar tarayıcıda küçültülüyor, ilerleme çubuğu gerçek yüzdeyi gösteriyor. |
| `75136b0` | Medya silme | Çöp kutusu "silindi" deyip hiçbir şey silmiyordu. Servis anahtarına geçildi; sıfır satırlık silme artık hata olarak bildiriliyor. |
| `d0da101` | Ortam sesi | Rezonanslı filtre sekiz saniyede bir süpürüyordu — siren şekli. Testere dişi kalktı, hareket artık kaydırılmış üçüncü sesin vuruşundan geliyor. |
| `6dba588` | Palet birleştirme | Dosyalara dağılmış 14 sabit renk üç değişkene bağlandı. Matrix yeşili, cyan ve fuşya gitti. |
| `d2a5506` | Balonlar ve 3D çerçevelerin kaldırılması | Koridordaki üç foto çerçevesi bölüm içeriğinin üstüne biniyordu. Yerine araç ikonu taşıyan balonlar geldi: yükselir, kartın üstünde patlar, ikonlar sayfanın altında yığılır. |

---

## Sıradaki iş — rehber sistemi

Çalışmalarım bölümündeki üç kart birer rehber kategorisine dönüşecek. Kart başlığının
altında o kategorinin konuları listelenecek; bir konuya basılınca açılan pencerede o konu
anlatılacak. **Yan paneldeki video ve efektler olduğu gibi kalıyor.**

### Kategoriler

**AI Promptları** — ChatGPT promptları · Kodlama promptları · React promptları ·
Debug promptları · Proje oluşturma promptları · Hazır prompt ve kullanım örneği

**Kod & Kurulum** — React kurulumu · TypeScript kurulumu · JavaScript örnekleri ·
npm/pnpm komutları · Script kurulumu · API entegrasyonları · Hata çözümü ·
Adım adım projeler

**AI ile Proje Yap** — Bu projeyi AI ile nasıl yaparım · Prompt'tan sonuca akış ·
Örnek mini projeler · React + Tailwind · Next.js · API kullanımı · Git/GitHub ·
Deploy rehberleri

### Adımlar

**1. İçerik katmanı**
Yeni `guides.js` dosyası. Tüm metin, kod örneği ve komut burada durur; HTML'e gömülmez,
böylece konu eklemek tek kayıt eklemek olur.
- Kategori → konu → bölüm hiyerarşisi
- Her bölüm: başlık, metin, isteğe bağlı kod bloğu (dil ve dosya adıyla)

*Çıktı: veri şeması ve ilk kategorinin içeriği*

**2. Rehber penceresi**
Ayrı bir `#guide-modal`. Mevcut proje modalı tek kod bloğu için kurulmuş, yeniden
kullanmaya uygun değil.
- Solda kategori ve konu gezinmesi, mobilde üstte yatay şerit
- Pencereyi kapatmadan konular arası geçiş
- `Esc` ve arka plan tıklamasıyla kapanma, odak tuzağı, açıkken sayfa kaydırması kilitli

*Çıktı: gezinilebilir, boş içerikle çalışan pencere*

**3. Kod blokları ve kopyalama**
Her blokta dosya adı, dil etiketi ve kopyalama düğmesi. Kütüphane eklenmeyecek;
sözdizimi renklendirmesi kendi kurallarımızla, palete bağlı.
- `navigator.clipboard`, desteklenmeyen ortam için yedek yol
- Kopyalandı geri bildirimi, uzun satırlar blok içinde kayar

*Çıktı: kopyalanabilir, okunabilir kod sunumu*

**4. Kartların bağlanması**
Üç kartın başlığı ve konu listesi yerine oturur, konular pencereyi açar.
- Kart gövdesindeki mevcut tıklama davranışı korunur, konu düğmeleri onu ezmez
- Mobilde kart destesi ve dokunma hedefleri gözden geçirilir

*Çıktı: uçtan uca çalışan sistem, ilk kategoriyle test edilebilir*

**5. Kalan içerik**
Kod & Kurulum ile AI ile Proje Yap kategorileri doldurulur. Sistem değişmez, sadece
veri eklenir.

*Çıktı: 22 konunun tamamı yayında*

### Karar bekleyen: içerik derinliği

Sistem her durumda aynı. Değişen tek şey ne kadar metin yazılacağı ve kaç tur süreceği.

- **Dolu dolu** — Her konu için gerçek anlatım, çalışan kod örnekleri, kopyalanabilir
  komutlar. Birkaç tur sürer, site ilk günden dolu açılır.
- **Kısa** — Konu başına bir iki paragraf ve tek kod bloğu. Tek turda biter, sonra
  istediğin konular genişletilir.
- **Boş iskelet** — Sadece sistem kurulur, metinleri sen yazarsın. En hızlısı, ama
  açılışta içerik olmaz.

---

## İletişim formu — bozuk

Form şu anda hiçbir yere göndermiyor. Ziyaretçi adını, e-postasını ve mesajını yazıyor,
"Mesajınız Alındı!" uyarısı çıkıyor, veri anında kayboluyor. Sana ulaşmıyor, hiçbir yere
kaydedilmiyor.

Önerilen çözüm iki katmanlı: mesaj önce Supabase'de yeni bir tabloya yazılır, sonra
e-posta olarak gönderilir. Mail servisi düşse, kota dolsa veya mesaj spam'e düşse bile
kayıt veritabanında durur. Tek noktaya bağlı çözümlerde mail kaybolursa geriye hiçbir
şey kalmaz.

**Domain gerekmiyor.** Resend'in ücretsiz katmanı `onboarding@resend.dev` adresinden
kendi hesap e-postana göndermene izin veriyor — iletişim formunun ihtiyacı tam olarak bu.
Domain, keyfi adreslere mail atmak istendiğinde gerekiyor.

Alternatifler:
- **Sunucu kodu istemeyen**: Web3Forms (250/ay), Formspree (50/ay), FormSubmit
- **Tek gönderici doğrulamasıyla**: SendGrid (100/gün), Brevo (300/gün)
- **Önerilmeyen**: Gmail SMTP — Vercel'in serverless ortamında bağlantılar kararsız

---

## Bilinen riskler

| Konu | Durum | Not |
|---|---|---|
| `main.js` boyutu | 3.242 satır | Tek modül: sahne, ses, galeri, yükleme ve balonlar aynı dosyada. Rehber sistemi ayrı dosyaya gidiyor; sonra ses ve sahne de ayrılabilir. |
| CSS otoritesi | 148 `!important` | 206'dan indi. Kalanların çoğu mobil bloğunda ve ölçümle gerekli olduğu doğrulandı. Yenisini eklemeden önce kaynağa bak. |
| Test | Yok | Doğrulama elle yapılıyor. Yükleme, silme ve imza uçları için küçük bir uçtan uca test seti en çok getiriyi sağlar. |
| Cloudinary kotası | Ücretsiz katman | Video 100 MB ile sınırlı, aylık dönüşüm ve bant genişliği kotası var. Galeri büyürse izlenmeli. |
| Vercel Hobby | Tek bölge | Fonksiyonlar tek bölgede çalışabiliyor. Ziyaretçi kitlesi Avrupa dışına yayılırsa plan yükseltmesi gerekir. |

---

## Ortam değişkenleri

`.env` yerelde, Vercel'de Environment Variables altında. `.env` git'e girmiyor.

| Değişken | Ne için |
|---|---|
| `UPLOAD_PASSWORD` | Yükleme ve silme yetkisi |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Medya depolama ve imzalama |
| `SUPABASE_URL` / `SUPABASE_KEY` | Veritabanı okuma ve yazma (anon rol) |
| `SUPABASE_SERVICE_KEY` | Silme. Yoksa silme sessizce başarısız olur. |
