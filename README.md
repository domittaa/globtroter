# Globtroter: flagi, mapy i stolice (iPad)

Cała aplikacja to folder **`app`**. Działa w Safari na iPadzie, a po dodaniu do ekranu
początkowego otwiera się jak zwykła aplikacja: z własną ikoną, na pełnym ekranie i bez internetu.

| Tryb | Na czym polega |
|------|----------------|
| 🏳️ **Flagi** | Pokazuje się flaga, wpisujesz nazwę kraju (albo wybierasz z 4 odpowiedzi). |
| 🗺️ **Mapa** | Wybierasz kontynent. Na mapie są kontury państw, obok lista krajów. Przeciągasz nazwy na właściwe miejsca. |
| 🏛️ **Stolice** | Pokazuje się kraj, wpisujesz jego stolicę (albo wybierasz z 4 odpowiedzi). |
| 📖 **Atlas** | Ściąga do nauki: każdy kraj z flagą, stolicą i położeniem na mapie świata. |

W środku jest 197 państw: 193 członków ONZ oraz Watykan, Palestyna, Kosowo i Tajwan.
Rosja i Turcja są na mapach Europy i Azji.

---

## Instalacja na iPadzie (na stałe, zalecana)

Tak samo jak Kolorowanka: aplikację trzeba raz wrzucić do internetu, żeby iPad mógł ją pobrać.

**Na Macu:**

1. Otwórz w przeglądarce stronę **https://app.netlify.com/drop** i zaloguj się.
2. W Finderze otwórz folder `claude_projects` → `globtroter`. Przeciągnij folder **`app`**
   na pole do upuszczania plików na stronie Netlify.
3. Po kilku sekundach dostaniesz adres w rodzaju `https://cos-tam-123abc.netlify.app`.
   Możesz go zmienić na łatwiejszy: **Site configuration → Change site name**
   (np. `globtroter-moj`, wtedy adres to `https://globtroter-moj.netlify.app`).

**Na iPadzie:**

4. Otwórz ten adres w **Safari**.
5. Stuknij **Udostępnij** (kwadrat ze strzałką w górę), a potem **„Do ekranu początkowego”**.
   Jeśli pojawi się przełącznik **„Otwórz jako aplikację internetową”**, zostaw go włączonego. Stuknij **Dodaj**.
6. Uruchamiaj Globtrotera ikoną z ekranu początkowego. Za pierwszym razem iPad musi mieć internet,
   żeby pobrać mapy i flagi (około 4 MB). Później działa też offline.

**Aktualizacja:** gdy w aplikacji coś się zmieni, w Netlify wejdź w swoją stronę → **Deploys** i przeciągnij
nowy folder `app` na pole „Need to update your site?”. iPad pobierze nową wersję przy następnym uruchomieniu z internetem.

Punkty, odznaki i postępy zapisują się na iPadzie, w samej aplikacji. Nie usuwaj danych tej strony
w Ustawieniach Safari, bo stracisz postępy.

---

## Szybki test bez zakładania konta (iPad i Mac w tej samej sieci Wi-Fi)

1. Na Macu otwórz **Terminal** i wpisz:
   ```bash
   cd ~/claude_projects/globtroter/app && python3 -m http.server 8000
   ```
2. Na iPadzie otwórz w Safari adres **`http://ADRES-MACA:8000`**. Adres Maca znajdziesz
   w Ustawieniach systemowych → Wi-Fi → Szczegóły → Adres IP (np. `192.168.1.146`).
3. Działa tylko wtedy, gdy Mac jest włączony, a polecenie w Terminalu pracuje.
   Postępy z wersji testowej nie przejdą do wersji z Netlify.

---

## Jak grać

**Flagi i stolice**
- Wybierz liczbę pytań (10, 20 albo wszystkie) i sposób odpowiadania, potem region.
- Przy wpisywaniu nie trzeba polskich znaków ani wielkich liter, a drobne literówki są wybaczane
  („wegry”, „Wengry” → Węgry). Działają też inne nazwy: Holandia/Niderlandy, Birma/Mjanma, USA, RPA, ZEA.
