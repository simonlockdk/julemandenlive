# Nordpolens Kontrolcentral

Danmarks hyggeligste juleportal. Følg julemandens kane på en interaktiv globus, kig ind på
Nordpolens værksteder via en simuleret NVR-overvågningscentral, åbn julekalenderen, tæl ned
til juleaften og find de skjulte nisser.

> **Skal siden i luften?** Følg den nemme trin-for-trin-guide i [GUIDE.md](GUIDE.md).

> Alt på siden er en **magisk simulation**: ingen rigtige GPS-data, ingen rigtig overvågning,
> ingen cookies til besøgende og ingen indsamling af personoplysninger.

---

## Indhold

1. [Overblik og arkitektur](#overblik-og-arkitektur)
2. [Lokal udvikling](#lokal-udvikling)
3. [Deployment (podman + Apache)](#deployment)
4. [Opdatering af siden](#opdatering-af-siden)
5. [Administration](#administration)
6. [Videoer til kameraerne](#videoer-til-kameraerne)
7. [Konfiguration og datafiler](#konfiguration-og-datafiler)
8. [Sådan virker tracking og tid](#sådan-virker-tracking-og-tid)
9. [Test](#test)
10. [Drift, backup og fejlfinding](#drift-backup-og-fejlfinding)
11. [Nyt år – sådan forbereder du næste jul](#nyt-år)

---

## Overblik og arkitektur

```
Browser ──HTTPS──▶ Apache (julemandenlive.dk)
                    ├─ /media/*  → leveres direkte fra /var/www/julemandenlive.dk/media
                    └─ /*        → reverse proxy til 127.0.0.1:3200
                                    └─ rootless podman-container "nordpolen"
                                       Node 22 + Fastify
                                       ├─ færdigbygget frontend (React + Vite)
                                       ├─ /api        offentlige data (tid, ruter, kalender …)
                                       ├─ /api/admin  kræver login
                                       └─ /data/*.json redigerbare datafiler
```

| Del | Teknologi |
|---|---|
| Frontend | React 19, React Router, Vite, ren CSS (eget designsystem) |
| Kort | MapLibre GL JS (globusprojektion) med OpenFreeMap-vektorkort – gratis, ingen API-nøgle, ingen cookies |
| Server | Node 22, Fastify 5, zod-validering, JSON-datafiler |
| Video | Native MP4/WebM, HLS via hls.js (indlæses kun ved behov) |
| Drift | Rootless podman + systemd-quadlet, Apache som reverse proxy, Let's Encrypt |

### Mappestruktur

```
src/
  shared/      Fælles kode for server og browser (tid, sæson, simuleringsmotor, Nordpol-data)
  server/      Fastify-app, auth, datalagring, valideringsskemaer, standardindhold
    defaults/  Standardindhold: kameraer, byer/ruter, julekalender, tekster …
  web/         React-frontend
    features/map/       Flyradar, telemetri, tidslinje
    features/nvr/       Overvågningscentral, kamerascener tegnet i kode, hændelser
    features/calendar/  Julekalender, animationer og spil
    components/         Layout, nedtællinger, adventskrans, dashboardpaneler …
    pages/              Rensdyr, missioner, om siden, 404
    admin/              Administrationen
tests/         Enhedstests (tid, advent, kalender, tracking, server/sikkerhed)
scripts/       Browsertests (e2e) og screenshots
deploy/        Quadlet-fil, deploy-script og Apache-konfiguration
```

---

## Lokal udvikling

Kræver Node 22 eller nyere.

```bash
npm install
npm run dev          # API på :3200 og Vite på :5173 (åbn http://localhost:5173)
```

I udviklingstilstand er **tidsmaskinen** åben for alle: tilføj `?tid=2026-12-24T19:20` til
adressen for at se siden, som den ser ud på et bestemt tidspunkt (dansk tid). `?tid=nu` nulstiller.

Admin lokalt:

```bash
cp .env.example .env
npm run hash-password          # indsæt hashen i .env
npm run build && npm run start:dev-env
# åbn http://localhost:3200/admin
```

---

## Deployment

Appen kører som en almindelig bruger i en rootless podman-container på en Linux-server
(fx Ubuntu 24.04). Apache står foran og håndterer HTTPS. Erstat `DIN_BRUGER` nedenfor med
dit eget brugernavn på serveren, og `julemandenlive.dk` med dit eget domæne.

### Engangsopsætning (kræver sudo)

```bash
# 1. Lad brugerservices køre uden at du er logget ind (og starte efter genstart)
sudo loginctl enable-linger DIN_BRUGER

# 2. Mapper til data, videoer og Let's Encrypt
sudo mkdir -p /var/www/julemandenlive.dk/{public_html,data,media/videos}
sudo chown -R DIN_BRUGER:www-data /var/www/julemandenlive.dk
sudo chmod 2755 /var/www/julemandenlive.dk /var/www/julemandenlive.dk/public_html
sudo chmod 2770 /var/www/julemandenlive.dk/data
sudo chmod 2775 /var/www/julemandenlive.dk/media /var/www/julemandenlive.dk/media/videos
```

### Miljøfil med admin-login

```bash
mkdir -p ~/.config/nordpolen
cp .env.example ~/.config/nordpolen/nordpolen.env
chmod 600 ~/.config/nordpolen/nordpolen.env
./deploy/deploy.sh --build-only      # bygger imaget første gang
podman run --rm -it localhost/nordpolen node dist/server/tools/hash-password.js
nano ~/.config/nordpolen/nordpolen.env   # indsæt ADMIN_PASSWORD_HASH=… (uden anførselstegn)
```

### Byg og start containeren

```bash
mkdir -p ~/.config/containers/systemd
cp deploy/nordpolen.container ~/.config/containers/systemd/
./deploy/deploy.sh                    # bygger image, starter servicen og tjekker /api/health
systemctl --user status nordpolen
```

Siden kører nu på `http://127.0.0.1:3200` (kun lokalt). Du kan se den hjemmefra via en
SSH-tunnel: `ssh -L 3200:127.0.0.1:3200 din-server` og åbne http://localhost:3200.

### Apache og HTTPS (når domænet er købt og peger på serveren)

```bash
# 1. HTTP-vhost (bruges til certifikatet og omdirigering)
sudo cp deploy/apache/julemandenlive.dk.conf /etc/apache2/sites-available/
sudo a2ensite julemandenlive.dk.conf
sudo apache2ctl configtest && sudo systemctl reload apache2

# 2. Certifikat via webroot (certbot ændrer ikke i dine filer)
sudo certbot certonly --webroot -w /var/www/julemandenlive.dk/public_html \
     -d julemandenlive.dk -d www.julemandenlive.dk

# 3. HTTPS-vhost med reverse proxy og sikkerhedsheaders
sudo cp deploy/apache/julemandenlive.dk-le-ssl.conf /etc/apache2/sites-available/
sudo a2ensite julemandenlive.dk-le-ssl.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
```

Apache skal have modulerne `proxy`, `proxy_http`, `headers`, `rewrite` og `ssl` aktiveret
(`sudo a2enmod proxy proxy_http headers rewrite ssl`). Certifikatet fornyes automatisk af certbots
timer via HTTP-vhosten.

> Bruger du et andet domæne, så søg-og-erstat `julemandenlive.dk` i `deploy/apache/*.conf`
> og stierne i `deploy/nordpolen.container`.

---

## Opdatering af siden

```bash
cd ~/juleting
git pull            # eller kopiér de nye filer ind
./deploy/deploy.sh
```

Datafilerne i `/var/www/julemandenlive.dk/data` og videoerne i `media/` bevares altid.

---

## Administration

Gå til `https://julemandenlive.dk/admin` og log ind. Herfra kan du:

| Fane | Hvad |
|---|---|
| Oversigt | Tidsmaskine: se hele siden på et vilkårligt tidspunkt (fx juleaften kl. 19.20) |
| Kameraer | Tilføj/fjern/omdøb kameraer, vælg scene eller video, status, hændelser |
| Videoer | Upload MP4/WebM og plakatbilleder, se og slet filer |
| Flyvninger | Juleaftens lokale ankomsttid, automatiske prøveflyvninger, planlæg egne flyvninger, forhåndsvis juleruten |
| Driftsstatus | Overstyr statusværdier, beskeder med start/slut |
| Begivenheder | Bannere, festdage, flyveforbud, snestorm, kraftigt nordlys |
| Julekalender | Rediger alle 24 låger (type, tekst, gåder, quiz, spil, animation, video) |
| Tekster og sektioner | Velkomsttekster, banner, slå forsidesektioner og funktioner til/fra |
| Avanceret | Rediger alle datafiler som JSON (fx bylisten til juleaften), download backup |

**Sikkerhed:** adgangskoden gemmes kun som scrypt-hash. Login er rate-begrænset (5 forsøg pr. 5 min),
sessionen er en HttpOnly/Secure/SameSite=Strict-cookie (sidens eneste cookie), og alle ændringer
kræver en CSRF-header og korrekt Origin. Alle data valideres på serveren, før de gemmes. Vil du
ekstra sikre administrationen, kan du aktivere IP-begrænsningen i `julemandenlive.dk-le-ssl.conf`.

Øvrig hærdning:
- **Uploads:** kun video- og billedfiler accepteres. Filens indhold tjekkes, ikke kun filtypen, og Apache kan aldrig køre kode (PHP/CGI) fra mediemappen.
- **Headers:** HSTS, en streng CSP uden tredjepartsscripts, `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy` og `noindex` på administrationen. TRACE er slået fra.
- **Container:** kører uden root, med skrivebeskyttet filsystem, uden capabilities, med `no-new-privileges` og et loft på 512 MB RAM. Den lytter kun på 127.0.0.1.
- **Låger og tidsmaskine:** indhold fra fremtidige låger forlader aldrig serveren, og tidsmaskinen virker kun for en indlogget admin.
- **Afhængigheder:** `npm audit` viste 0 sårbarheder, da siden blev sat op. Kør det igen inden hver jul.

---

## Videoer til kameraerne

Kameraerne viser som standard **animerede scener tegnet i kode** (100 % originalt indhold).
Du kan erstatte dem med rigtige videoer uden at røre koden:

1. **Upload** under *Admin → Videoer* (op til 1 GB pr. fil), eller kopiér direkte:
   ```bash
   scp vaerksted.mp4 din-server:/var/www/julemandenlive.dk/media/videos/
   ```
2. Gå til *Admin → Kameraer*, vælg kameraet, sæt **Kilde** til *MP4-video* og vælg filen
   (fx `/media/videos/vaerksted.mp4`). Gem.

**Gode råd til videofiler**

- H.264 MP4, 1280×720 eller 1920×1080, 24–30 fps, uden lyd (videoerne afspilles altid lydløst).
- Lav en problemfri løkke på 30–120 sekunder.
- Tilføj `-movflags +faststart` ved konvertering, så afspilningen starter med det samme:
  ```bash
  ffmpeg -i input.mov -an -c:v libx264 -crf 24 -preset slow -vf scale=1280:-2 -movflags +faststart vaerksted.mp4
  ```
- **HLS** (til lange eller mange videoer): læg en mappe med `.m3u8` og segmenter i
  `media/videos/<navn>/`, og vælg kilden *HLS-stream* med URL'en til `.m3u8`-filen.
- Brug kun materiale, du selv har lavet eller har licens til.

Videoer afspilles kun, når kameraet er synligt på skærmen, og pauses, når fanen er skjult. Mangler
en videofil, eller fejler den, skifter kameraet automatisk til sin reservescene med en lille
«VIDEOSIGNAL MANGLER»-markering.

**Sjove hændelser** (nisse løber forbi, lyset slukkes, gave falder, rensdyr kigger ind, signaltab,
teknisk fejl) tegnes ovenpå både scener og videoer. Antal pr. time og typer vælges pr. kamera.
Med typen *Videoklip* kan du lægge egne korte klip ind, der afspilles som hændelser.

---

## Konfiguration og datafiler

Alle redigerbare data ligger som JSON i `DATA_DIR` (`/var/www/julemandenlive.dk/data`):

| Fil | Indhold |
|---|---|
| `site.json` | Tekster, banner, forsidesektioner, funktioner (sne, nissealarm, skjulte nisser) |
| `cameras.json` | Kameraer: navn, kanal, kilde (scene/mp4/hls), status, hændelser |
| `tracking.json` | Nordpolens position, juleaftens byer og lokale måltid, prøveflyvninger |
| `status.json` | Overstyrede statusværdier og beskeder |
| `events.json` | Særlige begivenheder med tidsrum |
| `calendar.json` | De 24 kalenderlåger |

Filerne kan også redigeres i hånden. Ugyldige filer afvises med en tydelig besked i loggen, og
standardværdierne bruges, indtil filen er rettet. Hver gemning fra admin laver en kopi af den
forrige version (`<navn>.prev.json`).

### Miljøvariabler

| Variabel | Standard | Beskrivelse |
|---|---|---|
| `ADMIN_USER` | `julemanden` | Brugernavn til admin |
| `ADMIN_PASSWORD_HASH` | – | scrypt-hash fra `npm run hash-password`. Uden den er admin slået fra |
| `SESSION_HOURS` | `8` | Hvor længe et login varer |
| `MAX_UPLOAD_MB` | `1024` | Maks. uploadstørrelse |
| `EXTRA_MEDIA_SRC` | – | Ekstra domæner til video i CSP (hvis du streamer fra en CDN) |
| `PORT`, `HOST` | `3200`, `127.0.0.1` | Sættes af containeren |
| `DATA_DIR`, `MEDIA_DIR`, `WEB_DIR` | | Sættes af containeren |
| `TIME_MACHINE_FOR_ALL` | `false` i produktion | Kun til udvikling |

---

## Sådan virker tracking og tid

- Kanens position er en **ren funktion af tid + rutedata** (`src/shared/tracking.ts`). Serveren
  sender flyveplanen, og browseren beregner positionen 30 gange i sekundet. Alle besøgende ser
  kanen samme sted, og intet starter forfra ved genindlæsning.
- Browseren synkroniserer sit ur med serverens, så nedtællinger og låger er korrekte, selv om
  brugerens computer går forkert.
- **Sæsoner:** 1. okt–30. nov forberedelser (prøveflyvninger i weekenderne fra midt november),
  1.–23. dec daglige testflyvninger om eftermiddagen, 24. dec den store juleflyvning,
  25. dec–30. sep «flyvningen er afsluttet».
- **Juleaften:** byerne grupperes efter deres lokale tidszone, og julemanden når hver by omkring
  den valgte lokale tid (standard 19.00, dvs. ca. 18–20). Danmark besøges ca. kl. 19.20–19.35.
- Logbog, driftsstatus, vejr, nissealarmer og kamerahændelser er også deterministiske ud fra
  tiden, så alle oplever det samme samtidig – uden at serveren skal gemme noget.
- Julekalenderens indhold sendes **først fra serveren, når lågen er åben** (dansk tid), så man
  ikke kan kigge i kildekoden efter fremtidige låger.

---

## Test

```bash
npm test             # 65 enhedstests: tidszoner, advent, nedtællinger/årsskifte, låger,
                     # tracking før/under/efter juleaften, server, auth, upload, CSRF, XSS
npm run typecheck
npm run e2e          # 27 browsertjek (kræver kørende server med TIME_MACHINE_FOR_ALL=true;
                     # sæt ADMIN_PASSWORD=… for også at teste admin-login)
npm run screenshots  # screenshots i desktop- og mobilstørrelse
```

Browsertestene bruger Playwright (`npx playwright install chromium`).

---

## Drift, backup og fejlfinding

```bash
systemctl --user status nordpolen          # status
journalctl --user -u nordpolen -f          # live-log
systemctl --user restart nordpolen         # genstart
curl -s http://127.0.0.1:3200/api/health   # helbredstjek
```

**Backup:** tag en kopi af `/var/www/julemandenlive.dk/data` (små JSON-filer) og `media/`. Fx i crontab:

```cron
15 3 * * * tar czf ~/backup/nordpolen-$(date +\%F).tgz -C /var/www/julemandenlive.dk data
```

**Hvis siden viser «opdateres – prøv igen»:** containeren kører ikke. Se loggen med
`journalctl --user -u nordpolen -n 50` og kør `./deploy/deploy.sh`.

**Hvis kortet ikke vises:** kortfliserne hentes fra `tiles.openfreemap.org`. Flydata, nedtællinger
og resten af siden virker stadig, selv hvis kortet midlertidigt ikke kan hentes.

**Ressourcer:** containeren bruger typisk 60–90 MB RAM og næsten ingen CPU, da al animation og
tracking beregnes i browseren.

---

## Nyt år

1. *Admin → Julekalender*: skift lågernes indhold ud (eller behold dem).
2. *Admin → Flyvninger*: planlæg en generalprøve og evt. særlige flyvninger.
3. *Admin → Begivenheder*: opdatér datoer for bannere og festdage.
4. Åbnede låger nulstilles automatisk hos besøgende, fordi de gemmes pr. år.

God jul fra Nordpolen! 🎄

---

## Licens

MIT – se [LICENSE](LICENSE). Kortdata © OpenStreetMap-bidragydere, kortfliser fra OpenFreeMap.
