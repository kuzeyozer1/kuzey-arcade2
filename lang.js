/* Kuzey Arcade language switch (English / Türkçe).
   The choice is saved in localStorage "kuzey:lang". When Turkish is on, English text that matches the list below
   is swapped for Turkish, also in pop-ups that appear later (accounts, friends, multiplayer, awards). */
(function(){
'use strict';
const KEY='kuzey:lang';let lang='en';try{lang=JSON.parse(localStorage.getItem(KEY))||'en'}catch(e){}
const TR={
// ---------- arcade home page ----------
"Over 60 games, made with Claude, all with awards and your own avatar. They work offline once you've opened them.":"60'tan fazla oyun, Claude ile yapıldı. Hepsinde ödüller ve kendi avatarın var. Bir kez açtıktan sonra internetsiz de çalışırlar.",
"🆕 NEW MEGA GAMES":"🆕 YENİ MEGA OYUNLAR","LABS & TOOLS":"LABORATUVAR VE ARAÇLAR","PLAY":"OYNA","OPEN":"AÇ",
"NEW! A huge space shooter: 8 sectors, 8 giant bosses, 8 ships to buy and paint, upgrades, Endless and a Daily Run.":"YENİ! Dev bir uzay savaşı: 8 bölge, 8 dev boss, satın alıp boyayabileceğin 8 gemi, geliştirmeler, Sonsuz mod ve Günlük Uçuş.",
"NEW! Top-down racing with drifts, jumps and nitro. 15 tracks, 5 cups, 12 cars to buy, paint and tune, Time Trial ghosts and a Daily Challenge.":"YENİ! Yukarıdan bakışlı yarış: drift, atlama ve nitro. 15 pist, 5 kupa, satın alıp boyayabileceğin 12 araba, zamana karşı hayaletler ve Günlük Görev.",
"NEW! Tower defense: 8 towers with 16 special upgrades, a hero who wears your avatar, 16 battlefields, 4 giant bosses, Research, Heroic and Endless.":"YENİ! Kule savunması: 16 özel geliştirmeli 8 kule, avatarını giyen bir kahraman, 16 savaş alanı, 4 dev boss, Araştırma, Kahraman ve Sonsuz mod.",
"NEW! A light puzzle: turn mirrors, split beams and mix colours. 90 puzzles, 25 challenges, Light Rush, a daily puzzle and a level maker with share codes.":"YENİ! Işık bulmacası: aynaları çevir, ışınları böl, renkleri karıştır. 90 bulmaca, 25 meydan okuma, Işık Koşusu, günlük bulmaca ve paylaşma kodlu bölüm yapıcı.",
"NEW! 54 crazy holes in 6 courses: windmills, pirates, black holes, ghosts and lava jumps. Play with up to 4 friends or Robo-Caddie, dress your golfer and build your own holes.":"YENİ! 6 sahada 54 çılgın delik: yel değirmenleri, korsanlar, kara delikler, hayaletler ve lav atlamaları. 4 arkadaşınla veya Robo-Caddie ile oyna, golfçünü giydir, kendi deliklerini yap.",
"NEW! Arcade 4-a-side football: design your kit, your avatar is the star player. Cup, League, 2 players, penalties, skill games, training and goal replays.":"YENİ! 4'e 4 atari futbolu: formanı tasarla, yıldız oyuncu senin avatarın. Kupa, Lig, 2 oyuncu, penaltılar, beceri oyunları, antrenman ve gol tekrarları.",
"NEW! A platformer starring your avatar: 5 worlds, 35 levels, 5 bosses, wall jumps and dashes, hidden gems, hats, a daily level and a level maker.":"YENİ! Avatarının başrolde olduğu platform oyunu: 5 dünya, 35 bölüm, 5 boss, duvar zıplamaları, gizli mücevherler, şapkalar, günlük bölüm ve bölüm yapıcı.",
"NEW! A dungeon adventure that is different every time: 6 heroes, 40+ items, pets, shops, secret rooms, 4 bosses and permanent upgrades.":"YENİ! Her seferinde farklı bir zindan macerası: 6 kahraman, 40'tan fazla eşya, evcil hayvanlar, dükkanlar, gizli odalar, 4 boss ve kalıcı geliştirmeler.",
"NEW! Run your own farm: 14 crops, 4 seasons, chickens, cows and sheep, machines, cooking, fishing, villagers, festivals and a farmer who wears your avatar.":"YENİ! Kendi çiftliğini yönet: 14 ürün, 4 mevsim, tavuklar, inekler ve koyunlar, makineler, yemek, balık tutma, köylüler, festivaller ve avatarını giyen bir çiftçi.",
"NEW! Build a factory: mine ore, run belts, smelt and assemble parts up to robots. 20 missions, a daily puzzle, sandbox, research, blueprints and a helper bot that wears your avatar.":"YENİ! Fabrika kur: maden çıkar, bantları çalıştır, erit ve robotlara kadar parça birleştir. 20 görev, günlük bulmaca, serbest mod, araştırma, planlar ve avatarını giyen yardımcı robot.",
"NEW! A side-scrolling plane shooter: 6 lands, 6 giant bosses, bombs and barrel rolls, 7 planes to buy, paint and sell, a Workshop, Endless and a Daily Raid.":"YENİ! Yandan kaydırmalı uçak savaşı: 6 diyar, 6 dev boss, bombalar ve takla atmalar, alıp boyayıp satabileceğin 7 uçak, Atölye, Sonsuz mod ve Günlük Baskın.",
"NEW! Tower defense where YOU build the maze: 9 towers with 3 levels, 12 battlefields, giant mech bosses, commander powers, 7 robot commanders, a Tech Lab, Endless and a Daily Siege.":"YENİ! Labirenti SENİN kurduğun kule savunması: 3 seviyeli 9 kule, 12 savaş alanı, dev robot bosslar, komutan güçleri, 7 robot komutan, Teknoloji Laboratuvarı, Sonsuz mod ve Günlük Kuşatma.",
"NEW! Twin-stick arena shooter: 30 waves, 6 shape bosses, 18 upgrade cards, 7 ships to buy and sell, a Lab, Endless and a Daily Swarm with special rules.":"YENİ! Çift çubuklu arena savaşı: 30 dalga, 6 şekil boss, 18 geliştirme kartı, alıp satabileceğin 7 gemi, Laboratuvar, Sonsuz mod ve özel kurallı Günlük Sürü.",
"NEW! Top-down tank battles: 15 missions on 3 fronts, 3 boss tanks, walls to blast, steel for trick shots, 8 tanks to buy and sell, an Arena and a Daily Battle.":"YENİ! Yukarıdan bakışlı tank savaşları: 3 cephede 15 görev, 3 boss tank, patlatılacak duvarlar, sektirme atışları için çelik, alıp satabileceğin 8 tank, Arena ve Günlük Savaş.",
"NEW! Lane defense: place miners, archers, knights, wizards and dragons to stop goblin armies. 20 battles in 4 lands, the Ogre King, 6 heroes, a Forge, Endless and Daily.":"YENİ! Şerit savunması: goblin ordularını durdurmak için madenci, okçu, şövalye, büyücü ve ejderha yerleştir. 4 diyarda 20 savaş, Dev Kral, 6 kahraman, Demirhane, Sonsuz ve Günlük mod.",
"NEW! Arcade space shooter: alien squads fly in and dive at you. 40 stages in 4 galaxies, bonus stages, motherships, 6 ships to buy and sell, power pods and a Daily run.":"YENİ! Atari uzay savaşı: uzaylı filolar gelip üstüne dalıyor. 4 galakside 40 bölüm, bonus bölümler, ana gemiler, alıp satabileceğin 6 gemi, güç kapsülleri ve Günlük Uçuş.",
"NEW! Just move: your weapons attack by themselves! Collect gems, level up and pick from 10 weapons and 8 power items. Survive 10 minutes on 3 maps, 7 heroes to buy and sell.":"YENİ! Sadece hareket et: silahların kendiliğinden saldırır! Mücevher topla, seviye atla, 10 silah ve 8 güç eşyası arasından seç. 3 haritada 10 dakika hayatta kal, alıp satabileceğin 7 kahraman.",
"NEW! Match-3 puzzle: 60 levels with ice and collect goals, striped, bomb and rainbow gems, mega combos, boosters, Zen mode, a Daily Puzzle and 6 gem sets to buy and sell.":"YENİ! Üçlü eşleştirme bulmacası: buz ve toplama hedefli 60 bölüm, çizgili, bomba ve gökkuşağı mücevherler, mega kombolar, güçlendiriciler, Zen modu, Günlük Bulmaca ve alıp satabileceğin 6 mücevher seti.",
"NEW! Endless runner: jump, double jump, slide and throw stars through 4 worlds. Missions and ninja ranks, power-ups, 7 outfits to buy and sell, a Dojo and a Daily Dash.":"YENİ! Sonsuz koşu: 4 dünyada zıpla, çift zıpla, kay ve yıldız fırlat. Görevler ve ninja rütbeleri, güçlendirmeler, alıp satabileceğin 7 kıyafet, Dojo ve Günlük Koşu.",
"NEW! Rhythm game: hit the notes on the beat in 12 songs the game composes itself, on Easy, Normal or Hard. Long notes, fever mode, grades up to S, a Daily Jam and 6 stages to buy and sell.":"YENİ! Ritim oyunu: oyunun kendi bestelediği 12 şarkıda notalara ritmine göre vur, Kolay, Normal veya Zor. Uzun notalar, ateş modu, S'ye kadar notlar, Günlük Jam ve alıp satabileceğin 6 sahne.",
"NEW! Real pinball physics: flippers, bumpers, slingshots, drop targets, skill shots, multiball and nudging. 3 tables with missions, 7 balls to buy and sell, and a one-ball Daily Table.":"YENİ! Gerçek langırt fiziği: paletler, tamponlar, sapanlar, düşen hedefler, beceri atışları, çoklu top ve masayı sarsma. Görevli 3 masa, alıp satabileceğin 7 top ve tek toplu Günlük Masa.",
"NEW! Card battle adventure: build your deck as you climb 3 acts, pick your path, fight bosses, collect relics. 4 heroes to buy and sell, about 48 cards and a Daily Quest.":"YENİ! Kart savaşı macerası: 3 perdeyi tırmanırken desteni kur, yolunu seç, bosslarla savaş, kalıntılar topla. Alıp satabileceğin 4 kahraman, yaklaşık 48 kart ve Günlük Görev.",
"NEW! Paris games, French words and a Minecraft add-on. Plays offline!":"YENİ! Paris oyunları, Fransızca kelimeler ve bir Minecraft eklentisi. İnternetsiz oynanır!",
"NEW! SkyWars from above: loot chests on floating islands, bridge across the void and knock bots off the edge. TNT, bows, fireballs, Teams and Lucky Blocks.":"YENİ! Yukarıdan SkyWars: uçan adalarda sandıkları yağmala, boşluğa köprü kur ve botları kenardan düşür. TNT, yaylar, ateş topları, Takımlar ve Şans Blokları.",
"NEW! A 3D block world: mine, build, craft tools, farm, tame the night and find Elemental ores. Survival or Creative.":"YENİ! 3B blok dünyası: kaz, inşa et, alet yap, çiftçilik yap, geceyi atlat ve Elemental madenleri bul. Hayatta Kalma veya Yaratıcı.",
"BIG UPDATE! Snowy Peak, a harbour, a carnival and a spooky swamp. Cook, make animal friends, dodge storms and animal control!":"BÜYÜK GÜNCELLEME! Karlı Zirve, bir liman, bir lunapark ve ürkütücü bir bataklık. Yemek yap, hayvan arkadaşlar edin, fırtınalardan ve hayvan zabıtasından kaç!",
"UPDATED! 20 mazes, time trial, a daily maze, 8 snake skins and your avatar as the snake's head.":"GÜNCELLENDİ! 20 labirent, zamana karşı mod, günlük labirent, 8 yılan kostümü ve yılanın başında senin avatarın.",
"UPDATED! Five temple bosses, now with Hard and Nightmare modes, a Boss Rush and 16 awards.":"GÜNCELLENDİ! Beş tapınak bossu, artık Zor ve Kâbus modları, Boss Akını ve 16 ödülle.",
"UPDATED! 30 challenge levels, time attack, zen, daily tower, power-ups, 10 block skins, skies and your avatar riding the tower.":"GÜNCELLENDİ! 30 meydan okuma bölümü, zamana karşı, zen, günlük kule, güçlendirmeler, 10 blok kostümü, gökyüzleri ve kuleye binen avatarın.",
"UPDATED! 8 ships to unlock, 6 space zones, pickups, dashing, missions and a daily run.":"GÜNCELLENDİ! Açılacak 8 gemi, 6 uzay bölgesi, toplanacak eşyalar, atılma, görevler ve günlük uçuş.",
"UPDATED! Find the hidden 5-letter word in Turkish or English. Now with a 3-minute rush, hints, stats and detective ranks.":"GÜNCELLENDİ! Türkçe veya İngilizce gizli 5 harfli kelimeyi bul. Artık 3 dakikalık yarış, ipuçları, istatistikler ve dedektif rütbeleriyle.",
"NEW! Explore the solar system: moving planets, real NASA facts, your weight on every planet and how long a trip there takes. English and Turkish.":"YENİ! Güneş sistemini keşfet: hareket eden gezegenler, gerçek NASA bilgileri, her gezegendeki ağırlığın ve oraya yolculuğun ne kadar sürdüğü. İngilizce ve Türkçe.",
"English lessons for our Compass units: board, team game and tablet modes, with exercises for every unit.":"Compass üniteleri için İngilizce dersleri: tahta, takım oyunu ve tablet modları, her ünite için alıştırmalar.",
"Study plan for the written exams: daily tasks, quizzes, flashcards and listening practice.":"Yazılı sınavlar için çalışma planı: günlük görevler, testler, bilgi kartları ve dinleme alıştırması.",
"Match timer, BIOGLOW scorer, practice runs and run planner for your FIRST LEGO League team.":"FIRST LEGO League takımın için maç sayacı, BIOGLOW puanlayıcı, deneme turları ve tur planlayıcı.",
"Search any book, read its summary, and share a shelf with your club.":"Herhangi bir kitabı ara, özetini oku ve kulübünle bir raf paylaş.",
"Practice quiz for the 5th grade social studies 1st written exam.":"5. sınıf sosyal bilgiler 1. yazılı sınavı için alıştırma testi.",
"The website for the Elementals Fabric mod for Minecraft 1.21.1.":"Minecraft 1.21.1 için Elementals Fabric modunun web sitesi.",
"Minecraft schematics (.litematic): a 7-button food machine with crafters and farms.":"Minecraft şemaları (.litematic): üretici blokları ve çiftlikleri olan 7 düğmeli yiyecek makinesi.",
"UPDATED! Snake battle with robot snakes when you play alone. Live play with friends works inside Claude.":"GÜNCELLENDİ! Tek başına oynarken robot yılanlarla yılan savaşı. Arkadaşlarla canlı oyun Claude içinde çalışır.",
"The app maker. Making apps with AI only works inside Claude; saved apps still open here.":"Uygulama yapıcı. Yapay zekâ ile uygulama yapmak sadece Claude içinde çalışır; kayıtlı uygulamalar burada da açılır.",
"Draw pixel art with a pen, fill bucket and mirror mode. Save a gallery and download your art.":"Kalem, boya kovası ve ayna moduyla piksel sanatı çiz. Galeri kaydet ve çizimlerini indir.",
"A 16-step drum machine: kick, snare, hi-hat, clap and more. Make a beat and save it.":"16 adımlı davul makinesi: bas davul, trampet, zil, el çırpma ve daha fazlası. Bir ritim yap ve kaydet.",
"Play a two-octave piano with 5 sounds, record yourself, and learn songs with glowing keys.":"5 sesli iki oktavlık piyano çal, kendini kaydet ve parlayan tuşlarla şarkı öğren.",
"The periodic table: all 118 elements with facts, Turkish names and fun “did you know?” notes.":"Periyodik tablo: 118 elementin hepsi, bilgiler, Türkçe adlar ve eğlenceli “biliyor muydun?” notları.",
"Morse code with beeps and a tap key, Caesar cipher, binary and an emoji alphabet.":"Bip sesli ve dokunma tuşlu Mors alfabesi, Sezar şifresi, ikili sayılar ve emoji alfabesi.",
"Pomodoro focus timer, countdown with alarm, and a stopwatch with laps.":"Pomodoro odaklanma sayacı, alarmlı geri sayım ve turlu kronometre.",
"Length, weight, temperature, speed, time, area, volume and computer data.":"Uzunluk, ağırlık, sıcaklık, hız, zaman, alan, hacim ve bilgisayar verisi.",
"Live weather, the next 24 hours and a 7-day forecast for any city.":"Her şehir için canlı hava durumu, sonraki 24 saat ve 7 günlük tahmin.",
"Tap to zoom forever into the Mandelbrot set and find seahorses and spirals.":"Mandelbrot kümesine sonsuza kadar yakınlaşmak için dokun, denizatları ve sarmallar bul.",
"8 optical illusions that trick your brain, each with a button that shows the truth.":"Beynini kandıran 8 göz yanılsaması, her birinde gerçeği gösteren bir düğme.",
"Draw once and your lines are mirrored around the middle into amazing patterns. Save your art.":"Bir kez çiz, çizgilerin ortada yansıyarak harika desenlere dönüşsün. Çizimini kaydet.",
"Test your typing speed in English or Turkish and beat your best WPM score.":"İngilizce veya Türkçe yazma hızını ölç ve en iyi dakikada kelime rekorunu kır.",
"Make your own flashcards for any subject. Tricky cards come back more often.":"Her ders için kendi bilgi kartlarını yap. Zor kartlar daha sık gelir.",
"Practise times tables with a big number pad, sprints and a mastery map.":"Büyük tuş takımı, hız turları ve ustalık haritasıyla çarpım tablosu çalış.",
"Write down homework by subject and due date, tick it off and keep your streak.":"Ödevleri derse ve teslim tarihine göre yaz, bitince işaretle ve serini koru.",
"Spin a wheel, roll dice, flip a coin, pick a number or make fair teams.":"Çark çevir, zar at, yazı tura at, sayı seç veya adil takımlar kur.",
"Flags, capitals and continents of 130 countries, plus a flag quiz.":"130 ülkenin bayrakları, başkentleri ve kıtaları, artı bir bayrak testi.",
"Record your voice and play it as a chipmunk, giant, robot, alien, echo or backwards.":"Sesini kaydet; sincap, dev, robot, uzaylı, yankı veya tersten dinle.",
"Turn a link, a message or a Wi-Fi password into a QR code and download it.":"Bir bağlantıyı, mesajı veya Wi-Fi şifresini QR koda çevir ve indir.",
"Draw page after page with onion skin, then press play to watch your cartoon move.":"Soğan zarı özelliğiyle sayfa sayfa çiz, sonra oynat ve çizgi filminin hareket ettiğini izle.",
"Kuzey English Class":"Kuzey İngilizce Dersi","Kuzey Book Club":"Kuzey Kitap Kulübü","Block Breakout":"Blok Kaçışı","NEW! Locked in Rock Bottom Prison! Mine blocks, sell them, rank up from A to Z, upgrade your pickaxe, open crates and break out.":"YENİ! Dipsiz Taş Hapishanesi'ne kapatıldın! Blok kaz, sat, A'dan Z'ye rütbe atla, kazmanı geliştir, sandık aç ve kaç!","Kuzey Reader":"Kuzey Okuyucu","Kuzey World":"Kuzey Dünyası","UPDATED! A whole town to play in: 15 places, a town map, decorating, hidden gifts, a secret space station, babies to grown-ups, wings, X-rays, a farm, a beach and a disco stage!":"GÜNCELLENDİ! Oynayacak koca bir kasaba: 15 yer, kasaba haritası, dekorasyon, gizli hediyeler, gizli uzay istasyonu, bebekten yetişkine karakterler, kanatlar, röntgen, çiftlik, plaj ve disko sahnesi!","Block Peek":"Blok Gözlükü","NEW! Open Minecraft .mcworld and .mcaddon files and explore them in 3D. Walk around worlds, see mobs, blocks, items and builds.":"YENİ! Minecraft .mcworld ve .mcaddon dosyalarını aç ve 3D gez. Dünyalarda yürü; yaratıkları, blokları, eşyaları ve yapıları gör.","NEW! A Kindle-style reading app with 91 books, including all 7 Kuzey and the Seven Winds books. Highlight, take notes and change fonts.":"YENİ! 91 kitaplık Kindle tarzı okuma uygulaması, Kuzey ve Yedi Rüzgâr serisinin 7 kitabı dahil. Altını çiz, not al, yazı tipini değiştir.","Food Vending Machine":"Yiyecek Otomatı","App Forge":"Uygulama Atölyesi",
"Pixel Studio":"Piksel Stüdyosu","Beat Maker":"Ritim Yapıcı","Piano":"Piyano","Element Explorer":"Element Kâşifi","Secret Codes":"Gizli Şifreler","Study Timer":"Ders Sayacı",
"Unit Converter":"Birim Çevirici","Weather":"Hava Durumu","Fractal Explorer":"Fraktal Kâşifi","Illusion Lab":"Yanılsama Laboratuvarı","Kaleidoscope Paint":"Kaleydoskop Boyama",
"Typing Trainer":"Klavye Hocası","Flashcards":"Bilgi Kartları","Times Table Gym":"Çarpım Tablosu Spor Salonu","Homework Planner":"Ödev Planlayıcı","Decision Kit":"Karar Seti",
"World Flags":"Dünya Bayrakları","Voice Changer":"Ses Değiştirici","QR Code Maker":"QR Kod Yapıcı","Flipbook Animator":"Çizgi Film Defteri","Planet Lab":"Gezegen Laboratuvarı",
"PUT IT ON YOUR HOME SCREEN":"ANA EKRANINA EKLE","iPhone or iPad:":"iPhone veya iPad:","open this page in Safari, tap the Share button, then":"bu sayfayı Safari'de aç, Paylaş düğmesine dokun, sonra",
"Add to Home Screen":"Ana Ekrana Ekle","Android:":"Android:","open it in Chrome, tap the ⋮ menu, then":"Chrome'da aç, ⋮ menüsüne dokun, sonra","Add to Home screen":"Ana ekrana ekle","or":"veya",
"Install app":"Uygulamayı yükle","Computer:":"Bilgisayar:","in Chrome or Edge, click the install icon at the right end of the address bar.":"Chrome veya Edge'de adres çubuğunun sağ ucundaki yükle simgesine tıkla.",
"INSTALLED":"YÜKLENDİ","Kuzey Arcade is on your home screen. Have fun!":"Kuzey Arcade ana ekranında. İyi eğlenceler!",
// ---------- account bar and account menu ----------
"Tap to create your account":"Hesabını oluşturmak için dokun","CREATE":"OLUŞTUR","ACCOUNT":"HESAP","MULTIPLAYER":"ÇOK OYUNCULU","FRIENDS":"ARKADAŞLAR","Your account":"Hesabın",
"Edit my account":"Hesabımı düzenle","Name, avatar, colour and PIN":"Ad, avatar, renk ve PIN","Login code (no internet needed)":"Giriş kodu (internet gerekmez)",
"Move your account to another device with a code or AirDrop":"Hesabını bir kod veya AirDrop ile başka bir cihaza taşı","Log in with a code":"Kodla giriş yap",
"Paste a login code or open a .kuzey file":"Bir giriş kodu yapıştır veya .kuzey dosyası aç","Switch player":"Oyuncu değiştir","Online account":"Çevrimiçi hesap",
"Save online and log in on any device with a password":"Çevrimiçi kaydet ve her cihazda şifreyle giriş yap","Saved online · sync, password, log out":"Çevrimiçi kayıtlı · eşitle, şifre, çıkış",
"CLOSE":"KAPAT","CANCEL":"İPTAL","SAVE":"KAYDET","OK":"TAMAM","DONE":"BİTTİ","BACK":"GERİ","LEAVE":"AYRIL","Name":"Ad","Avatar":"Avatar","Colour":"Renk",
"👤 Create your account":"👤 Hesabını oluştur","✏️ Edit account":"✏️ Hesabı düzenle","Your trophies, coins and saves from every game stay with your account.":"Her oyundaki kupaların, paraların ve kayıtların hesabında kalır.",
"Secret PIN":"Gizli PIN","(4 to 6 numbers, optional)":"(4-6 rakam, isteğe bağlı)","Type your name.":"Adını yaz.","The PIN must be 4 to 6 numbers.":"PIN 4-6 rakam olmalı.",
"☁️ I ALREADY HAVE AN ONLINE ACCOUNT":"☁️ ZATEN ÇEVRİMİÇİ HESABIM VAR","Your name":"Adın",
"👥 Who is playing?":"👥 Kim oynuyor?","＋ NEW ACCOUNT":"＋ YENİ HESAP","🗑️ DELETE AN ACCOUNT":"🗑️ HESAP SİL","Playing now":"Şimdi oynuyor","Tap to play":"Oynamak için dokun",
"Type your PIN to play":"Oynamak için PIN'ini yaz","Wrong PIN, try again.":"Yanlış PIN, tekrar dene.",
// ---------- online account ----------
"☁️ Online account":"☁️ Çevrimiçi hesap","LOG IN":"GİRİŞ YAP","Username":"Kullanıcı adı","Password":"Şifre","Password again":"Şifre tekrar",
"Log in with your online account. Your progress comes to this device.":"Çevrimiçi hesabınla giriş yap. İlerlemen bu cihaza gelir.",
"Make an online account. Your progress on this device is saved online, and you can log in on any device.":"Çevrimiçi hesap oluştur. Bu cihazdaki ilerlemen çevrimiçi kaydedilir ve her cihazda giriş yapabilirsin.",
"💡 Tell a parent your username and password so you don't forget them. Don't use your real full name.":"💡 Unutmamak için kullanıcı adını ve şifreni bir büyüğüne söyle. Gerçek tam adını kullanma.",
"at least 6 characters":"en az 6 karakter","like kuzey_10":"örneğin kuzey_10",
"Wrong username or password.":"Yanlış kullanıcı adı veya şifre.","That username is already taken. Try another one.":"Bu kullanıcı adı alınmış. Başka bir tane dene.",
"Usernames are 3 to 20 letters, numbers or _ (no spaces).":"Kullanıcı adı 3-20 harf, rakam veya _ olmalı (boşluksuz).","The password must be at least 6 characters.":"Şifre en az 6 karakter olmalı.",
"The two passwords are different.":"İki şifre birbirinden farklı.","Too many wrong tries. Wait 10 minutes and try again.":"Çok fazla yanlış deneme. 10 dakika bekle ve tekrar dene.",
"🔄 SYNC NOW":"🔄 ŞİMDİ EŞİTLE","🔑 CHANGE PASSWORD":"🔑 ŞİFREYİ DEĞİŞTİR","🚪 LOG OUT OF THIS DEVICE":"🚪 BU CİHAZDAN ÇIKIŞ YAP","☁️ Syncing…":"☁️ Eşitleniyor…",
"☁️ Offline · will sync later":"☁️ Çevrimdışı · sonra eşitlenecek","☁️ Could not sync":"☁️ Eşitlenemedi","☁️ Logged out · tap to log in":"☁️ Çıkış yapıldı · giriş için dokun",
"☁️ Not online yet · tap to save online":"☁️ Henüz çevrimiçi değil · kaydetmek için dokun","☁️ Which progress do you want?":"☁️ Hangi ilerlemeyi istiyorsun?",
"You played on another device too, so there are two different saves.":"Başka bir cihazda da oynadın, bu yüzden iki farklı kayıt var.","Keep THIS device":"BU cihazı tut","Use the ONLINE copy":"ÇEVRİMİÇİ kopyayı kullan",
// ---------- friends ----------
"👥 Friends":"👥 Arkadaşlar","INVITES":"DAVETLER","EVERYONE":"HERKES","🔍 Search by name":"🔍 Ada göre ara","Loading…":"Yükleniyor…","＋ Invite":"＋ Davet et","✓ Accept":"✓ Kabul et",
"No":"Hayır","Invited · cancel":"Davet edildi · iptal","🎮 PLAY":"🎮 OYNA","No invites right now.":"Şu an davet yok.","Nobody found.":"Kimse bulunamadı.",
"👋 You have a new friend invite!":"👋 Yeni bir arkadaşlık davetin var!","Online now":"Şu an çevrimiçi",
// ---------- multiplayer ----------
"🎮 Multiplayer":"🎮 Çok oyunculu","Who do you want to play with?":"Kiminle oynamak istiyorsun?","Loading friends…":"Arkadaşlar yükleniyor…","INVITE":"DAVET ET",
"Which game?":"Hangi oyun?","soon":"yakında","Fight together":"Birlikte savaşın","Race":"Yarış","Same team: help each other win":"Aynı takım: kazanmak için birbirinize yardım edin",
"Who is the best? First one wins":"En iyisi kim? İlk bitiren kazanır","wants to play with you!":"seninle oynamak istiyor!","NO THANKS":"HAYIR, TEŞEKKÜRLER","🎮 JOIN":"🎮 KATIL",
"✋ I'M READY":"✋ HAZIRIM","✅ READY! (tap to wait)":"✅ HAZIR! (beklemek için dokun)","✅ READY":"✅ HAZIR","…getting ready":"…hazırlanıyor","⏳ not here yet":"⏳ henüz gelmedi",
"Connecting…":"Bağlanıyor…","Joining…":"Katılıyor…","Your friend left the room.":"Arkadaşın odadan ayrıldı.","That invite is over. Ask your friend to invite you again!":"Bu davetin süresi bitti. Arkadaşından seni tekrar davet etmesini iste!",
"You can only invite friends.":"Sadece arkadaşlarını davet edebilirsin.","👥 FIND FRIENDS":"👥 ARKADAŞ BUL",
// ---------- awards (kit) ----------
"You need the PIN to log in on another device, and to switch to your account if other people use this device. Don't tell anyone, but tell a parent!":"PIN, başka bir cihazda giriş yapmak ve bu cihazı başkaları da kullanıyorsa hesabına geçmek için gerekir. Kimseye söyleme, ama bir büyüğüne söyle!",
"📥 Log in from another device":"📥 Başka bir cihazdan giriş yap","On your other device: Account →":"Diğer cihazında: Hesap →","Use my account on another device":"Hesabımı başka bir cihazda kullan",
". Then paste the code here, or open the file it saved.":". Sonra kodu buraya yapıştır veya kaydettiği dosyayı aç.","📂 OPEN A .kuzey FILE":"📂 .kuzey DOSYASI AÇ","Paste your code here (it starts with KZ1.)":"Kodunu buraya yapıştır (KZ1. ile başlar)",
"To add friends you need an":"Arkadaş eklemek için bir","online account":"çevrimiçi hesap",". Then you can see everyone in Kuzey Arcade and invite them.":" gerekir. Sonra Kuzey Arcade'deki herkesi görüp davet edebilirsin.",
"☁️ MAKE OR LOG IN TO AN ONLINE ACCOUNT":"☁️ ÇEVRİMİÇİ HESAP OLUŞTUR VEYA GİRİŞ YAP","📤 Your login code":"📤 Giriş kodun","📋 COPY CODE":"📋 KODU KOPYALA","💾 SAVE FILE":"💾 DOSYAYI KAYDET",
"📲 SEND WITH AIRDROP / MESSAGES":"📲 AIRDROP / MESAJLAR İLE GÖNDER","Type your PIN to make a login code":"Giriş kodu yapmak için PIN'ini yaz","First choose a secret PIN for your account.":"Önce hesabın için gizli bir PIN seç.",
"🗑️ Delete an account":"🗑️ Hesap sil","CHECKING…":"KONTROL EDİLİYOR…","Wrong PIN (or the code is not complete).":"Yanlış PIN (veya kod eksik).","That is not a Kuzey Arcade code.":"Bu bir Kuzey Arcade kodu değil.",
"Your progress saves online by itself. On another device, open Kuzey Arcade → Account →":"İlerlemen kendiliğinden çevrimiçi kaydedilir. Başka bir cihazda Kuzey Arcade → Hesap →",
"No friends yet. Go to":"Henüz arkadaşın yok.","and invite someone!":"bölümüne gidip birini davet et!","🔑 Change password":"🔑 Şifreyi değiştir","Old password":"Eski şifre","New password":"Yeni şifre","CHANGE":"DEĞİŞTİR",
"PIN":"PIN","OPEN":"AÇ",
"All":"Hepsi","Adventure":"Macera","Action":"Aksiyon","Puzzle":"Bulmaca","Strategy":"Strateji","Racing & Sports":"Yarış ve Spor","Pretend & Build":"Hayal Et ve İnşa Et","Music & Art":"Müzik ve Sanat","Learning":"Öğrenme","Multiplayer":"Çok oyunculu","Tools":"Araçlar","🔍 Search games":"🔍 Oyun ara","No games found. Try another word!":"Oyun bulunamadı. Başka bir kelime dene!",
"Achievement unlocked!":"Başarım açıldı!","👤 Your player":"👤 Oyuncun"};
// texts with names or numbers in them
const RX=[[/^🏆 (\d+) trophies in (\d+) games · 🔓 no PIN$/,'🏆 $2 oyunda $1 kupa · 🔓 PIN yok'],[/^🏆 (\d+) trophies in (\d+) games · 🔒 PIN on$/,'🏆 $2 oyunda $1 kupa · 🔒 PIN açık'],
 [/^(\d+) accounts? on this device · add a new one$/,'bu cihazda $1 hesap · yenisini ekle'],[/^Your progress is saved on this device \((\d+) KB\)\. Nobody else can see it\.$/,'İlerlemen bu cihazda kayıtlı ($1 KB). Başka kimse göremez.'],
 [/^🏆 (\d+) trophies · (\d+) players on this device$/,'🏆 $1 kupa · bu cihazda $2 oyuncu'],[/^🏆 (\d+) trophies · Your account$/,'🏆 $1 kupa · Hesabın'],
 [/^☁️ Online: (.+)$/,'☁️ Çevrimiçi: $1'],[/^☁️ Saved online · just now$/,'☁️ Çevrimiçi kaydedildi · az önce'],[/^Online account: (.+)$/,'Çevrimiçi hesap: $1'],
 [/^(.+) is here! Tap READY when you are\.$/,'$1 geldi! Hazır olunca HAZIRIM\'a dokun.'],[/^Waiting for (.+) to join…$/,'$1 bekleniyor…'],[/^Waiting for (.+) to answer…$/,'$1 yanıtı bekleniyor…'],
 [/^(.+) said no this time\.$/,'$1 bu sefer hayır dedi.'],[/^(.+) didn't answer\. Try again later!$/,'$1 cevap vermedi. Sonra tekrar dene!'],[/^with (.+)$/,'$1 ile'],
 [/^📨 Invite sent to (.+)$/,'📨 $1 adlı kişiye davet gönderildi'],[/^🎉 You and (.+) are friends now!$/,'🎉 $1 ile artık arkadaşsınız!'],[/^(\d+) unlocked$/,'$1 açıldı'],
 [/^🎉 Account ready! Welcome, (.+)!$/,'🎉 Hesap hazır! Hoş geldin, $1!'],[/^Offline · they will only see it if they open Kuzey Arcade$/,'Çevrimdışı · sadece Kuzey Arcade\'i açarsa görür'],
 [/^@(.+) · online now$/,'@$1 · şu an çevrimiçi']];
function tr(t){const k=t.replace(/\s+/g,' ').trim();if(!k)return null;if(TR[k])return t.replace(k,TR[k]);for(const[r,v]of RX)if(r.test(k))return t.replace(k,k.replace(r,v));return null}
function walk(root){if(lang!=='tr')return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentNode&&/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)?2:1});
  const list=[];let n;while(n=w.nextNode())list.push(n);for(const x of list){const v=tr(x.nodeValue);if(v!=null&&v!==x.nodeValue)x.nodeValue=v}
  if(root.querySelectorAll)for(const el of[...(root.hasAttribute&&root.hasAttribute('placeholder')?[root]:[]),...root.querySelectorAll('[placeholder]')]){const v=tr(el.getAttribute('placeholder'));if(v)el.setAttribute('placeholder',v)}}
let obs=null;
function start(){if(lang!=='tr')return;document.documentElement.lang='tr';walk(document.body);
  obs=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData'){const v=tr(m.target.nodeValue);if(v!=null&&v!==m.target.nodeValue)m.target.nodeValue=v}else m.addedNodes.forEach(a=>{if(a.nodeType===3){const v=tr(a.nodeValue);if(v!=null&&v!==a.nodeValue)a.nodeValue=v}else if(a.nodeType===1)walk(a)})}});
  obs.observe(document.body,{childList:true,subtree:true,characterData:true})}
function setLang(l){lang=l;try{localStorage.setItem(KEY,JSON.stringify(l))}catch(e){}location.reload()}
function switcher(){const el=document.getElementById('langSw');if(!el)return;
  el.innerHTML=`<button data-l="en" class="${lang==='en'?'on':''}" aria-label="English">🇬🇧 EN</button><button data-l="tr" class="${lang==='tr'?'on':''}" aria-label="Türkçe">🇹🇷 TR</button>`;
  el.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{if(b.dataset.l!==lang)setLang(b.dataset.l)})}
window.KuzeyLang={get lang(){return lang},set:setLang,t:(en,trText)=>lang==='tr'?trText:en};
const go=()=>{switcher();start()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
