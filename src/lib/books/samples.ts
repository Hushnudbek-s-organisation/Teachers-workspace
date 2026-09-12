// ============================================================================
// NAMUNA KITOBLAR — 3-sinf, 5 fan
//
// Har bir kitob rasmiy darslik mundarijasi asosida tuzilgan mavzulardan iborat.
// Matnlar o'quv dasturiga mos namunaviy dars materiali bo'lib, aynan shu
// generator orqali o'yinlarga aylanadi (yuklangan kitoblar bilan bir xil yo'l).
// ============================================================================

import type { Book, SubjectKey, Topic } from "./types";
import { SUBJECTS } from "./types";
import { analyzeTopic, extractAuthorPairs, type BookLevelPair } from "./generate";
import { extractDefinitions } from "./extract";

interface SampleTopicSpec {
  title: string;
  section?: string;
  /** Mavzu nechta betdan iborat */
  pages: number;
  content: string;
}

interface SampleBookSpec {
  id: string;
  title: string;
  subject: SubjectKey;
  author: string;
  topics: SampleTopicSpec[];
}

// ---------------------------------------------------------------------------
// 1. MATEMATIKA
// ---------------------------------------------------------------------------

const MATEMATIKA: SampleBookSpec = {
  id: "namuna-matematika-3",
  title: "Matematika — 3-sinf",
  subject: "matematika",
  author: "Namuna darslik (rasmiy mundarija asosida)",
  topics: [
    {
      title: "Ikki va uch xonali sonlarni xonadan o'tib qo'shish va ayirish",
      section: "2-sinfda o'tilganlarni takrorlash",
      pages: 3,
      content: `Qoida: Xonadan o'tib qo'shishda birliklar birliklar ostiga, o'nliklar o'nliklar ostiga yoziladi va birliklardan boshlab qo'shiladi.
Misol: 47 + 38 = 85
Misol: 356 + 278 = 634
Misol: 502 - 147 = 355
Misol: 63 - 27 = 36
1. Yig'indini hisoblang: 68 + 24 = ?
2. Ayirmani hisoblang: 400 - 156 = ?
3. Bir do'konda 240 ta daftar, ikkinchisida 180 ta daftar bor. Jami nechta daftar bor?
4. Bog'da 350 ta olma daraxti bor edi. 125 tasi kesildi. Nechta daraxt qoldi?
5. Sonlarni taqqoslang: 348 va 384.
Eslatma: Uch xonali sonlarni ayirishda har bir xonani alohida tekshirib chiqing.`,
    },
    {
      title: "Qavsli ifodalar",
      section: "2-sinfda o'tilganlarni takrorlash",
      pages: 2,
      content: `Qoida: Qavsli ifodalarda avval qavs ichidagi amal, keyin ko'paytirish va bo'lish, oxirida qo'shish va ayirish bajariladi.
Misol: (30 + 20) · 2 = 100
Misol: 60 - (18 + 12) = 30
Misol: (48 : 6) + 15 = 23
1. Ifodaning qiymatini toping: (25 + 15) · 3 = ?
2. Ifodaning qiymatini toping: 100 - (45 + 25) = ?
3. Qavslarni shunday qo'yingki, natija 40 bo'lsin: 6 + 2 · 5.`,
    },
    {
      title: "20·3, 30·4 ko'rinishidagi ifodalar",
      section: "Jadvaldan tashqari ko'paytirish va bo'lish",
      pages: 3,
      content: `Qoida: O'nlik sonni bir xonali songa ko'paytirish uchun o'nliklar sonini ko'paytirib, natijaga nol qo'shamiz.
Misol: 20 · 3 = 60
Misol: 30 · 4 = 120
Misol: 40 · 5 = 200
Misol: 50 · 6 = 300
1. Hisoblang: 70 · 3 = ?
2. Hisoblang: 80 · 4 = ?
3. Har bir qutida 20 tadan qalam bor. 3 ta qutida nechta qalam bor?
4. Hisoblang: 90 · 5 = ?
Eslatma: 10 soni ishtirokida ko'paytirishda natijaga bitta nol qo'shiladi.`,
    },
    {
      title: "60:3, 100:2 ko'rinishidagi ifodalar",
      section: "Jadvaldan tashqari ko'paytirish va bo'lish",
      pages: 3,
      content: `Qoida: O'nlik sonni bir xonali songa bo'lish uchun o'nliklar sonini bo'lib, natijaga nol qo'shamiz.
Misol: 60 : 3 = 20
Misol: 100 : 2 = 50
Misol: 80 : 4 = 20
Misol: 240 : 6 = 40
1. Hisoblang: 90 : 3 = ?
2. Hisoblang: 100 : 5 = ?
3. 60 ta konfet 3 ta bolaga teng bo'lindi. Har bir bolaga nechtadan konfet tegdi?
4. Bo'lishni ko'paytirish bilan tekshiring: 80 : 4 = ?`,
    },
    {
      title: "Qoldiqli bo'lish",
      section: "Jadvaldan tashqari ko'paytirish va bo'lish",
      pages: 4,
      content: `Qoida: Qoldiq har doim bo'luvchidan kichik bo'ladi.
Misol: 17 : 5 = 3 (qoldiq 2)
Misol: 29 : 4 = 7 (qoldiq 1)
Misol: 50 : 7 = 7 (qoldiq 1)
1. Qoldiqli bo'lishni bajaring: 23 : 4 = ?
2. Qoldiqli bo'lishni bajaring: 45 : 6 = ?
3. Bo'lishni tekshiring: bo'linuvchi = bo'luvchi · bo'linma + qoldiq.
4. 35 ta olma 4 ta savatga teng solindi. Har bir savatga nechtadan olma tushdi va nechta olma ortiqcha qoldi?`,
    },
    {
      title: "Uchburchaklarning turlari",
      section: "Geometrik figuralar",
      pages: 3,
      content: `Teng tomonli uchburchak — barcha tomonlari teng bo'lgan uchburchak.
Teng yonli uchburchak — ikki tomoni teng bo'lgan uchburchak.
Turli tomonli uchburchak — barcha tomonlari har xil bo'lgan uchburchak.
To'g'ri burchakli uchburchak — bitta burchagi to'g'ri burchak bo'lgan uchburchak.
Qoida: Uchburchakning uchta tomoni va uchta burchagi bor. Uchburchak tomonlari yig'indisi uning perimetri deyiladi.
1. Tomonlari 5 sm, 5 sm va 5 sm bo'lgan uchburchakning perimetrini toping.
2. Tomonlari 3 sm, 4 sm va 6 sm bo'lgan uchburchakning perimetrini toping.
3. Qaysi uchburchak turli tomonli deyiladi?`,
    },
    {
      title: "Uzunlik o'lchov birliklari",
      section: "Kattaliklar",
      pages: 3,
      content: `1 km = 1000 m
1 m = 100 sm
1 dm = 10 sm
1 sm = 10 mm
1 m = 10 dm
Qoida: Uzunlikni o'lchashda kilometr, metr, detsimetr, santimetr va millimetr ishlatiladi.
1. Ifodalang: 3 km = ? m
2. Ifodalang: 5 m = ? sm
3. Ifodalang: 40 dm = ? m
4. Arqonning uzunligi 2 m 50 sm. Bu necha santimetr?`,
    },
    {
      title: "Massa o'lchov birliklari",
      section: "Kattaliklar",
      pages: 2,
      content: `1 t = 1000 kg
1 kg = 1000 g
1 sentner = 100 kg
1 t = 10 sentner
Qoida: Massa kilogramm, gramm, sentner va tonna bilan o'lchanadi.
1. Ifodalang: 2 kg = ? g
2. Ifodalang: 4 t = ? kg
3. Bir qopda 50 kg un bor. 8 ta qopda nechta kilogramm un bor?
4. 3000 g necha kilogrammga teng?`,
    },
    {
      title: "Kasr tushunchasi",
      section: "Oddiy kasrlar",
      pages: 4,
      content: `Qoida: Butun narsani teng bo'laklarga bo'lib, bitta yoki bir nechta bo'lagi olingan qismi kasr deyiladi.
Kasrning surati — chiziq ustidagi son, kasrning maxraji — chiziq ostidagi son.
Misol: 1/2 — yarim, 1/3 — uchdan bir, 1/4 — chorak.
1. Tort 4 teng bo'lakka bo'lindi. 1 bo'lagi qanday kasr bilan yoziladi?
2. 1 metrning 1/2 qismi necha santimetr?
3. 12 ta olma 3 ta teng qismga bo'lindi. 1/3 qismi nechta olma?`,
    },
    {
      title: "Rim raqamlari",
      section: "10 000 ichida raqamlash",
      pages: 2,
      content: `Qoida: Rim raqamlari I, V, X, L, C harflari bilan yoziladi.
I = 1, V = 5, X = 10, L = 50, C = 100
Misol: XII = 12
Misol: XIV = 14
Misol: XX = 20
1. Rim raqamini yozing: 9 = ?
2. Rim raqamini o'qing: XVI = ?
3. Asrlar rim raqamlari bilan yoziladi: XXI asr = 21-asr.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. ONA TILI
// ---------------------------------------------------------------------------

const ONA_TILI: SampleBookSpec = {
  id: "namuna-ona-tili-3",
  title: "Ona tili — 3-sinf",
  subject: "ona-tili",
  author: "Namuna darslik (rasmiy mundarija asosida)",
  topics: [
    {
      title: "Unli va undosh tovushlar",
      section: "Fonetika",
      pages: 3,
      content: `Qoida: O'zbek tilida oltita unli tovush bor: a, o, u, i, e, o'.
Qoida: Undosh tovushlar soni yigirma to'rtta bo'lib, ular bo'g'in hosil qilmaydi.
Misol: kitob — ki-tob, maktab — mak-tab.
Unli tovush — bo'g'in hosil qiluvchi tovush.
Undosh tovush — bo'g'in hosil qilmaydigan tovush.
1. Quyidagi so'zlardagi unli tovushlarni yozing: maktab, gulzor, daraxt, son.
2. Nuqtalar o'rniga mos harfni qo'ying: q...lom, k...tob, s...n.
3. So'zlarni o'qing va unlilar sonini aniqlang: o'quvchi, do'stlik, olma.`,
    },
    {
      title: "Bo'g'in. So'zlarni bo'g'inlarga bo'lish",
      section: "Fonetika",
      pages: 3,
      content: `Qoida: So'z bo'g'inlarga bo'linganda har bir bo'g'inda faqat bitta unli tovush bo'ladi.
Qoida: So'zni qatorga sig'masa, bo'g'inlab ko'chiriladi. Bitta harfni qatorda qoldirib ketish mumkin emas.
Misol: nav-ba-hor, o'qituvchi — o'qi-tuv-chi, daftar — daf-tar.
Bo'g'in — so'zning bir nafasda aytiladigan qismi.
1. So'zlarni bo'g'inlarga bo'ling: bahor, kitob, maktab, o'quvchi.
2. So'zlarni qatordan qatorga bo'g'inlab ko'chiring: gulzor, do'stlik, yozgi.
3. Nechta bo'g'in bor: qush, quyosh, yulduzlar, mustaqillik?`,
    },
    {
      title: "Ot so'z turkumi",
      section: "So'z turkumlari",
      pages: 4,
      content: `Ot — predmetni bildiruvchi so'z turkumi.
Qoida: Otlar kim? nima? so'rovlariga javob beradi.
Qoida: Otlar birlik va ko'plikda bo'ladi. Ko'plik -lar qo'shimchasi bilan yasaladi.
Misol: kitob — kitoblar, daraxt — daraxtlar, o'quvchi — o'quvchilar.
1. Otlarni birlik ko'plikda yozing: gul, maktab, bola, daraxt.
2. Gaplardan otlarni toping: Bog'da olma daraxtlari o'sadi.
3. Nuqtalar o'rniga mos so'zni qo'ying: ... darsga tayyorlandi. (o'quvchi)`,
    },
    {
      title: "Sifat so'z turkumi",
      section: "So'z turkumlari",
      pages: 3,
      content: `Sifat — predmetning belgisini bildiruvchi so'z turkumi.
Qoida: Sifatlar qanday? qanaqa? so'rovlariga javob beradi.
Misol: qizil olma, kattа uy, mehnatkash o'quvchi.
1. Predmetlarga mos sifat toping: quyosh, qor, do'st.
2. Gaplardan sifatlarni toping: Bahor kunlari iliq va quvnoq o'tadi.
3. Berilgan so'zlardan sifatlarni tanlang: yashil, yugurdi, shirin, kitob.`,
    },
    {
      title: "Fe'l so'z turkumi",
      section: "So'z turkumlari",
      pages: 4,
      content: `Fe'l — predmetning harakati va holatini bildiruvchi so'z turkumi.
Qoida: Fe'llar nima qildi? nima qilmoqda? nima qiladi? so'rovlariga javob beradi.
Misol: o'qidi, yozmoqda, keladi, yuguradi.
1. Gaplardan fe'llarni toping: O'quvchilar maktabga keldilar.
2. Fe'llarni to'g'ri shaklda yozing: Bola kitobni ... (o'qidi).
3. Harakat fe'llarini tanlang: yugurmoq, ko'k, quvnoq, yozmoq.`,
    },
    {
      title: "So'z tarkibi: o'zak va qo'shimcha",
      section: "So'z tarkibi",
      pages: 3,
      content: `O'zak — so'zning asosiy ma'noli qismi.
Qo'shimcha — o'zakka qo'shilib yangi ma'no beruvchi qism.
Misol: ishchi = ish + chi, gulzor = gul + zor, kitobim = kitob + im.
Qoida: So'z tarkibini aniqlashda avval o'zak, keyin qo'shimcha topiladi.
1. So'zlarning o'zagini toping: bog'bon, ishchi, maktabim.
2. Qo'shimchalar yordamida yangi so'z yasang: gul, ish, bog'.
3. Berilgan so'zlarni tarkibiga ko'ra ajrating: uyimiz, daraxtzor, o'quvchilar.`,
    },
    {
      title: "Gap. Gap oxiridagi tinish belgilari",
      section: "Sintaksis",
      pages: 3,
      content: `Qoida: Gap tugallangan fikrni bildiradi va bosh harf bilan boshlanadi.
Qoida: Darak gap oxirida nuqta, so'roq gap oxirida savol belgisi, his-hayajon gap oxirida undov belgisi qo'yiladi.
Misol: Bugun havo issiq. Bugun havo issiqmi? Bugun havo juda issiq!
1. Gaplarni to'g'ri tinish belgisi bilan yozing: Maktabimiz juda chiroyli
2. Nuqtalar o'rniga mos so'z qo'ying: ... ertalab maktabga bordim. (men)
3. So'roq gaplarni toping: Siz qayerda o'qiysiz. Bahor keldi! Nima uchun kechikdingiz?`,
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. O'QISH SAVODXONLIGI
// ---------------------------------------------------------------------------

const OQISH: SampleBookSpec = {
  id: "namuna-oqish-3",
  title: "O'qish savodxonligi — 3-sinf",
  subject: "oqish",
  author: "Namuna matnlar (darslik bo'limlari bo'yicha)",
  topics: [
    {
      title: "Vatan madhi",
      section: "Biz buyuk yurt farzandimiz",
      pages: 3,
      content: `Vatan — inson uchun eng aziz va muqaddas makon. Har bir kishi o'z Vatanini sevadi va unga sadoqat bilan xizmat qiladi.
Vatanimiz O'zbekiston boy tarixga ega bo'lgan go'zal yurt. Uning sahrosi ham, tog'lari ham, bog'lari ham o'zgacha chiroyli.
Yurtimizda tinchlik va do'stlik hukm surmoqda. Yoshlar ilm olishga, hunar o'rganishga intilmoqda.
Vatanni sevish uni asrashdan, unga g'amxo'rlik qilishdan boshlanadi. Toza saqlangan bog'lar va gullagan dalalar yurtimizning jamolidir.
Savol: Vatan nima uchun inson uchun aziz?
Savol: Yurtimizda nima hukm surmoqda?`,
    },
    {
      title: "Kuz saxovati",
      section: "Saxovatli kuz",
      pages: 3,
      content: `Kuz yetib keldi. Daraxtlar barglari sariq va qizil rangga bo'yaldi.
Bog'larda uzum, olma va anor pishdi. Dehqonlar hosil terish bilan band.
Oltin kuzi saxovatli fasl deyiladi, chunki u odamlarga mo'l hosil ulashadi.
Qushlar issiq yurtlarga uchib ketadi. Havo salqinlashadi va yomg'ir ko'p yog'adi.
Bolalar maktabda o'qishni davom ettiradilar va kuzgi tabiatdan zavqlanadilar.
Savol: Kuzda daraxtlar barglari qanday rangga bo'yaladi?
Savol: Nima uchun kuz saxovatli fasl deyiladi?`,
    },
    {
      title: "Kitob — mening do'stim",
      section: "Maktabim — qutlug' makonim",
      pages: 3,
      content: `Kitob — insonning eng sodiq va inonchli do'sti. U hech qachon xiyonat qilmaydi va bilim berishdan charchamaydi.
Kitob o'qigan bola dunyoni kengroq taniydi. U yangi so'zlarni o'rganadi, fikrlashni o'rgаnadi.
Har bir kitobda muallifning umri davomida to'plangan tajribasi jamlangan.
Ao'z ona tilini, tarixini va qadrli qadriyatlarini kitoblardan o'rganadi.
Kitobni avaylab saqlash kerak. Uni yirtmaslik, varaqlarini buklamaslik zarur.
Savol: Nima uchun kitob shoiraning eng sodiq do'sti deyiladi?
Savol: Kitob o'qigan bola nimalarni o'rganadi?`,
    },
    {
      title: "Qish manzarasi",
      section: "Go'zal qish manzarasi",
      pages: 3,
      content: `Qish keldi. Atrof oppoq qor bilan qoplandi va daraxtlar kumushrang tus oldi.
Bolalar hovlida qorbo'ron o'ynaydilar va qordan odam yasaydilar. Ular chanada sirpanib, katta zavq oladilar.
Qor yupqa ko'rpachaga o'xshab yerning yuzini qopladi. U bug'doy ekilgan dalalarni sovuqdan asraydi.
Qishda tun uzun, kun qisqa bo'ladi. Barcha jonivorlar iliq panoh qidiradi.
Yangi yil qishda keladi va odamlar uni katta shodiyona bilan kutib oladilar.
Savol: Qor dalalarni nimadan asraydi?
Savol: Bolalar qishda qanday o'yinlar o'ynaydilar?`,
    },
    {
      title: "Xalq og'zaki ijodi: maqol va topishmoqlar",
      section: "Xalq og'zaki ijodi",
      pages: 4,
      content: `Xalq og'zaki ijodi asrlar davomida og'izdan og'izga o'tib kelgan boy merosdir. Unga maqollar, topishmoqlar, ertaklar va qo'shiqlar kiradi.
Maqol — qisqa va chuqur ma'noli hikmatli so'z. "Yaxshilik ketidan yaxshilik keladi" degan maqol saxiylik va mehrni ulug'laydi.
Topishmoq — narsani to'g'ridan to'g'ri aytmasdan, belgilariga qarab topishga chorlaydigan jumboq.
Ertaklar bolalarni yaxshilikka, mardlikka va adolatga o'rgatadi. Ertaklarda ezgu kuchlar yovuzlikni yengadi.
Maqol va topishmoqlar bolaning xotirasini mustahkamlaydi va tilini boyitadi.
Savol: Maqol nima?
Savol: Ertaklar bolalarni nimaga o'rgatadi?`,
    },
    {
      title: "Zumrad bahor nafosati",
      section: "Zumrad bahor nafosati",
      pages: 3,
      content: `Bahor keldi. Quyosh iliq nurini socha boshladi va qorlar eridi.
Daraxtlar kurtak chiqarib, gullarga burkandi. Tog'lardan shildirab soylar oqadi.
Dalalarda bahorgi ishlar boshlandi. Dehqonlar yer tanlab, urug' ekishga tayyorlanadi.
Navro'z bayrami bahorda nishonlanadi. Odamlar sumalak pishirib, mehmonlarga tortiq qiladi.
Qushlar issiq mamlakatlardan qaytib keladi. Bolalar hovlilarda varrak uchirib, bahordan zavqlanadilar.
Savol: Bahorda daraxtlarga nima bo'ladi?
Savol: Navro'z qaysi faslda nishonlanadi?`,
    },
    {
      title: "Bo'limdagi asarlar ro'yxati",
      section: "Qo'shimcha",
      pages: 2,
      content: `Vatan madhi. Orif To'xtash
Yurtim jamoli. Dilshod Rajab
Opa-singil daryolar. Go'zal Begim
Kuz saxovati. Sharifa Salimova
Uzumlar oilasi. Tolib Yo'ldosh
Kitob, mening do'stimsan. Zafar Diyor
Vaqting ketdi — naqding ketdi. Kavsar Turdiyeva
Chana. O'tkir Hoshimov
Qish ertagi. Aziza Ahmedova
Bahor keldi. Quddus Muhammadiy
Varrak. Yo'ldosh Shamsharov`,
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. TABIIY FANLAR
// ---------------------------------------------------------------------------

const TABIIY_FANLAR: SampleBookSpec = {
  id: "namuna-tabiiy-fanlar-3",
  title: "Tabiatshunoslik — 3-sinf",
  subject: "tabiiy-fanlar",
  author: "Namuna darslik (rasmiy mundarija asosida)",
  topics: [
    {
      title: "Yer usti va yer osti suvlari",
      section: "Tabiatda suv va havo",
      pages: 3,
      content: `Yer yuzidagi suvlar yer usti suvlari va yer osti suvlariga bo'linadi.
Yer usti suvlari — daryolar, ko'llar, dengizlar va ariqlardagi suvlar.
Yer osti suvlari — yer qatlamlari ostida to'plangan suvlar. Quduq va buloqlar shu suvlar hisobidan to'yinadi.
Qoida: Yer yuzasidagi suv quyosh issiqligi ta'sirida bug'lanib, yomg'ir va qor ko'rinishida yana yerga qaytadi.
Suv — barcha jonli mavjudotlar uchun zarur boylik.
1. Yer usti suvlariga nimalar kiradi?
2. Buloq va quduq suvi qaysi suvlarga kiradi?
3. Suvning tabiatdagi aylanishini aytib bering.`,
    },
    {
      title: "Suvning xususiyatlari",
      section: "Tabiatda suv va havo",
      pages: 3,
      content: `Suv — rangsiz, hidsiz va mazasiz suyuqlik.
Suv oqadi va o'zi quyilgan idish shaklini oladi.
Qoida: Suv 100 gradus issiqlikda qaynaydi va 0 gradusda muzlaydi.
Muz — suvning qattiq holati, bug' esa gaz holati.
Suv issiqlikni sekin o'tkazadi, shuning uchun qishda suv muzlab, muz ustida yurish mumkin bo'ladi.
1. Suvning uch holatini ayting.
2. Suv necha gradusda qaynaydi?
3. Nima uchun suv idish shaklini oladi?`,
    },
    {
      title: "Tabiatda havo",
      section: "Tabiatda suv va havo",
      pages: 3,
      content: `Havo — Yer sharini o'rab turgan gaz qatlami.
Havo tarkibida kislorod, azot va karbonat angidrid gazi bor.
Kislorod — nafas olish va yonish uchun zarur gaz.
Qoida: Havo hamma joyda bor, lekin uni ko'rib va ushlab bo'lmaydi.
Shamollarning yo'nalishi va kuchi ob-havoning belgilaridan biridir.
1. Havo tarkibida qanday gazlar bor?
2. Qaysi gaz nafas olish uchun zarur?
3. Havoni ko'rib bo'ladimi, nega?`,
    },
    {
      title: "Tuproq. Uning tuzilishi",
      section: "Tuproq",
      pages: 3,
      content: `Tuproq — yerning eng ustki unumdor qatlami.
Tuproqning tarkibida qum, gil, suv, havo va mayda organizmlar bor.
Qoida: Tuproqning eng asosiy xususiyati unumdorlikdir.
Unumdorlik — o'simliklarni o'stirish va hosil berish qobiliyati.
Tuproqni shamol va suv yuvib ketishidan asrash kerak.
1. Tuproq nima?
2. Tuproq tarkibida nimalar bor?
3. Tuproqning asosiy xususiyati nima deyiladi?`,
    },
    {
      title: "Hasharotlar",
      section: "Hayvonot dunyosi",
      pages: 3,
      content: `Hasharotlar — olti oyog'i va uch qismdan iborat tanasi bo'lgan mayda jonivorlar.
Hasharotlar: chivin, pashsha, ari, kapalak, chumoli, qo'ng'iz.
Qoida: Hasharotlarning tanasi bosh, ko'krak va qorindan iborat.
Asalarilar gullardan sharbat to'plab, asal tayyorlaydi.
Chumolilar juda mehnatkash bo'lib, ular birgalikda yashaydi.
1. Hasharotlarning tanasi qanday qismlardan iborat?
2. Asalarilar nimani tayyorlaydi?
3. Qaysi hasharotlar birgalikda yashaydi?`,
    },
    {
      title: "Qushlar va uy parrandalari",
      section: "Hayvonot dunyosi",
      pages: 3,
      content: `Qushlar — pat va tuklar bilan qoplangan, tuxum qo'yib ko'payadigan jonivorlar.
Qushlar: chumchuq, kaptar, qaldirg'och, burgut, laylak.
Uy parrandalari: tovuq, o'rdak, g'oz, kurka.
Qoida: Qushlarning suyagi yengil bo'lgani uchun ular ucha oladi.
Laylak va qaldirg'och kuzda issiq yurtlarga uchib ketadi.
1. Qushlar joni necha bilan qoplangan?
2. Uy parrandalariga nimalar kiradi?
3. Qushlar nima uchun ucha oladi?`,
    },
    {
      title: "Tabiat muhofazasi",
      section: "Tabiatni muhofaza qilish",
      pages: 3,
      content: `Tabiat — inson hayoti uchun zarur manba.
Qoida: Tabiat boyliklaridan oqilona foydalanish va uni asrab-avaylash har bir kishining burchidir.
Daraxtlarni ekish, suvni tejash va chiqindilarni yig'ish tabiatni saqlashning oddiy usullari.
Zaxarli chiqindilar suv va tuproqni iflos qiladi.
Qo'riqxonalar — o'simlik va hayvonlarni muhofaza qilish uchun tashkil etilgan hududlar.
1. Tabiatni muhofaza qilishning oddiy usullarini ayting.
2. Qo'riqxona nima?
3. Chiqindilar tabiatga qanday zarar yetkazadi?`,
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. INGLIZ TILI
// ---------------------------------------------------------------------------

const INGLIZ_TILI: SampleBookSpec = {
  id: "namuna-ingliz-tili-3",
  title: "Ingliz tili — 3-sinf",
  subject: "ingliz-tili",
  author: "Namuna darslik (rasmiy mavzular asosida)",
  topics: [
    {
      title: "My family — Mening oilam",
      section: "Unit 1",
      pages: 3,
      content: `mother — ona
father — ota
sister — opa yoki singil
brother — aka yoki uka
grandmother — buvi
grandfather — bobo
family — oila
This is my mother. She is a doctor.
This is my father. He is a teacher.
I have one sister and two brothers.
1. Name the members of your family.
2. My ... is a doctor. (mother)`,
    },
    {
      title: "Numbers — Sonlar",
      section: "Unit 2",
      pages: 3,
      content: `one — bir
two — ikki
three — uch
four — to'rt
five — besh
six — olti
seven — yetti
eight — sakkiz
nine — to'qqiz
ten — o'n
I have five apples.
There are ten pupils in the classroom.
1. Count from one to ten.
2. Three plus two is ... (five)`,
    },
    {
      title: "Colours — Ranglar",
      section: "Unit 3",
      pages: 3,
      content: `red — qizil
blue — ko'k
green — yashil
yellow — sariq
black — qora
white — oq
orange — to'q sariq
brown — jigarrang
The sky is blue.
The grass is green.
My bag is black.
1. What colour is the sun? The sun is ... (yellow)
2. Name three colours you like.`,
    },
    {
      title: "Animals — Hayvonlar",
      section: "Unit 4",
      pages: 3,
      content: `cat — mushuk
dog — it
horse — ot
cow — sigir
sheep — qo'y
bird — qush
fish — baliq
rabbit — quyon
A cat says mew. A dog says bow-wow.
The horse runs fast.
I have a small rabbit at home.
1. Which animal can fly? ... can fly. (bird)
2. A ... gives milk. (cow)`,
    },
    {
      title: "Food and drinks — Ovqat va ichimliklar",
      section: "Unit 5",
      pages: 3,
      content: `bread — non
milk — sut
apple — olma
water — suv
tea — choy
rice — guruch
meat — go'sht
soup — sho'rva
I like bread and milk for breakfast.
My mother makes soup.
Would you like some tea?
1. What do you eat for breakfast?
2. I drink ... in the morning. (milk)`,
    },
    {
      title: "My school — Mening maktabim",
      section: "Unit 6",
      pages: 3,
      content: `school — maktab
teacher — o'qituvchi
pupil — o'quvchi
book — kitob
pen — ruchka
pencil — qalam
ruler — chizg'ich
blackboard — doska
This is my school. It is big and clean.
My teacher is kind.
I have a new book and two pencils.
1. What is your teacher's name?
2. I write with a ... (pen)`,
    },
  ],
};

// ---------------------------------------------------------------------------

const SPECS: SampleBookSpec[] = [MATEMATIKA, ONA_TILI, OQISH, TABIIY_FANLAR, INGLIZ_TILI];

let cache: Book[] | null = null;

/** Namuna kitoblarni quradi (o'yinlar aynan yuklangan kitoblar bilan bir xil generator orqali yasaladi) */
export function SAMPLE_BOOKS(): Book[] {
  if (cache) return cache;
  cache = SPECS.map(buildSampleBook);
  return cache;
}

function buildSampleBook(spec: SampleBookSpec): Book {
  const fullText = spec.topics.map((t) => t.content).join("\n");
  const authorPairs: BookLevelPair[] = extractAuthorPairs(fullText, 24);
  const allDefs = extractDefinitions(fullText, 40);
  const createdAt = "2026-01-15T08:00:00.000Z";

  let page = 3;
  const topics: Topic[] = spec.topics.map((t, i) => {
    const raw = {
      title: t.title,
      section: t.section,
      pageStart: page,
      pageEnd: page + t.pages - 1,
      text: t.content,
      source: "toc" as const,
    };
    page += t.pages;
    const topic = analyzeTopic(raw, spec.subject, spec.id, { otherDefs: allDefs, authorPairs });
    topic.index = i + 1;
    return topic;
  });

  const chars = spec.topics.reduce((s, t) => s + t.content.length, 0);

  return {
    id: spec.id,
    title: spec.title,
    grade: 3,
    subject: spec.subject,
    subjectLabel: SUBJECTS[spec.subject].label,
    language: spec.subject === "ingliz-tili" ? "en" : "uz",
    author: spec.author,
    mode: "namuna",
    source: {
      kind: "matn",
      fileName: `${spec.subject}-namuna.txt`,
      sizeBytes: chars,
      pages: page - 1,
      chars,
    },
    createdAt,
    topics,
    stats: {
      topics: topics.length,
      games: topics.reduce((s, t) => s + t.games.length, 0),
      items: topics.reduce((s, t) => s + t.games.reduce((a, g) => a + g.items.length, 0), 0),
      pages: page - 1,
      chars,
    },
  };
}
