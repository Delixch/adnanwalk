// Rehber içeriği. Tek kaynak: metinler, kod örnekleri ve komutlar burada durur,
// HTML'e gömülmez. Yeni konu eklemek yeni bir kayıt eklemektir.
//
// Şema:
//   category { id, title, icon, topics[] }
//   topic    { id, title, summary, prereq[], sections[] }
//   section  { heading, body, code?, lang?, filename?, note? }
//
// prereq  — konuya başlamadan önce hazır olması gerekenler
// note    — kod bloğunun altında çıkan uyarı; kopyalayınca iş bitmiyorsa burada yazar

export const guidesData = [
  {
    id: "ai-prompts",
    title: "AI Promptları",
    icon: "🧠",
    topics: [
      {
        id: "chatgpt-prompts",
        title: "ChatGPT Promptları",
        summary: "Modelden isabetli yanıt almanın dört tekniği: rol verme, adım adım düşündürme, örnekle öğretme ve uç durum sorma.",
        prereq: [
          "Herhangi bir sohbet tabanlı AI aracı (ChatGPT, Claude, Gemini)",
          "Ek kurulum gerekmez — bu konudaki her şey kopyala-yapıştır"
        ],
        sections: [
          {
            heading: "Rol ve bağlam ver",
            body: "Model varsayılan olarak herkese hitap eden ortalama bir yanıt üretir. Uzmanlık alanını, hedef kitleyi ve çıktı biçimini söylediğinde yanıt daralır ve isabet artar. Üç şeyi birlikte vermek önemli: kim olduğunu, kime yazdığını, ne biçimde istediğini.",
            code: "Sen 10 yıllık deneyimli bir front-end mimarısın.\nWebGL ve Three.js performans optimizasyonunda uzmansın.\n\nBana yeni başlayan bir geliştirici gibi değil, orta seviye biri gibi hitap et.\nYanıtlarında önce kısa gerekçe, sonra kod ver.\nEmin olmadığın yerde tahmin etme, \"emin değilim\" de.",
            lang: "text",
            filename: "rol_promptu.txt"
          },
          {
            heading: "Adım adım düşündür",
            body: "Karmaşık bir problemde model doğrudan sonuca atlarsa ara adımlarda hata yapar ve bunu fark etmez. Önce planlamasını, sonra kodu üretmesini istediğinde hem hata oranı düşer hem de nerede yanlış yaptığını görebilirsin.",
            code: "Sana vereceğim problemi doğrudan çözme.\n\n1. Problemi kendi cümlelerinle özetle\n2. Çözüm için gereken adımları sırala\n3. Her adımda neden o yöntemi seçtiğini tek cümleyle açıkla\n4. Ancak bundan sonra kodu yaz\n\nProblem: [problemini buraya yaz]",
            lang: "text",
            filename: "adim_adim.txt"
          },
          {
            heading: "Örnek vererek öğret (few-shot)",
            body: "İstediğin çıktı biçimini tarif etmek yerine bir örneğini göstermek çok daha etkili. Model biçimi örnekten çıkarır ve tutarlı üretir. Bu teknik özellikle liste, tablo, commit mesajı gibi kalıplı çıktılarda işe yarar.",
            code: "Sana kod değişikliklerini vereceğim, commit mesajı yazacaksın.\nBiçim şu şekilde olsun:\n\nÖrnek 1:\nDeğişiklik: Login formuna e-posta doğrulaması eklendi\nMesaj: feat(auth): validate email format before submit\n\nÖrnek 2:\nDeğişiklik: Sepet toplamı yanlış hesaplanıyordu, KDV iki kez ekleniyordu\nMesaj: fix(cart): stop applying VAT twice to the order total\n\nŞimdi sen yaz:\nDeğişiklik: [değişikliğini buraya yaz]",
            lang: "text",
            filename: "ornekle_ogret.txt"
          },
          {
            heading: "Uç durumları sor",
            body: "Modelin ürettiği kod mutlu senaryoda çalışır, ama boş dizi, null değer veya ağ hatası geldiğinde çöker. Kodu aldıktan sonra ayrı bir mesajla uç durumları sormak, tek promptta hepsini istemekten daha iyi sonuç verir.",
            code: "Az önce yazdığın fonksiyon için şunları listele:\n\n- Hangi girdilerde çöker veya yanlış sonuç verir?\n- null, undefined ve boş dizi durumlarında ne olur?\n- Ağ isteği başarısız olursa kullanıcı ne görür?\n\nHer biri için düzeltilmiş kodu ver, açıklamayı kısa tut.",
            lang: "text",
            filename: "uc_durumlar.txt"
          }
        ]
      },
      {
        id: "coding-prompts",
        title: "Kodlama Promptları",
        summary: "Mevcut kodu temizleme, hızlandırma ve test yazdırma için hazır kalıplar.",
        prereq: [
          "Üzerinde çalışacağın mevcut bir kod parçası",
          "Kodu yapıştırırken gizli anahtar veya şifre bırakmadığından emin ol"
        ],
        sections: [
          {
            heading: "Refactor ettir",
            body: "\"Bu kodu temizle\" demek yeterli değil, model neyin temiz sayıldığını bilemez. Hangi kurala göre temizleyeceğini ve neyi değiştirmemesi gerektiğini söyle. Davranışın aynı kalması şartını yazmazsan model işlevi de değiştirebilir.",
            code: "Aşağıdaki kodu refactor et.\n\nKurallar:\n- Dışarıdan görünen davranış birebir aynı kalacak\n- Fonksiyonlar tek iş yapacak, 20 satırı geçmeyecek\n- Değişken isimleri ne yaptığını anlatacak (x, temp, data2 gibi isimler olmayacak)\n- Yorum ekleme, kodun kendisi anlaşılır olsun\n\nDeğiştirdiğin her yer için tek cümlelik gerekçe ver.\n\n```\n[kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "refactor.txt"
          },
          {
            heading: "Performans sorunu bulduır",
            body: "Performans promptunda ölçüm istemek kritik. Aksi halde model \"daha hızlı olur\" diyerek okunabilirliği bozan ama ölçülebilir faydası olmayan değişiklikler önerir.",
            code: "Bu kodun performansını incele.\n\nHer öneri için şunu belirt:\n- Sorun tam olarak nerede (satır)\n- Neden yavaş (döngü karmaşıklığı, gereksiz kopya, layout thrashing vb.)\n- Tahmini kazanç ve bunu nasıl ölçebileceğim\n\nOkunabilirliği bozan mikro optimizasyon önerme.\n\n```\n[kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "performans.txt"
          },
          {
            heading: "Test yazdır",
            body: "Test yazdırırken hangi test aracını kullandığını söylemezsen model rastgele bir tanesini seçer ve kod projene uymaz. Ayrıca \"mutlu senaryo dışında\" demek, işe yarar testler almanın en kısa yolu.",
            code: "Aşağıdaki fonksiyon için Vitest ile birim testi yaz.\n\n- Sadece mutlu senaryoyu değil, sınır değerleri ve hata durumlarını da kapsa\n- Her testin adı ne kontrol ettiğini Türkçe anlatsın\n- Harici bağımlılıkları (fetch, tarih, rastgele sayı) mock'la\n\n```\n[fonksiyonunu buraya yapıştır]\n```",
            lang: "text",
            filename: "test_yazdir.txt"
          },
          {
            heading: "Kodu anlat",
            body: "Devraldığın veya anlamadığın bir kod parçasını çözmenin en hızlı yolu. \"Satır satır açıkla\" demek yerine belirli sorular sormak çok daha kullanışlı yanıt getirir.",
            code: "Bu kodu bana açıkla.\n\n- Ne işe yarıyor, tek cümleyle\n- Veri nereden girip nereye çıkıyor\n- İlk bakışta anlaşılmayan, tuzak olan yerler neresi\n- Bu kodu değiştirmem gerekse en riskli kısım hangisi\n\nSatır satır anlatma, yukarıdaki dört başlığa cevap ver.\n\n```\n[kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "kodu_anlat.txt"
          }
        ]
      },
      {
        id: "react-prompts",
        title: "React Promptları",
        summary: "Bileşen, hook ve gereksiz render sorunları için React'e özel prompt kalıpları.",
        prereq: [
          "Temel React bilgisi: bileşen, props, useState",
          "Mevcut bir React projesi (bkz. Kod & Kurulum → React Kurulumu)"
        ],
        sections: [
          {
            heading: "Custom hook yazdır",
            body: "Hook isterken temizlik (cleanup) şartını yazmak önemli. Model çoğu zaman event listener ekler ama kaldırmayı unutur; bu da bellek sızıntısına yol açar.",
            code: "Pencere boyutunu takip eden bir useWindowSize hook'u yaz.\n\n- TypeScript, tipler eksiksiz\n- resize olayını dinle, bileşen kalkarken listener'ı mutlaka kaldır\n- resize sırasında saniyede yüzlerce kez state güncellemesin, debounce uygula\n- Sunucu tarafında (SSR) window olmadığı için ilk render'da çökmesin\n\nKullanım örneğini de ekle.",
            lang: "text",
            filename: "custom_hook.txt"
          },
          {
            heading: "Gereksiz render'ı bulduır",
            body: "Bu promptun değeri sıralamada: önce sebebi öğrenmek, sonra çözümü uygulamak. Doğrudan \"optimize et\" dersen model her yere useMemo serpiştirir ve kodu hem yavaşlatır hem okunmaz hâle getirir.",
            code: "Bu bileşen gereğinden fazla render oluyor.\n\n1. Önce SEBEBİNİ açıkla — hangi prop veya state her render'da yeni referans üretiyor?\n2. Sonra düzelt\n3. React.memo, useMemo veya useCallback'i sadece ölçülebilir fayda varsa kullan, her şeyi sarma\n4. Değişiklikten sonra render sayısını nasıl doğrulayacağımı söyle\n\n```\n[bileşen kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "render_sorunu.txt"
          },
          {
            heading: "Bileşeni parçalara ayır",
            body: "Büyümüş bir bileşeni bölerken en sık yapılan hata, parçaları erken ayırıp props zincirine boğulmak. Prompt'ta bunu açıkça yasaklamak işe yarar.",
            code: "Bu bileşen çok büyüdü, parçalara ayır.\n\n- Her parça tek bir sorumluluk taşısın\n- Sırf küçük olsun diye bölme; ayrılan parça tek başına anlamlı olmalı\n- Props zinciri üç seviyeyi geçiyorsa context öner ama gerekçesini yaz\n- Dosya yapısını da göster (hangi dosyada ne olacak)\n\n```\n[bileşen kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "bilesen_ayir.txt"
          }
        ]
      },
      {
        id: "debug-prompts",
        title: "Debug Promptları",
        summary: "Hata mesajını doğru sunma, mantık hatası bulma ve düzeltmeyi doğrulama.",
        prereq: [
          "Elinde bir hata mesajı veya beklenmeyen bir çıktı",
          "Tarayıcı konsolu veya terminal çıktısına erişim"
        ],
        sections: [
          {
            heading: "Hata mesajını doğru sun",
            body: "Debug promptlarının çoğu, kişi hata mesajının sadece son satırını yapıştırdığı için başarısız olur. Model neyin ne zaman olduğunu bilmeden tahmin yürütür. Üç şeyi birlikte vermek gerekiyor: ne yaptın, ne bekliyordun, ne oldu.",
            code: "Bir hata alıyorum, çözmeme yardım et.\n\nNe yaptım: [adımları yaz]\nNe bekliyordum: [beklenen sonuç]\nNe oldu: [gerçekleşen sonuç]\n\nTam hata mesajı (kısaltmadan):\n```\n[hata çıktısını buraya yapıştır]\n```\n\nİlgili kod:\n```\n[kodunu buraya yapıştır]\n```\n\nOrtam: Node [sürüm], tarayıcı [ad ve sürüm], işletim sistemi [ad]",
            lang: "text",
            filename: "hata_bildirimi.txt"
          },
          {
            heading: "Mantık hatası ara",
            body: "Kod çalışıyor ama sonuç yanlışsa hata mesajı yoktur, dolayısıyla modelin tutunacağı bir dal da yoktur. Bu durumda somut girdi ve beklenen çıktı vermek şart.",
            code: "Bu fonksiyon hata vermiyor ama yanlış sonuç üretiyor.\n\nGirdi: [somut örnek ver]\nBeklenen çıktı: [ne olmalıydı]\nGerçek çıktı: [ne oldu]\n\nÖnce hatanın nerede olduğunu bul ve NEDEN olduğunu açıkla.\nDüzeltilmiş kodu ancak ondan sonra ver.\nBenzer hatanın tekrar olmaması için ne yapmalıyım, onu da söyle.\n\n```\n[kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "mantik_hatasi.txt"
          },
          {
            heading: "Düzeltmeyi doğrulat",
            body: "Modelin verdiği düzeltmeyi körü körüne uygulamak yeni hatalar doğurur. Değişikliğin ne kırabileceğini sormak, bunu önlemenin en ucuz yolu.",
            code: "Bu düzeltmeyi uygulamadan önce sormak istiyorum:\n\n- Bu değişiklik başka nereyi etkiler?\n- Hangi durumda eskisi gibi çalışmaz?\n- Doğru çalıştığını nasıl test ederim? Somut adım ver.\n\nDüzeltme:\n```\n[önerilen kodu buraya yapıştır]\n```",
            lang: "text",
            filename: "dogrulama.txt"
          }
        ]
      },
      {
        id: "project-generation-prompts",
        title: "Proje Oluşturma Promptları",
        summary: "Sıfırdan proje kurdurma, dosya yapısı çıkarma ve parça parça ilerleme.",
        prereq: [
          "Node.js 20 veya üstü kurulu olmalı",
          "Ne yapmak istediğine dair tek cümlelik net bir fikir"
        ],
        sections: [
          {
            heading: "Önce iskeleti çıkart",
            body: "Modelden tüm projeyi tek seferde istemek en sık yapılan hata. Uzun yanıtın ortasında tutarlılık bozulur, dosyalar birbirini tutmaz. Önce sadece yapıyı istemek, sonra dosyaları tek tek doldurmak çok daha sağlam sonuç verir.",
            code: "Şu projeyi yapacağım: [tek cümleyle anlat]\n\nŞimdilik KOD YAZMA. Sadece şunları ver:\n\n1. Klasör ve dosya yapısı (ağaç biçiminde)\n2. Her dosyanın tek cümlelik görevi\n3. Hangi paketlerin gerektiği ve neden\n4. Hangi dosyadan başlamalıyım\n\nGereksiz katman ekleme, en sade yapıyı öner.",
            lang: "text",
            filename: "iskelet.txt"
          },
          {
            heading: "Dosyaları tek tek doldurt",
            body: "İskelet onaylandıktan sonra her dosyayı ayrı mesajda istemek gerekir. Böylece her adımı çalıştırıp doğrulayabilir, hatayı biriktirmeden ilerleyebilirsin.",
            code: "İskeleti onayladım. Şimdi sadece [dosya adı] dosyasını yaz.\n\n- Sadece bu dosya, başka dosyaya geçme\n- Import ettiğin her şeyin daha önce konuştuğumuz yapıda olduğundan emin ol\n- Dosyanın başına ne işe yaradığını anlatan tek satır yorum koy\n- Bu dosyayı çalıştırıp test edebilmem için ne yapmam gerektiğini sonunda yaz",
            lang: "text",
            filename: "dosya_doldur.txt"
          },
          {
            heading: "Kurulum komutlarını istet",
            body: "Model sık sık paket kurulumunu atlar veya eksik verir. Ayrıca işletim sistemini söylemezsen Linux komutları verir, Windows'ta çalışmaz.",
            code: "Bu projeyi sıfırdan çalıştırmam için gereken TÜM komutları sırayla ver.\n\n- İşletim sistemim: Windows (PowerShell)\n- Her komutun ne yaptığını tek satır yorumla açıkla\n- Kurulum bittikten sonra çalıştığını nasıl doğrularım, onu da yaz\n- Sık karşılaşılan kurulum hatalarını ve çözümlerini ekle",
            lang: "text",
            filename: "kurulum_komutlari.txt"
          }
        ]
      },
      {
        id: "ready-templates",
        title: "Hazır Prompt & Örnekler",
        summary: "Kopyala, köşeli parantezleri doldur, gönder. Dört sık kullanılan kalıp.",
        prereq: [
          "Ek gereksinim yok",
          "Köşeli parantez içindeki yerleri kendi bilgilerinle değiştirmeyi unutma"
        ],
        sections: [
          {
            heading: "Kod belgeleme (JSDoc)",
            body: "Fonksiyonun ne yaptığını değil, neden öyle yaptığını yazdırmak belgelemenin işe yarar kısmı. İkisini ayırmasını istemek fark yaratır.",
            code: "Bu fonksiyon için JSDoc yaz.\n\n- Parametre tipleri, dönüş değeri ve fırlatabileceği hatalar\n- Açıklamada kodun tekrarını yazma; NEDEN böyle yapıldığını anlat\n- Bir kullanım örneği ekle\n- Türkçe yaz\n\n```\n[fonksiyonunu buraya yapıştır]\n```",
            lang: "text",
            filename: "jsdoc.txt"
          },
          {
            heading: "Veritabanı şeması",
            body: "Şema isterken hangi veritabanını kullandığını söylemek şart — PostgreSQL, MySQL ve SQLite'ın söz dizimi ve veri tipleri farklı.",
            code: "PostgreSQL için şema yaz: kullanıcılar, siparişler, ürünler.\n\n- Foreign key ilişkileri ve silme davranışı (ON DELETE)\n- Sık sorgulanacak sütunlara index\n- created_at ve updated_at sütunları, updated_at otomatik güncellensin\n- Para birimi için hangi tipi seçtiğini ve nedenini açıkla\n\nHer tablo için tek cümlelik açıklama ekle.",
            lang: "text",
            filename: "veritabani_semasi.txt"
          },
          {
            heading: "Kod incelemesi",
            body: "Model varsayılan olarak övgüyle başlar ve gerçek sorunları yumuşatır. Övgüyü açıkça yasaklamak, işe yarar inceleme almanın yolu.",
            code: "Bu kodu incele. Övgü yazma, sadece sorunları listele.\n\nHer bulgu için:\n- Dosya ve satır\n- Sorun ne\n- Hangi somut durumda patlar\n- Nasıl düzeltilir\n\nEn ciddi sorunu en başa koy. Biçimsel tercihleri (girinti, tırnak) hiç yazma.\n\n```\n[kodunu buraya yapıştır]\n```",
            lang: "text",
            filename: "kod_incelemesi.txt"
          },
          {
            heading: "Öğrenme planı",
            body: "\"Bana X öğret\" demek işe yaramaz, model sana bir ansiklopedi maddesi verir. Mevcut seviyeni ve hedefini söylediğinde plan gerçekten uygulanabilir çıkar.",
            code: "Şunu öğrenmek istiyorum: [konu]\n\nMevcut seviyem: [ne biliyorsun, dürüst yaz]\nHedefim: [ne yapabilmek istiyorsun]\nAyırabileceğim süre: [günde kaç saat, kaç hafta]\n\nBana haftalık plan çıkar. Her hafta için:\n- Ne öğreneceğim\n- Hangi küçük projeyi yapacağım\n- Öğrendiğimi nasıl test edeceğim\n\nTeorik kaynak listesi verme, yaparak öğreneceğim şeyler yaz.",
            lang: "text",
            filename: "ogrenme_plani.txt"
          }
        ]
      }
    ]
  },
  {
    id: "code-setup",
    title: "Kod & Kurulum",
    icon: "💻",
    topics: [
      {
        id: "react-setup",
        title: "React Kurulumu",
        summary: "Vite ile sıfırdan React projesi: kurulum, klasör yapısı ve ilk çalıştırma.",
        prereq: [
          "Node.js 20 veya üstü — kontrol: node -v",
          "Terminal (Windows'ta PowerShell, macOS/Linux'ta Terminal)",
          "Projeyi kuracağın boş bir klasör"
        ],
        sections: [
          {
            heading: "1. Projeyi oluştur",
            body: "Vite, React projesi kurmanın bugün en hızlı yolu. Komuttaki iki tire (--) önemli: ondan sonraki bayraklar npm'e değil, Vite'a gider.",
            code: "# Projeyi oluştur\nnpm create vite@latest my-react-app -- --template react\n\n# Klasöre gir\ncd my-react-app\n\n# Bağımlılıkları yükle\nnpm install\n\n# Geliştirme sunucusunu başlat\nnpm run dev",
            lang: "bash",
            filename: "kurulum.sh",
            note: "Terminalde çıkan http://localhost:5173 adresini tarayıcıda aç. Sunucu çalışırken terminali kapatma; durdurmak için Ctrl + C."
          },
          {
            heading: "2. Klasör yapısını tanı",
            body: "Kurulum bittiğinde karşına çıkan yapı. En çok src/ klasöründe çalışacaksın; kök dizindeki dosyalara nadiren dokunursun.",
            code: "my-react-app/\n├── public/           # Doğrudan sunulan dosyalar (favicon, robots.txt)\n├── src/\n│   ├── assets/       # Bileşenlerin import ettiği görseller\n│   ├── App.jsx       # Ana bileşen — çalışmaya buradan başla\n│   ├── App.css       # App bileşeninin stilleri\n│   ├── main.jsx      # Giriş noktası, React'i DOM'a bağlar\n│   └── index.css     # Global stiller\n├── index.html        # Tek HTML dosyası\n├── package.json      # Bağımlılıklar ve komutlar\n└── vite.config.js    # Vite ayarları",
            lang: "text",
            filename: "yapi.txt"
          },
          {
            heading: "3. İlk değişikliği yap",
            body: "src/App.jsx dosyasının içeriğini tamamen sil ve bunu yapıştır. Kaydettiğin anda tarayıcı kendini yeniler; sayfayı elle yenilemene gerek yok.",
            code: "function App() {\n  return (\n    <main>\n      <h1>Merhaba React</h1>\n      <p>Bu satırı değiştirip kaydet, tarayıcı kendini yenileyecek.</p>\n    </main>\n  );\n}\n\nexport default App;",
            lang: "javascript",
            filename: "src/App.jsx"
          },
          {
            heading: "4. Yayına hazırla",
            body: "Geliştirme sunucusu yayın için uygun değil. Yayına çıkarken derleme almak gerekir; çıktı dist/ klasörüne düşer.",
            code: "# Yayın sürümünü derle\nnpm run build\n\n# Derlenen sürümü yerelde test et\nnpm run preview",
            lang: "bash",
            filename: "build.sh",
            note: "dist/ klasörünü git'e ekleme. Vite'ın oluşturduğu .gitignore bunu zaten dışlar."
          }
        ]
      },
      {
        id: "typescript-setup",
        title: "TypeScript Kurulumu",
        summary: "Yeni projede TypeScript ile başlama ve mevcut JavaScript projesine sonradan ekleme.",
        prereq: [
          "Node.js 20 veya üstü",
          "Temel JavaScript bilgisi — TypeScript onun üstüne kurulu",
          "Mevcut projeye ekleyeceksen çalışan bir React projesi"
        ],
        sections: [
          {
            heading: "En kolay yol: baştan TypeScript ile kur",
            body: "Yeni bir proje açıyorsan sonradan dönüştürmekle uğraşma. Vite'ın hazır şablonu tsconfig dosyalarını, tipleri ve ayarları doğru şekilde kurar.",
            code: "npm create vite@latest my-app -- --template react-ts\ncd my-app\nnpm install\nnpm run dev",
            lang: "bash",
            filename: "yeni_proje.sh",
            note: "Bu şablon tsconfig.json ve tsconfig.node.json dosyalarını hazır getirir. Aşağıdaki adımlara ihtiyacın kalmaz."
          },
          {
            heading: "Mevcut projeye eklemek: paketler",
            body: "Zaten JavaScript ile yazılmış bir projeye ekliyorsan üç adım var ve üçünü de yapmadan proje çalışmaz. İlki paketleri kurmak.",
            code: "npm install -D typescript @types/react @types/react-dom",
            lang: "bash",
            filename: "paketler.sh"
          },
          {
            heading: "Mevcut projeye eklemek: dosyaları dönüştür",
            body: "İkinci adım, paket kurmanın tek başına hiçbir şey yapmadığı yer. Dosya uzantılarını değiştirmen ve index.html içindeki referansı güncellemen gerekiyor. Bu adım atlanırsa proje eskisi gibi JavaScript çalışmaya devam eder.",
            code: "# JSX içeren dosyalar .tsx olacak\n# JSX içermeyen yardımcı dosyalar .ts olacak\n\n# Windows PowerShell:\nRename-Item src/main.jsx src/main.tsx\nRename-Item src/App.jsx src/App.tsx\n\n# macOS / Linux:\n# mv src/main.jsx src/main.tsx\n# mv src/App.jsx src/App.tsx",
            lang: "bash",
            filename: "donustur.sh",
            note: "Ardından index.html içindeki <script src=\"/src/main.jsx\"> satırını /src/main.tsx olarak düzelt. Bunu yapmazsan sayfa boş açılır."
          },
          {
            heading: "Mevcut projeye eklemek: tsconfig.json",
            body: "Üçüncü adım ayar dosyası. Aşağıdaki yapılandırma Vite ile çalışan bir React projesi içindir: derlemeyi Vite yaptığı için TypeScript sadece tip kontrolü yapar, dosya üretmez (noEmit).",
            code: "{\n  \"compilerOptions\": {\n    \"target\": \"ES2020\",\n    \"lib\": [\"ES2020\", \"DOM\", \"DOM.Iterable\"],\n    \"module\": \"ESNext\",\n    \"moduleResolution\": \"bundler\",\n    \"jsx\": \"react-jsx\",\n\n    \"strict\": true,\n    \"noUnusedLocals\": true,\n    \"noUnusedParameters\": true,\n    \"noFallthroughCasesInSwitch\": true,\n\n    \"skipLibCheck\": true,\n    \"resolveJsonModule\": true,\n    \"isolatedModules\": true,\n    \"noEmit\": true\n  },\n  \"include\": [\"src\"]\n}",
            lang: "json",
            filename: "tsconfig.json",
            note: "vite.config.ts dosyasını da TypeScript'e çevirdiysen ayrı bir tsconfig.node.json gerekir; react-ts şablonu bunu hazır verdiği için yeni projede bu sorunla karşılaşmazsın."
          },
          {
            heading: "İlk tipli bileşen",
            body: "Props tiplerini yazmak TypeScript'in ilk gerçek faydası: yanlış prop gönderdiğinde tarayıcıda değil, editörde uyarı alırsın.",
            code: "type CardProps = {\n  title: string;\n  description?: string;   // soru işareti: zorunlu değil\n  onSelect: (id: number) => void;\n};\n\nexport function Card({ title, description, onSelect }: CardProps) {\n  return (\n    <article onClick={() => onSelect(1)}>\n      <h3>{title}</h3>\n      {description && <p>{description}</p>}\n    </article>\n  );\n}",
            lang: "typescript",
            filename: "src/Card.tsx"
          }
        ]
      },
      {
        id: "javascript-examples",
        title: "JavaScript Örnekleri",
        summary: "Projelerde sürekli lazım olan dört yardımcı: debounce, derin kopya, gruplama ve güvenli erişim.",
        prereq: [
          "Temel JavaScript bilgisi: fonksiyon, dizi, nesne",
          "Örnekleri tarayıcı konsolunda doğrudan deneyebilirsin"
        ],
        sections: [
          {
            heading: "Debounce — art arda çağrıyı tek çağrıya indir",
            body: "Arama kutusuna her harf yazıldığında istek atmak yerine, kullanıcı yazmayı bırakınca tek istek atmak için kullanılır. Ok fonksiyonu yerine normal function kullanılmasının sebebi, this değerinin çağıran nesneye bağlı kalması.",
            code: "function debounce(fn, delay = 300) {\n  let timeoutId;\n  return function (...args) {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn.apply(this, args), delay);\n  };\n}\n\n// Kullanım\nconst search = debounce((term) => {\n  console.log('Arama:', term);\n}, 400);\n\ninput.addEventListener('input', (e) => search(e.target.value));",
            lang: "javascript",
            filename: "debounce.js",
            note: "Kaydırma ve fare hareketi gibi sürekli akan olaylarda debounce yerine throttle gerekir: debounce olay bitene kadar bekler, throttle belirli aralıkla çalıştırır."
          },
          {
            heading: "Derin kopya — iç içe nesneyi ayır",
            body: "Nesneyi eşitlemek kopya oluşturmaz, aynı nesneye ikinci bir isim verir. structuredClone iç içe yapıları gerçekten kopyalar ve JSON yönteminin aksine Date, Map, Set gibi tipleri korur.",
            code: "const original = { ad: 'Adnan', ayar: { tema: 'koyu' } };\n\nconst kopya = structuredClone(original);\nkopya.ayar.tema = 'açık';\n\nconsole.log(original.ayar.tema); // 'koyu' — orijinal bozulmadı",
            lang: "javascript",
            filename: "deepClone.js",
            note: "structuredClone fonksiyonları ve DOM elemanlarını kopyalayamaz, hata fırlatır. Node.js'te 17 ve üstü sürümlerde bulunur."
          },
          {
            heading: "Gruplama — diziyi kategorilere ayır",
            body: "Listeyi bir alana göre gruplamak, tabloda başlıklı listeler ve raporlarda sürekli gerekir. Object.groupBy modern ortamlarda hazır gelir; desteklenmediği yerde reduce ile aynı sonuç alınır.",
            code: "const medya = [\n  { ad: 'yol.jpg', tip: 'image' },\n  { ad: 'kosu.mp4', tip: 'video' },\n  { ad: 'park.jpg', tip: 'image' }\n];\n\n// Modern yol\nconst gruplu = Object.groupBy(medya, (m) => m.tip);\n\n// Her yerde çalışan yol\nconst gruplu2 = medya.reduce((acc, m) => {\n  (acc[m.tip] ||= []).push(m);\n  return acc;\n}, {});\n\n// { image: [...2 kayıt], video: [...1 kayıt] }",
            lang: "javascript",
            filename: "groupBy.js"
          },
          {
            heading: "Güvenli erişim — olmayan alanda çökme",
            body: "API'den gelen veride bir alan eksikse, iç içe erişim uygulamayı komple çökertir. Soru işaretli erişim (?.) ve ?? operatörü bunu tek satırda çözer.",
            code: "const kullanici = { profil: null };\n\n// Çöker: Cannot read properties of null\n// const sehir = kullanici.profil.adres.sehir;\n\n// Güvenli: undefined döner, çökmez\nconst sehir = kullanici.profil?.adres?.sehir ?? 'Bilinmiyor';\n\nconsole.log(sehir); // 'Bilinmiyor'",
            lang: "javascript",
            filename: "optional.js",
            note: "?? ile || farklıdır: || boş metni ve 0'ı da yok sayar, ?? sadece null ve undefined'ı yakalar. Sayısal değerlerde ?? kullan."
          }
        ]
      },
      {
        id: "npm-commands",
        title: "npm/pnpm Komutları",
        summary: "Paket kurma, güncelleme, bozulan kurulumu onarma ve pnpm'e geçiş.",
        prereq: [
          "Node.js kurulu olmalı — npm onunla birlikte gelir",
          "package.json içeren bir proje klasöründe olmalısın"
        ],
        sections: [
          {
            heading: "Temel komutlar",
            body: "Günlük kullanımın neredeyse tamamı bu beş komut. -D bayrağı paketi devDependencies'e yazar: sadece geliştirme sırasında gereken, yayına çıkmayan araçlar için.",
            code: "# Projeye paket ekle\nnpm install lodash\n\n# Sadece geliştirmede gereken paket (test aracı, tip paketi vb.)\nnpm install -D vitest\n\n# Paketi kaldır\nnpm uninstall lodash\n\n# Eski kalmış paketleri listele\nnpm outdated\n\n# package.json'daki her şeyi kur (projeyi yeni klonladıysan)\nnpm install",
            lang: "bash",
            filename: "temel.sh"
          },
          {
            heading: "Güncelleme ve sürüm işaretleri",
            body: "package.json içindeki ^ ve ~ işaretleri hangi güncellemelere izin verildiğini belirler. Bunları bilmeden güncelleme yapmak, çalışan projeyi bozmanın en yaygın yolu.",
            code: "# ^1.2.3  →  1.x.x içinde en yeni (ara sürüm ve yamalar gelir)\n# ~1.2.3  →  1.2.x içinde en yeni (sadece yamalar gelir)\n# 1.2.3   →  tam olarak bu sürüm, hiç değişmez\n\n# İzin verilen aralıkta güncelle\nnpm update\n\n# Bir paketi büyük sürüm atlatarak güncelle (dikkatli ol)\nnpm install react@latest",
            lang: "bash",
            filename: "guncelleme.sh",
            note: "Büyük sürüm atlaması (1.x → 2.x) kırıcı değişiklik içerebilir. Güncellemeden önce paketin CHANGELOG dosyasını oku."
          },
          {
            heading: "Bozulan kurulumu onar",
            body: "\"Dün çalışıyordu\" durumunda ilk denenecek şey budur: bağımlılıkları ve kilit dosyasını silip yeniden kurmak. Silme komutu işletim sistemine göre değişir; Windows'ta rm -rf çalışmaz.",
            code: "# Windows (PowerShell)\nRemove-Item -Recurse -Force node_modules, package-lock.json\nnpm install\n\n# macOS / Linux\nrm -rf node_modules package-lock.json\nnpm install\n\n# Her iki sistemde de çalışan yol\nnpx rimraf node_modules package-lock.json\nnpm install",
            lang: "bash",
            filename: "onarim.sh",
            note: "npm cache clean --force komutunu ilk çare olarak kullanma; npm önbelleği kendi kendini doğrular ve sorun genelde önbellekte değildir."
          },
          {
            heading: "pnpm'e geçiş",
            body: "pnpm aynı paketi disk üzerinde bir kez saklar ve projelere bağlantı verir. Çok projeli makinede hem yerden hem süreden kazandırır; komutları npm ile neredeyse aynıdır.",
            code: "# pnpm'i kur\nnpm install -g pnpm\n\n# Mevcut projede npm yerine kullan\npnpm install\n\n# Komut karşılıkları\n# npm install X      →  pnpm add X\n# npm install -D X   →  pnpm add -D X\n# npm uninstall X    →  pnpm remove X\n# npm run dev        →  pnpm dev",
            lang: "bash",
            filename: "pnpm.sh",
            note: "Geçtikten sonra package-lock.json dosyasını sil, yerine pnpm-lock.yaml gelir. Aynı projede iki kilit dosyası bırakma."
          }
        ]
      },
      {
        id: "script-installation",
        title: "Script Kurulumu",
        summary: "Script etiketinin yükleme sırası, modül kullanımı ve package.json komutları.",
        prereq: [
          "Temel HTML bilgisi",
          "Bir metin düzenleyici ve tarayıcı"
        ],
        sections: [
          {
            heading: "defer ve async farkı",
            body: "Script etiketinin yeri ve bayrağı, sayfanın ne kadar hızlı göründüğünü doğrudan etkiler. Neredeyse her durumda doğru cevap defer'dir; async sadece sayfanın geri kalanından tamamen bağımsız scriptler içindir.",
            code: "<!-- ÖNERİLEN: arka planda iner, HTML bitince sırayla çalışır -->\n<script defer src=\"app.js\"></script>\n\n<!-- Sadece bağımsız scriptler için: indiği an çalışır, sıra garantisi yok -->\n<script async src=\"analytics.js\"></script>\n\n<!-- KAÇIN: indirme ve çalıştırma boyunca sayfa çizimi durur -->\n<script src=\"app.js\"></script>",
            lang: "html",
            filename: "scripts.html",
            note: "async kullanılan iki script birbirine bağımlıysa hangisinin önce çalışacağı garanti değildir; bu yüzden bağımlı scriptlerde defer kullan."
          },
          {
            heading: "Modül olarak yükleme",
            body: "type=\"module\" yazdığında import ve export kullanabilirsin. Modüller kendiliğinden defer gibi davranır, ayrıca ayrı kapsamda çalışır: değişkenlerin global alanı kirletmez.",
            code: "<script type=\"module\" src=\"/src/main.js\"></script>",
            lang: "html",
            filename: "index.html",
            note: "Modüller dosya sisteminden (file://) açıldığında CORS hatası verir. Mutlaka bir sunucu üzerinden aç: npm run dev veya npx serve."
          },
          {
            heading: "package.json komutları",
            body: "Uzun komutları ezberlemek yerine scripts alanına isim vermek, hem senin hem projeye sonradan katılan birinin işini kolaylaştırır.",
            code: "{\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"preview\": \"vite preview\",\n    \"lint\": \"eslint . --ext js,jsx\",\n    \"test\": \"vitest\"\n  }\n}",
            lang: "json",
            filename: "package.json",
            note: "Çalıştırmak için: npm run dev. Sadece start, test ve restart isimleri run olmadan da çalışır."
          }
        ]
      },
      {
        id: "api-integrations",
        title: "API Entegrasyonları",
        summary: "Veri çekme, veri gönderme, hata kontrolü ve API anahtarlarının güvenliği.",
        prereq: [
          "Temel JavaScript ve async/await bilgisi",
          "Bağlanacağın bir API adresi",
          "Örnekleri denemek için: https://jsonplaceholder.typicode.com ücretsiz ve anahtarsız"
        ],
        sections: [
          {
            heading: "Veri çekme (GET)",
            body: "fetch fonksiyonunun en sık kaçırılan kuralı: sunucu 404 veya 500 dönse bile fetch hata fırlatmaz. Bu yüzden response.ok kontrolü şart, yoksa hata sayfasını veri sanıp devam edersin.",
            code: "async function getUsers() {\n  const response = await fetch('https://jsonplaceholder.typicode.com/users');\n\n  // fetch sadece ağ koptuğunda hata fırlatır, 404/500'de fırlatmaz\n  if (!response.ok) {\n    throw new Error(`İstek başarısız: ${response.status}`);\n  }\n\n  return response.json();\n}",
            lang: "javascript",
            filename: "get.js"
          },
          {
            heading: "Veri gönderme (POST)",
            body: "Gövdeyi JSON.stringify ile metne çevirmek ve Content-Type başlığını yazmak birlikte gerekir. Biri eksikse sunucu gövdeyi okuyamaz.",
            code: "async function postData(url, data) {\n  const response = await fetch(url, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(data)\n  });\n\n  if (!response.ok) {\n    const metin = await response.text();\n    throw new Error(`Gönderim başarısız (${response.status}): ${metin}`);\n  }\n\n  return response.json();\n}\n\n// Kullanım\nawait postData('/api/mesaj', { ad: 'Adnan', mesaj: 'Merhaba' });",
            lang: "javascript",
            filename: "post.js",
            note: "Sunucu JSON yerine HTML hata sayfası dönerse response.json() ayrı bir hata fırlatır. Yukarıdaki gibi önce durumu kontrol etmek bunu önler."
          },
          {
            heading: "Zaman aşımı ve iptal",
            body: "Sunucu yanıt vermezse istek sonsuza kadar bekler ve kullanıcı donmuş bir ekrana bakar. AbortSignal.timeout bunu tek satırda çözer.",
            code: "async function getWithTimeout(url, ms = 8000) {\n  try {\n    const response = await fetch(url, { signal: AbortSignal.timeout(ms) });\n    if (!response.ok) throw new Error(`Durum: ${response.status}`);\n    return await response.json();\n  } catch (error) {\n    if (error.name === 'TimeoutError') {\n      throw new Error('Sunucu zamanında yanıt vermedi, tekrar dene.');\n    }\n    throw error;\n  }\n}",
            lang: "javascript",
            filename: "timeout.js"
          },
          {
            heading: "API anahtarını gizle",
            body: "Bu, yeni başlayanların en pahalı hatası. Tarayıcıda çalışan koda yazılan her anahtar herkese açıktır; kaynak koda bakan herkes görür ve kullanabilir. Anahtar isteyen bir API'ye tarayıcıdan doğrudan bağlanma.",
            code: "// YANLIŞ — anahtar tarayıcıya gider, herkes görebilir\nfetch(`https://api.servis.com/veri?key=${'gizli-anahtar'}`);\n\n// DOĞRU — anahtar sunucuda kalır, tarayıcı kendi sunucunla konuşur\n// Tarayıcı tarafı:\nfetch('/api/veri');\n\n// Sunucu tarafı (Vercel fonksiyonu, api/veri.js):\nexport default async function handler(req, res) {\n  const r = await fetch(`https://api.servis.com/veri?key=${process.env.API_KEY}`);\n  res.status(200).json(await r.json());\n}",
            lang: "javascript",
            filename: "gizli_anahtar.js",
            note: "Vite'ta VITE_ önekiyle başlayan ortam değişkenleri tarayıcı paketine gömülür. Gizli anahtarı asla VITE_ ile başlatma."
          }
        ]
      },
      {
        id: "error-handling",
        title: "Hata Çözümü",
        summary: "Hata mesajını okuma, sık karşılaşılan dört hata ve kalıcı çözümleri.",
        prereq: [
          "Tarayıcı geliştirici araçları — F12 ile açılır",
          "Terminal çıktısını okuyabilmek"
        ],
        sections: [
          {
            heading: "Hata mesajını doğru oku",
            body: "Yığın izinin (stack trace) tamamını okumaya çalışmak zaman kaybı. Üç şeye bak: en üstteki mesaj, senin dosyana ait ilk satır, ve satır numarası. node_modules içindeki satırlar genelde sorunun sebebi değil sonucudur.",
            code: "TypeError: Cannot read properties of undefined (reading 'map')\n    at UserList (UserList.jsx:14:22)     ← SENİN DOSYAN, buraya bak\n    at renderWithHooks (react-dom.js:11121)\n    at mountIndeterminateComponent (react-dom.js:14913)\n\n# Okunuşu:\n# undefined olan bir şeyin üzerinde .map çağrılmış\n# UserList.jsx dosyası, 14. satır, 22. sütun",
            lang: "text",
            filename: "hata_okuma.txt"
          },
          {
            heading: "Cannot read properties of undefined",
            body: "En sık karşılaşılan hata. Sebebi neredeyse her zaman aynı: veri henüz gelmeden onu kullanmaya çalışmak. Kalıcı çözüm, başlangıç değerini doğru tipte vermek.",
            code: "// Sorun: users başlangıçta undefined, ilk render'da .map çöker\nconst [users, setUsers] = useState();\n\n// Çözüm 1: başlangıç değerini doğru tipte ver\nconst [users, setUsers] = useState([]);\n\n// Çözüm 2: veri gelmemiş olabileceğini hesaba kat\n{users?.map(u => <li key={u.id}>{u.name}</li>)}\n\n// Çözüm 3: yükleniyor durumunu ayrı yönet (en okunaklısı)\nif (!users) return <p>Yükleniyor…</p>;\nreturn <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;",
            lang: "javascript",
            filename: "undefined_hatasi.jsx"
          },
          {
            heading: "Güvenli çağrı kalıbı",
            body: "Hata yakalamanın amacı hatayı gizlemek değil, kullanıcıya ne olduğunu söyleyebilmek. catch bloğunda sadece console.error yazıp geçmek, kullanıcıyı boş ekranla baş başa bırakır.",
            code: "async function fetchUser(id) {\n  try {\n    const response = await fetch(`/api/user/${id}`);\n    if (!response.ok) {\n      throw new Error(`Sunucu ${response.status} döndü`);\n    }\n    return { data: await response.json(), error: null };\n  } catch (error) {\n    // Geliştirici için ayrıntı, kullanıcı için anlaşılır mesaj\n    console.error('fetchUser başarısız:', error);\n    return { data: null, error: 'Kullanıcı bilgisi alınamadı. Tekrar dener misin?' };\n  }\n}\n\n// Kullanım\nconst { data, error } = await fetchUser(5);\nif (error) setMesaj(error);",
            lang: "javascript",
            filename: "guvenli_cagri.js"
          },
          {
            heading: "Sık karşılaşılan üç kurulum hatası",
            body: "Bu üçü kod hatası değil ortam hatasıdır; kodu ne kadar incelesen bulamazsın.",
            code: "# 1. \"Module not found: Can't resolve 'react'\"\n#    → Paketler kurulmamış\nnpm install\n\n# 2. \"EADDRINUSE: address already in use :::5173\"\n#    → Port başka bir süreç tarafından kullanılıyor\n#    Windows:  netstat -ano | findstr :5173   sonra taskkill /PID <numara> /F\n#    Farklı port ile başlat:\nnpm run dev -- --port 5174\n\n# 3. \"Unexpected token '<'\" veya boş beyaz sayfa\n#    → index.html içindeki script yolu yanlış\n#    /src/main.jsx yazıyorken dosya main.tsx olabilir; uzantıyı kontrol et",
            lang: "bash",
            filename: "kurulum_hatalari.sh"
          }
        ]
      },
      {
        id: "step-by-step-projects",
        title: "Adım Adım Projeler",
        summary: "Tarayıcıda kalıcı veri saklayan çalışan bir yapılacaklar listesi — beş adımda.",
        prereq: [
          "React Kurulumu konusunu tamamlamış olmak",
          "useState hakkında temel bilgi"
        ],
        sections: [
          {
            heading: "1. Görev listesini tut",
            body: "Her şey state ile başlar. Görevler bir dizi; her görev benzersiz kimliği, metni ve tamamlanma durumu olan bir nesne. Kimlik için Date.now() yeterli, çünkü aynı milisaniyede iki görev eklemen mümkün değil.",
            code: "import { useState } from 'react';\n\nexport default function TodoApp() {\n  const [todos, setTodos] = useState([]);\n  const [text, setText] = useState('');\n\n  function addTodo(e) {\n    e.preventDefault();\n    const temiz = text.trim();\n    if (!temiz) return;                       // boş görev ekleme\n    setTodos([...todos, { id: Date.now(), text: temiz, done: false }]);\n    setText('');                              // kutuyu temizle\n  }\n\n  return null; // arayüzü bir sonraki adımda ekliyoruz\n}",
            lang: "javascript",
            filename: "src/TodoApp.jsx"
          },
          {
            heading: "2. Arayüzü çiz",
            body: "Form ve liste. key özniteliği React için zorunlu: hangi satırın hangi görev olduğunu bununla takip eder. Dizideki sırayı (index) key olarak kullanma, silme işleminde yanlış satır güncellenir.",
            code: "return (\n  <main>\n    <form onSubmit={addTodo}>\n      <input\n        value={text}\n        onChange={(e) => setText(e.target.value)}\n        placeholder=\"Ne yapılacak?\"\n      />\n      <button type=\"submit\">Ekle</button>\n    </form>\n\n    <ul>\n      {todos.map((todo) => (\n        <li key={todo.id}>\n          <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>\n            {todo.text}\n          </span>\n        </li>\n      ))}\n    </ul>\n  </main>\n);",
            lang: "javascript",
            filename: "src/TodoApp.jsx"
          },
          {
            heading: "3. Tamamlama ve silme",
            body: "State'i doğrudan değiştirmek (todos[0].done = true) React'te işe yaramaz; arayüz güncellenmez. Yeni dizi üretmek gerekir. map değiştirir, filter siler.",
            code: "function toggleTodo(id) {\n  setTodos(todos.map((t) =>\n    t.id === id ? { ...t, done: !t.done } : t\n  ));\n}\n\nfunction deleteTodo(id) {\n  setTodos(todos.filter((t) => t.id !== id));\n}\n\n// Listedeki her satıra ekle:\n// <input type=\"checkbox\" checked={todo.done} onChange={() => toggleTodo(todo.id)} />\n// <button onClick={() => deleteTodo(todo.id)}>Sil</button>",
            lang: "javascript",
            filename: "src/TodoApp.jsx"
          },
          {
            heading: "4. Sayfa yenilenince kaybolmasın",
            body: "Buraya kadar her şey bellekte; sayfayı yenilediğinde liste sıfırlanır. localStorage tarayıcıda kalıcı saklar. İki parça gerekiyor: açılışta okumak ve her değişiklikte yazmak.",
            code: "import { useState, useEffect } from 'react';\n\n// Açılışta oku — fonksiyon biçimi, sadece ilk render'da çalışır\nconst [todos, setTodos] = useState(() => {\n  try {\n    return JSON.parse(localStorage.getItem('todos')) ?? [];\n  } catch {\n    return [];                                // bozuk veri varsa boş başla\n  }\n});\n\n// Her değişiklikte yaz\nuseEffect(() => {\n  localStorage.setItem('todos', JSON.stringify(todos));\n}, [todos]);",
            lang: "javascript",
            filename: "src/TodoApp.jsx",
            note: "localStorage sadece metin saklar, bu yüzden JSON.stringify ve JSON.parse şart. Gizli bilgi saklama: tarayıcıda açıkta durur."
          },
          {
            heading: "5. Çalıştır ve doğrula",
            body: "Bittiğinde şunları test et. Hepsi geçiyorsa proje tamam.",
            code: "# 1. src/App.jsx içinde TodoApp'i kullan:\n#    import TodoApp from './TodoApp';\n#    export default function App() { return <TodoApp />; }\n\n# 2. Sunucuyu başlat\nnpm run dev\n\n# Kontrol listesi:\n# [ ] Boş görev eklenmiyor\n# [ ] Eklenen görev listede görünüyor\n# [ ] Kutucuk işaretlenince üstü çiziliyor\n# [ ] Sil düğmesi doğru satırı siliyor\n# [ ] Sayfa yenilenince liste duruyor",
            lang: "bash",
            filename: "calistir.sh"
          }
        ]
      }
    ]
  },
  {
    id: "ai-projects",
    title: "AI ile Proje Yap",
    icon: "🚀",
    topics: [
      {
        id: "ai-flow",
        title: "Bu Projeyi AI ile Nasıl Yaparım",
        summary: "Fikirden çalışan projeye giden dört aşama ve her aşamada modele ne sorulacağı.",
        prereq: [
          "Node.js 20 veya üstü",
          "Bir AI sohbet aracı",
          "Ne yapmak istediğine dair tek cümlelik fikir"
        ],
        sections: [
          {
            heading: "Aşama 1 — Fikri daralt",
            body: "En sık yapılan hata, modelden büyük ve belirsiz bir şey istemek. \"Bir e-ticaret sitesi yap\" diyen kişi kullanamayacağı bir yığın kod alır. Önce kapsamı kendin daraltmalısın: ilk sürümde ne OLMAYACAĞINI yazmak, ne olacağını yazmaktan daha önemli.",
            code: "Bir proje planlayacağım, bana soru sorarak yardım et.\n\nFikir: [tek cümle]\n\nBana şunları sor ve cevaplarımı bekle:\n- Bu uygulamayı kim, hangi anda kullanacak?\n- İlk sürümde olması ŞART olan tek özellik ne?\n- İlk sürümde kesinlikle OLMAYACAK şeyler neler?\n\nHepsini cevapladıktan sonra tek paragraflık kapsam özeti yaz.",
            lang: "text",
            filename: "asama1.txt"
          },
          {
            heading: "Aşama 2 — Teknoloji seç",
            body: "Teknoloji seçimini modele bırakırken gerekçe istemezsen, popüler olduğu için gereksiz ağır araçlar önerir. Sınırlarını yazmak seçimi gerçekçi kılar.",
            code: "Kapsam belli oldu. Şimdi teknoloji önerisi yap.\n\nSınırlarım:\n- Deneyim seviyem: [dürüst yaz]\n- Bütçe: ücretsiz katman şart\n- Süre: [kaç gün/hafta]\n\nHer seçim için:\n- Neden bu, alternatifi neydi\n- Öğrenme maliyeti ne kadar\n- Ücretsiz katmanın sınırı ne\n\nGerekmedikçe yeni araç ekleme. En sade yığını öner.",
            lang: "text",
            filename: "asama2.txt"
          },
          {
            heading: "Aşama 3 — Parça parça yaz",
            body: "Tek promptta tüm projeyi istemek, tutarsız ve birleşmeyen dosyalar üretir. Her adımda çalıştırılabilir küçük bir parça istemek, hatayı erken yakalamanı sağlar.",
            code: "Projeyi parça parça yazacağız. Kuralımız:\n\n- Her mesajda sadece BİR dosya veya BİR özellik\n- Her parçanın sonunda çalıştığını nasıl test edeceğimi yaz\n- Ben \"çalıştı\" demeden bir sonrakine geçme\n- Önceki adımlarda yazdığımız isimleri değiştirme\n\nİlk parça: [en küçük çalışan hâli neyse onu yaz]",
            lang: "text",
            filename: "asama3.txt"
          },
          {
            heading: "Aşama 4 — Bitmeden önce sor",
            body: "Yayına çıkmadan önceki son kontrol. Bu prompt olmadan yayına giden projelerde en sık görülen üç sorun: açıkta kalan API anahtarı, mobilde bozulan düzen ve hata durumunda boş kalan ekran.",
            code: "Proje çalışıyor. Yayına almadan önce kontrol et:\n\n- Kaynak koda gömülü kalmış anahtar veya şifre var mı?\n- Mobilde bozulacak bir düzen var mı?\n- Ağ hatası olduğunda kullanıcı ne görüyor? Boş ekran mı?\n- Klavye ile kullanılabiliyor mu?\n- Yavaş bağlantıda ilk açılış ne kadar sürer?\n\nHer sorun için dosya, satır ve düzeltmeyi ver.",
            lang: "text",
            filename: "asama4.txt"
          }
        ]
      },
      {
        id: "prompt-to-code",
        title: "Prompt'tan Sonuca Akış",
        summary: "Tek bir özelliğin promptla istenip çalışır hâle gelmesi — gerçek bir örnek üzerinden.",
        prereq: [
          "Çalışan bir React projesi",
          "Örnek olarak arama kutusu ekleyeceğiz"
        ],
        sections: [
          {
            heading: "Adım 1 — İsteği yaz",
            body: "İyi promptun üç parçası vardır: bağlam (proje ne), istek (ne yapılacak), sınır (neye dikkat). Üçü de olmadan gelen kod projene uymaz.",
            code: "Bağlam: Vite + React projesi, TypeScript yok, sade CSS kullanıyorum.\nElimde bir dizi var: [{ id, title, tags: string[] }]\n\nİstek: Bu listeyi başlığa ve etiketlere göre filtreleyen bir arama kutusu ekle.\n\nSınırlar:\n- Kütüphane ekleme, sade React\n- Her tuşta değil, kullanıcı yazmayı bırakınca filtrelesin\n- Sonuç yoksa kullanıcıya mesaj göster\n- Türkçe karakter duyarlılığı olmasın (İ/ı sorunu)",
            lang: "text",
            filename: "adim1_prompt.txt"
          },
          {
            heading: "Adım 2 — Gelen kodu incele",
            body: "Model kodu verdiğinde doğrudan yapıştırma. Üç şeyi kontrol et: dosyada olmayan bir şey import ediyor mu, senin veri yapına uyuyor mu, hata durumunu düşünmüş mü. Beklenen çıktı aşağıdaki gibi olmalı.",
            code: "import { useState, useMemo } from 'react';\n\nexport function SearchableList({ items }) {\n  const [query, setQuery] = useState('');\n\n  const filtered = useMemo(() => {\n    const q = query.trim().toLocaleLowerCase('tr');\n    if (!q) return items;\n    return items.filter((item) =>\n      item.title.toLocaleLowerCase('tr').includes(q) ||\n      item.tags.some((t) => t.toLocaleLowerCase('tr').includes(q))\n    );\n  }, [items, query]);\n\n  return (\n    <div>\n      <input\n        value={query}\n        onChange={(e) => setQuery(e.target.value)}\n        placeholder=\"Ara…\"\n        aria-label=\"Listede ara\"\n      />\n      {filtered.length === 0\n        ? <p>Aramanla eşleşen kayıt yok.</p>\n        : <ul>{filtered.map((i) => <li key={i.id}>{i.title}</li>)}</ul>}\n    </div>\n  );\n}",
            lang: "javascript",
            filename: "src/SearchableList.jsx",
            note: "toLocaleLowerCase('tr') Türkçe için önemli: normal toLowerCase, İ harfini yanlış çevirir ve arama tutmaz."
          },
          {
            heading: "Adım 3 — Eksiği tamamlat",
            body: "İlk yanıt nadiren eksiksizdir. Eksiği fark ettiğinde baştan yazdırma; sadece eksik parçayı iste. Böylece çalışan kısım bozulmaz.",
            code: "Kod çalışıyor ama iki eksik var:\n\n1. Her tuşa basışta filtreliyor, ben yazmayı bırakınca filtrelemesini istemiştim\n2. Arama kutusunu temizleyecek bir düğme yok\n\nSadece bu iki eksiği tamamla. Çalışan kısımları yeniden yazma,\ndeğişen satırları göster ve nereye ekleyeceğimi söyle.",
            lang: "text",
            filename: "adim3_prompt.txt"
          },
          {
            heading: "Adım 4 — Doğrula",
            body: "Kod çalışıyor görünmesi yetmez. Bu beş durumu elle dene; hepsi geçmeden özellik bitmiş sayılmaz.",
            code: "# [ ] Boş aramada tüm liste görünüyor\n# [ ] Büyük/küçük harf farkı sonucu değiştirmiyor\n# [ ] Türkçe karakterle arama tutuyor (İSTANBUL / istanbul)\n# [ ] Eşleşme yoksa mesaj çıkıyor, boş ekran kalmıyor\n# [ ] Klavyeyle sekme tuşuna basınca arama kutusuna ulaşılıyor",
            lang: "text",
            filename: "kontrol_listesi.txt"
          }
        ]
      },
      {
        id: "mini-projects",
        title: "Örnek Mini Projeler",
        summary: "Bir hafta sonunda bitirilebilecek dört proje fikri: ne öğretir, nereden başlanır.",
        prereq: [
          "React Kurulumu konusunu tamamlamış olmak",
          "Her proje için ayrı klasör aç, aynı projeye yığma"
        ],
        sections: [
          {
            heading: "1. Hesaplayıcı — form ve state",
            body: "En küçük başlangıç. Öğrettiği şey: kullanıcı girdisini state'te tutmak, hesaplamayı render sırasında yapmak, sayı dönüşümlerinde hata yakalamak. Yarım günde biter.",
            code: "Bir kredi hesaplayıcı yapacağım.\n\nGirdi: tutar, faiz oranı, vade (ay)\nÇıktı: aylık taksit, toplam geri ödeme\n\n- Sade React, kütüphane yok\n- Girdi boş veya sıfırsa hesaplama yapma, uyarı göster\n- Sayıları binlik ayraçlı göster (Intl.NumberFormat)\n\nÖnce sadece hesaplama fonksiyonunu yaz, arayüzü sonra ekleyeceğiz.",
            lang: "text",
            filename: "proje1.txt"
          },
          {
            heading: "2. Hava durumu — API bağlantısı",
            body: "İlk gerçek API projesi. Öğrettiği şey: veri çekme, yükleniyor ve hata durumları, ortam değişkeni kullanımı. Anahtarsız çalışan Open-Meteo ile başlamak en kolayı.",
            code: "Hava durumu uygulaması yapacağım.\n\nAPI: https://api.open-meteo.com (ücretsiz, anahtar gerektirmiyor)\n\n- Şehir adı girilecek, sıcaklık ve durum gösterilecek\n- Yükleniyor, hata ve sonuç bulunamadı durumlarını AYRI göster\n- İstek 8 saniyede yanıt vermezse iptal et ve kullanıcıya söyle\n\nÖnce veri çekme fonksiyonunu yaz, arayüzü sonra.",
            lang: "text",
            filename: "proje2.txt"
          },
          {
            heading: "3. Not defteri — kalıcı veri",
            body: "Öğrettiği şey: localStorage ile kalıcılık, listede ekleme/düzenleme/silme, arama. Yapılacaklar listesinin bir üst seviyesi.",
            code: "Markdown destekli not defteri yapacağım.\n\n- Notlar localStorage'da saklanacak\n- Ekle, düzenle, sil, ara\n- Her notta başlık, içerik ve tarih olacak\n- Silmeden önce onay sor\n\nVeri yapısını ve localStorage okuma/yazma katmanını önce yaz,\narayüze sonra geçeceğiz.",
            lang: "text",
            filename: "proje3.txt"
          },
          {
            heading: "4. Portfolyo — yayına çıkma",
            body: "Öğrettiği şey: sayfa düzeni, duyarlı tasarım, ve en önemlisi gerçekten yayına almak. Kendi işlerini gösterdiğin için bitirme motivasyonu da yüksek olur.",
            code: "Kişisel portfolyo sitesi yapacağım.\n\n- Tek sayfa: hakkımda, projeler, iletişim\n- Proje verileri ayrı bir dosyada dizi olarak dursun\n- Mobil öncelikli tasarım, 360px genişlikte bozulmasın\n- İletişim formu şimdilik sadece arayüz olsun\n\nÖnce sayfa yapısını ve veri dosyasını oluştur.",
            lang: "text",
            filename: "proje4.txt",
            note: "Bittiğinde Deploy Rehberleri konusundaki adımlarla yayına al. Yayınlanmamış proje, portfolyoda sayılmaz."
          }
        ]
      },
      {
        id: "react-tailwind",
        title: "React + Tailwind",
        summary: "Tailwind v4'ü Vite projesine kurma ve ilk bileşeni yazma.",
        prereq: [
          "Çalışan bir Vite + React projesi",
          "Node.js 20 veya üstü",
          "Terminalde proje klasörünün içinde olmalısın"
        ],
        sections: [
          {
            heading: "1. Paketleri kur",
            body: "Tailwind v4 ile kurulum eskisinden farklı ve daha kısa. Artık postcss ve autoprefixer paketlerini ayrıca kurmuyorsun, Vite eklentisi bunu üstleniyor.",
            code: "npm install tailwindcss @tailwindcss/vite",
            lang: "bash",
            filename: "kurulum.sh",
            note: "Eski rehberlerde geçen npx tailwindcss init -p komutu v4'te KALDIRILDI. O komutu çalıştırmaya çalışırsan hata alırsın."
          },
          {
            heading: "2. Vite eklentisini ekle",
            body: "Kurulum tek başına yetmez; eklentiyi Vite yapılandırmasına tanıtman gerekiyor. Bu adım atlanırsa sınıflar hiçbir işe yaramaz.",
            code: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()]\n});",
            lang: "javascript",
            filename: "vite.config.js"
          },
          {
            heading: "3. CSS'e tek satır ekle",
            body: "Üçüncü ve son kurulum adımı. v3'teki üç ayrı @tailwind satırı yerine tek bir import var. Bu dosyanın main.jsx içinde import edildiğinden emin ol.",
            code: "@import \"tailwindcss\";",
            lang: "css",
            filename: "src/index.css",
            note: "src/main.jsx dosyasında import './index.css' satırı yoksa ekle. Vite şablonu bunu genelde hazır getirir."
          },
          {
            heading: "4. Çalıştığını doğrula",
            body: "Sunucuyu yeniden başlat ve bu bileşeni dene. Kart koyu zeminli, yuvarlak köşeli ve kenarlıklı görünüyorsa kurulum tamam; düz yazı görüyorsan bir adım eksik kalmış demektir.",
            code: "export function Card({ title, desc }) {\n  return (\n    <div className=\"max-w-sm mx-auto mt-10 p-6 bg-slate-900 rounded-xl border border-rose-500/30 shadow-lg\">\n      <h3 className=\"text-xl font-bold text-white mb-2\">{title}</h3>\n      <p className=\"text-slate-400 text-sm\">{desc}</p>\n    </div>\n  );\n}",
            lang: "javascript",
            filename: "src/Card.jsx",
            note: "Stil uygulanmıyorsa sırayla kontrol et: vite.config.js içinde tailwindcss() var mı, index.css içinde @import var mı, main.jsx bu CSS'i import ediyor mu, sunucuyu yeniden başlattın mı."
          }
        ]
      },
      {
        id: "nextjs-guide",
        title: "Next.js",
        summary: "Kurulum, sayfa oluşturma, dinamik rota ve sunucu/istemci bileşen ayrımı.",
        prereq: [
          "React bilgisi — Next.js React üzerine kuruludur",
          "Node.js 20 veya üstü"
        ],
        sections: [
          {
            heading: "1. Kurulum",
            body: "Kurulum sihirbazı birkaç soru sorar. TypeScript ve Tailwind için evet demek, sonradan eklemekten çok daha kolaydır.",
            code: "npx create-next-app@latest my-app\ncd my-app\nnpm run dev",
            lang: "bash",
            filename: "kurulum.sh",
            note: "Vite'tan farklı olarak Next.js 3000 portunda açılır: http://localhost:3000"
          },
          {
            heading: "2. Sayfa oluşturma",
            body: "Next.js'te rota yaratmak için ayar dosyası yoktur; klasör yapısı rotaların kendisidir. app klasöründe açtığın her klasör bir adrese karşılık gelir, içindeki page.jsx o adresin içeriğidir.",
            code: "app/\n├── page.jsx              →  /\n├── hakkimda/\n│   └── page.jsx          →  /hakkimda\n└── blog/\n    ├── page.jsx          →  /blog\n    └── [slug]/\n        └── page.jsx      →  /blog/herhangi-bir-yazi",
            lang: "text",
            filename: "yapi.txt"
          },
          {
            heading: "3. Dinamik rota",
            body: "Köşeli parantezli klasör adı, adresin o kısmının değişken olduğu anlamına gelir. Dikkat: güncel Next.js sürümlerinde params artık bir Promise'tir, await ile açman gerekir. Eski rehberlerde doğrudan params.slug yazar; o kod artık çalışmaz.",
            code: "// app/blog/[slug]/page.jsx\nexport default async function BlogPost({ params }) {\n  const { slug } = await params;   // await ŞART\n\n  return (\n    <main className=\"p-8\">\n      <h1>Blog Yazısı: {slug}</h1>\n    </main>\n  );\n}",
            lang: "javascript",
            filename: "app/blog/[slug]/page.jsx",
            note: "params.slug doğrudan kullanılırsa Next.js uyarı verir veya hata fırlatır. Aynı kural searchParams için de geçerli."
          },
          {
            heading: "4. Sunucu ve istemci bileşenleri",
            body: "Next.js'te bileşenler varsayılan olarak sunucuda çalışır. useState, useEffect veya onClick kullanacaksan dosyanın en üstüne 'use client' yazman gerekir. Bu satırı unutmak, yeni başlayanların en sık aldığı hatadır.",
            code: "// Sunucu bileşeni (varsayılan) — veritabanına doğrudan erişebilir\nexport default async function Page() {\n  const veriler = await fetch('https://api.ornek.com/liste').then(r => r.json());\n  return <List items={veriler} />;\n}\n\n// İstemci bileşeni — etkileşim için 'use client' şart\n'use client';\nimport { useState } from 'react';\n\nexport function Counter() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>Sayaç: {n}</button>;\n}",
            lang: "javascript",
            filename: "app/page.jsx",
            note: "\"You're importing a component that needs useState\" hatası alıyorsan, o dosyanın en üstüne 'use client' eklemen gerekiyor."
          }
        ]
      },
      {
        id: "api-usage",
        title: "API Kullanımı",
        summary: "React'te veri çekmenin doğru kalıbı: yükleniyor, hata ve iptal durumlarıyla birlikte.",
        prereq: [
          "React'te useState ve useEffect bilgisi",
          "API Entegrasyonları konusunu okumuş olmak"
        ],
        sections: [
          {
            heading: "Eksik kalıp ve sorunları",
            body: "İnternette en çok rastlanan örnek budur ve üç ciddi eksiği vardır: kullanıcı yükleniyor mu bilmez, hata olursa ekran sonsuza kadar boş kalır, ve bileşen hızlıca kapanırsa yanıt geldiğinde olmayan bir bileşeni güncellemeye çalışır.",
            code: "// EKSİK — öğrenmek için tamam, kullanmak için değil\nuseEffect(() => {\n  fetch('/api/users')\n    .then(res => res.json())\n    .then(data => setUsers(data));\n}, []);",
            lang: "javascript",
            filename: "eksik.jsx"
          },
          {
            heading: "Tam kalıp",
            body: "Aynı işi yapan ama üç eksiği de kapatan sürüm. AbortController, bileşen kapandığında isteği iptal eder; böylece hem gereksiz ağ trafiği hem de kapanmış bileşene state yazma sorunu ortadan kalkar.",
            code: "import { useState, useEffect } from 'react';\n\nexport default function UserList() {\n  const [users, setUsers] = useState([]);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n\n  useEffect(() => {\n    const controller = new AbortController();\n\n    async function load() {\n      try {\n        setLoading(true);\n        setError(null);\n        const res = await fetch('https://jsonplaceholder.typicode.com/users', {\n          signal: controller.signal\n        });\n        if (!res.ok) throw new Error(`Sunucu ${res.status} döndü`);\n        setUsers(await res.json());\n      } catch (err) {\n        // İptal bir hata değil, bileşen kapandı demektir\n        if (err.name !== 'AbortError') {\n          setError('Liste yüklenemedi. Tekrar dener misin?');\n        }\n      } finally {\n        setLoading(false);\n      }\n    }\n\n    load();\n    return () => controller.abort();   // temizlik: bileşen kalkarken iptal et\n  }, []);\n\n  if (loading) return <p>Yükleniyor…</p>;\n  if (error) return <p role=\"alert\">{error}</p>;\n  if (users.length === 0) return <p>Kayıt bulunamadı.</p>;\n\n  return (\n    <ul>\n      {users.map((u) => <li key={u.id}>{u.name}</li>)}\n    </ul>\n  );\n}",
            lang: "javascript",
            filename: "src/UserList.jsx"
          },
          {
            heading: "Dört durumu da göster",
            body: "Kullanıcının gördüğü ekran her zaman şu dört durumdan biridir. Üçüncüsünü ve dördüncüsünü atlamak, boş ekranla karşılaşan kullanıcının uygulamayı bozuk sanmasına yol açar.",
            code: "// 1. Yükleniyor  → \"Yükleniyor…\"\n// 2. Hata        → ne olduğunu ve ne yapabileceğini söyle\n// 3. Boş sonuç   → \"Kayıt bulunamadı\" (hata DEĞİL)\n// 4. Veri var    → listeyi göster\n\n// Boş sonucu hata gibi göstermek yaygın bir hatadır:\n// kullanıcı arama yaptı ve sonuç çıkmadıysa uygulama bozuk değildir.",
            lang: "javascript",
            filename: "durumlar.txt"
          }
        ]
      },
      {
        id: "git-github",
        title: "Git/GitHub",
        summary: "Kurulum, kimlik doğrulama, ilk depo ve günlük kullanılan komutlar.",
        prereq: [
          "Git kurulu olmalı — kontrol: git --version, yoksa git-scm.com",
          "GitHub hesabı",
          "ÖNEMLİ: GitHub artık şifre kabul etmiyor, aşağıdaki kimlik doğrulama adımı şart"
        ],
        sections: [
          {
            heading: "1. Kimliğini tanımla",
            body: "Bunu yapmadan commit atamazsın. Her commit'e bu isim ve e-posta yazılır, dolayısıyla GitHub hesabınla aynı e-postayı kullanman katkılarının profilinde görünmesini sağlar.",
            code: "git config --global user.name \"Adın Soyadın\"\ngit config --global user.email \"eposta@ornek.com\"\n\n# Kontrol\ngit config --global --list",
            lang: "bash",
            filename: "kimlik.sh"
          },
          {
            heading: "2. Kimlik doğrulamayı ayarla",
            body: "GitHub 2021'den beri push sırasında hesap şifresini kabul etmiyor. İki yol var: kişisel erişim jetonu (PAT) veya SSH anahtarı. En kolayı GitHub CLI kullanmak; tarayıcıdan giriş yapar ve gerisini kendisi halleder.",
            code: "# En kolay yol: GitHub CLI\n# İndir: cli.github.com\ngh auth login\n# Sorulara: GitHub.com → HTTPS → tarayıcıdan doğrula\n\n# Alternatif: SSH anahtarı\nssh-keygen -t ed25519 -C \"eposta@ornek.com\"\n# Oluşan ~/.ssh/id_ed25519.pub içeriğini\n# GitHub → Settings → SSH and GPG keys → New SSH key altına yapıştır",
            lang: "bash",
            filename: "kimlik_dogrulama.sh",
            note: "Bu adım atlanırsa push sırasında \"Authentication failed\" hatası alırsın ve hesap şifreni girmek işe yaramaz."
          },
          {
            heading: "3. İlk depoyu yayınla",
            body: "Önemli sıra: uzak depo GitHub'da önceden var olmalı. Boş bir depo oluştururken README ekleme seçeneğini işaretleme, yoksa ilk push çakışır.",
            code: "# Önce GitHub'da boş bir depo oluştur (README ekleme!)\n# Veya CLI ile:  gh repo create proje-adi --public --source=. --push\n\n# Yerel klasörde:\ngit init\ngit add .\ngit commit -m \"ilk sürüm\"\ngit branch -M main\ngit remote add origin https://github.com/kullanici/proje-adi.git\ngit push -u origin main",
            lang: "bash",
            filename: "ilk_push.sh",
            note: "\"failed to push some refs\" hatası alıyorsan uzak depoda README gibi bir dosya vardır. Çözüm: git pull origin main --allow-unrelated-histories"
          },
          {
            heading: "4. Günlük komutlar",
            body: "Günlük kullanımın neredeyse tamamı bu altı komut. git status'ü sık çalıştırmak, ne yaptığını görmenin en ucuz yolu.",
            code: "# Ne değişti?\ngit status\n\n# Değişiklikleri satır satır gör\ngit diff\n\n# Değişiklikleri kaydet\ngit add .\ngit commit -m \"ne yaptığını yaz\"\n\n# GitHub'a gönder\ngit push\n\n# Başkasının değişikliklerini al\ngit pull",
            lang: "bash",
            filename: "gunluk.sh"
          },
          {
            heading: "5. .gitignore — bunu atlama",
            body: "Yanlışlıkla gönderilen .env dosyası, ücretli API anahtarının başkaları tarafından kullanılması demektir. Depoya bir kez gittiğinde silsen bile geçmişte kalır. Bu dosyayı ilk commit'ten ÖNCE oluştur.",
            code: "node_modules/\ndist/\n.env\n.env.local\n*.log\n.DS_Store\n.vscode/",
            lang: "text",
            filename: ".gitignore",
            note: "Anahtarı yanlışlıkla gönderdiysen dosyayı silmek yetmez: anahtarı hemen iptal edip yenisini oluştur."
          }
        ]
      },
      {
        id: "deploy-guides",
        title: "Deploy Rehberleri",
        summary: "Vercel ile yayına çıkma, ortam değişkenleri ve yayın sonrası kontrol listesi.",
        prereq: [
          "Yerelde npm run build komutu hatasız çalışıyor olmalı",
          "Proje GitHub'da bir depoda olmalı (bkz. Git/GitHub)",
          "Vercel hesabı — GitHub ile giriş yapabilirsin"
        ],
        sections: [
          {
            heading: "1. Önce yerelde derlemeyi dene",
            body: "Yayın hatalarının çoğu aslında derleme hatasıdır ve yerelde de görünür. Bunu atlayıp doğrudan yayına çıkmak, hatayı Vercel loglarında aramak demektir; oysa aynı hata terminalinde çok daha okunaklı çıkar.",
            code: "npm run build\n\n# Hata yoksa derlenen sürümü yerelde aç\nnpm run preview",
            lang: "bash",
            filename: "on_kontrol.sh",
            note: "Geliştirmede çalışıp derlemede patlayan en yaygın sebep: dosya adlarındaki büyük/küçük harf farkı. Windows farkı görmez, sunucu görür."
          },
          {
            heading: "2. Önerilen yol — GitHub bağlantısı",
            body: "En kolay ve sürdürülebilir yöntem. Bir kez bağladıktan sonra her push otomatik yayına çıkar; ayrıca her dal için önizleme adresi üretilir.",
            code: "# 1. vercel.com → Add New → Project\n# 2. GitHub deponu seç\n# 3. Framework otomatik algılanır (Vite, Next.js vb.)\n# 4. Deploy\n#\n# Bundan sonra:\ngit push        # → otomatik yayına çıkar",
            lang: "bash",
            filename: "github_baglanti.sh"
          },
          {
            heading: "3. Alternatif — komut satırından",
            body: "CLI ile de yayına çıkabilirsin. Kritik ayrım şurada: çıplak vercel komutu ÖNİZLEME sürümü yayınlar, gerçek adresine çıkmaz. Canlıya almak için --prod bayrağı gerekir.",
            code: "npm install -g vercel\n\n# Hesaba giriş (tarayıcı açılır)\nvercel login\n\n# Önizleme sürümü — geçici adres üretir\nvercel\n\n# CANLI yayın — asıl adresine çıkar\nvercel --prod",
            lang: "bash",
            filename: "vercel_cli.sh",
            note: "İlk vercel komutunda proje adı ve dizin soruları gelir; varsayılanları kabul etmek için Enter'a basman yeterli."
          },
          {
            heading: "4. Ortam değişkenleri",
            body: "Yerelde .env dosyanda duran anahtarlar Vercel'e gitmez, çünkü .env dosyası git'e dahil değildir. Panelden ayrıca tanımlaman gerekir. Bu adım atlanırsa site açılır ama API çağrıları çalışmaz.",
            code: "# Vercel panelinde:\n# Project → Settings → Environment Variables\n#\n# Her değişken için ortam seç: Production, Preview, Development\n#\n# ÖNEMLİ: Değişken ekledikten sonra yeniden deploy et,\n# mevcut yayın eski değerlerle çalışmaya devam eder.\n\n# Tarayıcıya gitmesi gereken değerler VITE_ ile başlamalı:\nVITE_API_URL=https://api.ornek.com\n\n# Gizli kalması gerekenler ASLA VITE_ ile başlamamalı:\nDATABASE_KEY=gizli-deger",
            lang: "bash",
            filename: "ortam_degiskenleri.sh",
            note: "VITE_ önekli her değişken tarayıcı paketine gömülür ve herkes görebilir. Gizli anahtarları asla bu önekle tanımlama."
          },
          {
            heading: "5. Yayın sonrası kontrol",
            body: "Deploy yeşil yandı diye iş bitmez. Bu altı maddeyi gerçek adres üzerinde kontrol et.",
            code: "# [ ] Ana sayfa açılıyor mu\n# [ ] Alt sayfaya doğrudan gidip yenileyince 404 veriyor mu\n# [ ] Telefonda düzen bozuluyor mu\n# [ ] API çağrıları çalışıyor mu (F12 → Network)\n# [ ] Konsolda kırmızı hata var mı (F12 → Console)\n# [ ] Görseller yükleniyor mu, yoksa yol hatası mı var",
            lang: "bash",
            filename: "kontrol_listesi.sh",
            note: "Alt sayfada 404 alıyorsan tek sayfa uygulaması yönlendirmesi eksiktir. Vite projelerinde Vercel bunu genelde otomatik ayarlar; olmazsa vercel.json içine rewrites kuralı ekle."
          }
        ]
      }
    ]
  }
];