- **Podpowiadanie nazw**: po dwóch literach pod polem pojawia się lista pasujących krajów (albo stolic),
  np. „pol” → Polska. Stuknięcie nazwy od razu ją zatwierdza. Enter wybiera nazwę podświetloną,
  a gdy pasuje kilka (np. „ira” → Irak, Iran), najpierw prosi o wybór. Podpowiadanie wyłączysz na ekranie
  wyboru regionu („Podpowiadanie nazw: Nie”).
- 💡 **Podpowiedź** odsłania pierwsze litery (za mniej punktów). **Nie wiem** pokazuje odpowiedź.
- Po pomyłce widać, czyja to była flaga albo stolica, więc z każdego błędu czegoś się uczysz.
- Na koniec rundy jest lista **Do powtórki** i przycisk **Powtórz błędy**.

**Mapa**
- **Przeciągnij** nazwę kraju z listy na mapę. Na iPadzie pociągnij ją w stronę mapy
  albo przytrzymaj chwilę i przesuń. Możesz też **stuknąć nazwę**, a potem miejsce na mapie.
- **Dwoma palcami** przybliżasz i przesuwasz mapę; przyciski **+ − ⤢** robią to samo.
- Najmniejsze państwa (Watykan, Monako, wyspy Karaibów i Pacyfiku) mają na mapie **kółka**.
- Na każdy kraj są 3 próby. Po trzeciej pomyłce mapa pokazuje, gdzie on leży.
- 💡 **Podpowiedź**: stuknij kraj na liście, potem 💡. Mapa mignie w miejscu, gdzie leży ten kraj.
- Ułożenie mapy można przerwać: postęp zapisuje się sam, a przy kontynencie pojawia się **Kontynuuj**.
- **📖 Ucz się** otwiera mapę z podpisami: stuknij kraj, żeby zobaczyć jego nazwę, flagę i stolicę.

## Punkty i nagrody

- **XP** za każdą dobrą odpowiedź: 20 za wpisaną, 10 za wybraną, +5 za szybką (poniżej kilku sekund).
- **Seria 🔥**: kolejne dobre odpowiedzi mnożą punkty ×2 (od 5 z rzędu), ×3 (od 10), ×4 (od 20).
  Na mapie mnożnik wynosi ×1,5 i ×2.
- **Poziomy**: od 🎒 Turysty przez 🧭 Podróżnika i 🗺️ Kartografa aż do 👑 Legendy świata.
- **Gwiazdki opanowania** (3 kropki przy kraju w Atlasie): każda dobra odpowiedź dodaje kropkę, błąd zabiera.
  Trzecią kropkę daje tylko odpowiedź **wpisana** bez podpowiedzi.
- **Gwiazdki za mapę** (do 3) zależą od liczby błędów; zapisują się rekordy czasu.
- **22 odznaki**, np. Gorąca seria, Perfekcja, Błyskawica, Weksylolog, Snajper, Zdobywca świata, Ekspres przez Europę.
- **Seria dni** 🔥: graj codziennie, żeby ją utrzymać.

---

## Dla ciekawych: skąd dane

- Kontury państw: **Natural Earth** 1:50m (domena publiczna). Każdy kontynent ma własny rzut
  (azymutalny równopolowy Lamberta), więc kraje nie są zniekształcone.
- Flagi: **flag-icons** (licencja MIT, plik `app/flags/LICENSE`).
- Polskie nazwy państw i stolic według urzędowego wykazu nazw geograficznych, z popularnymi wariantami.

Pliki w `app/data` i `app/flags` buduje skrypt `tools/build_data.py` (wymaga pobranego GeoJSON Natural Earth
i paczki flag-icons). Listę krajów, stolic i akceptowanych nazw można poprawić w `tools/countries_data.py`.
Ikonę rysuje `tools/make_icon.py`. Do testów na komputerze: `python3 tools/serve.py`, potem http://localhost:8766.
