# Globtroter: flags, maps and capitals (iPad)

The whole app is the **`app`** folder. It runs in Safari on an iPad, and once added to the Home Screen
it opens like a regular app: with its own icon, full screen and no internet connection needed.

| Mode | What it does |
|------|--------------|
| 🏳️ **Flags** | A flag is shown and you type the country's name (or pick from 4 answers). |
| 🗺️ **Map** | Pick a continent. The map shows country outlines with a list of countries next to it. You drag the names onto the right places. |
| 🏛️ **Capitals** | A country is shown and you type its capital (or pick from 4 answers). |
| 📖 **Atlas** | A study cheat sheet: every country with its flag, capital and location on the world map. |

There are 197 countries: the 193 UN members plus the Vatican, Palestine, Kosovo and Taiwan.
Russia and Turkey appear on both the Europe and Asia maps.

---

## Installing on the iPad (permanent, recommended)

Same as with Kolorowanka: the app has to be uploaded to the internet once so the iPad can download it.

**On the Mac:**

1. Open **https://app.netlify.com/drop** in a browser and log in.
2. In Finder open the `claude_projects` → `globtroter` folder. Drag the **`app`** folder
   onto the drop area on the Netlify page.
3. After a few seconds you will get an address like `https://something-123abc.netlify.app`.
   You can change it to an easier one: **Site configuration → Change site name**
   (e.g. `globtroter-mine`, which makes the address `https://globtroter-mine.netlify.app`).

**On the iPad:**

4. Open that address in **Safari**.
5. Tap **Share** (the square with an up arrow), then **"Add to Home Screen"**.
   If an **"Open as Web App"** switch appears, leave it on. Tap **Add**.
6. Launch Globtroter from its Home Screen icon. The first time, the iPad needs internet
   to download the maps and flags (about 4 MB). After that it also works offline.

**Updating:** when something changes in the app, go to your site in Netlify → **Deploys** and drag the
new `app` folder onto the "Need to update your site?" area. The iPad will download the new version the next time it is launched with internet.

Points, badges and progress are saved on the iPad, inside the app. Don't clear this site's data
in Safari settings, or you will lose your progress.

---

## Quick test without creating an account (iPad and Mac on the same Wi-Fi network)

1. On the Mac open **Terminal** and type:
   ```bash
   cd ~/claude_projects/globtroter/app && python3 -m http.server 8000
   ```
2. On the iPad open **`http://MAC-ADDRESS:8000`** in Safari. You can find the Mac's address
   in System Settings → Wi-Fi → Details → IP Address (e.g. `192.168.1.146`).
3. It only works while the Mac is on and the Terminal command is running.
   Progress from the test version will not carry over to the Netlify version.

---

## How to play

**Flags and capitals**
- Choose the number of questions (10, 20 or all) and the answer method, then a region.
- When typing, Polish diacritics and capital letters are not required, and small typos are forgiven
  ("wegry", "Wengry" → Węgry). Alternative names work too: Holandia/Niderlandy, Birma/Mjanma, USA, RPA, ZEA.
- **Name suggestions**: after two letters a list of matching countries (or capitals) appears under the field,
  e.g. "pol" → Polska. Tapping a name confirms it right away. Enter picks the highlighted name,
  and when several match (e.g. "ira" → Irak, Iran), it first asks you to choose. You can turn suggestions off on the
  region selection screen ("Name suggestions: No").
- 💡 **Hint** reveals the first letters (for fewer points). **I don't know** shows the answer.
- After a mistake you see whose flag or capital it was, so you learn something from every error.
- At the end of a round there is a **To review** list and a **Repeat mistakes** button.

**Map**
- **Drag** a country name from the list onto the map. On the iPad, pull it toward the map
  or press and hold for a moment and then move it. You can also **tap the name** and then a place on the map.
- **Two fingers** zoom and pan the map; the **+ − ⤢** buttons do the same.
- The smallest countries (the Vatican, Monaco, Caribbean and Pacific islands) are shown as **circles** on the map.
- Each country gets 3 tries. After the third mistake the map shows where it is.
- 💡 **Hint**: tap a country in the list, then 💡. The map flashes where that country is.
- You can interrupt a map round: progress is saved automatically, and a **Continue** button appears next to the continent.
- **📖 Learn** opens the map with labels: tap a country to see its name, flag and capital.

## Points and rewards

- **XP** for every correct answer: 20 for a typed one, 10 for a chosen one, +5 for a fast one (within a few seconds).
- **Streak 🔥**: consecutive correct answers multiply points ×2 (from 5 in a row), ×3 (from 10), ×4 (from 20).
  On the map the multipliers are ×1.5 and ×2.
- **Levels**: from 🎒 Tourist through 🧭 Traveler and 🗺️ Cartographer up to 👑 World Legend.
- **Mastery stars** (3 dots next to a country in the Atlas): each correct answer adds a dot, a mistake removes one.
  The third dot is only given for an answer that was **typed** without a hint.
- **Map stars** (up to 3) depend on the number of mistakes; time records are saved.
- **22 badges**, e.g. Hot Streak, Perfection, Lightning, Vexillologist, Sniper, World Conqueror, Europe Express.
- **Day streak** 🔥: play every day to keep it going.

---

## For the curious: where the data comes from

- Country outlines: **Natural Earth** 1:50m (public domain). Each continent has its own projection
  (Lambert azimuthal equal-area), so countries are not distorted.
- Flags: **flag-icons** (MIT license, file `app/flags/LICENSE`).
- Polish names of countries and capitals follow the official register of geographical names, with common variants.

The files in `app/data` and `app/flags` are built by the `tools/build_data.py` script (it needs the downloaded Natural Earth GeoJSON
and the flag-icons package). The list of countries, capitals and accepted names can be edited in `tools/countries_data.py`.
The icon is drawn by `tools/make_icon.py`. For testing on a computer: `python3 tools/serve.py`, then http://localhost:8766.
