# Sådan sætter du siden i luften – trin for trin

Guiden tager cirka 20 minutter på en Linux-server (fx Ubuntu 24.04) med Apache, podman og certbot.
Du skal kun gøre det her én gang.

Overalt i guiden skal du erstatte:

- `DIN_BRUGER` med dit brugernavn på serveren (skriv `whoami` for at se det)
- `din-server` med navnet eller IP-adressen på din server
- `julemandenlive.dk` med dit eget domæne, hvis du bruger et andet. Husk også at rette det i `deploy/`-filerne.
Kopiér én boks ad gangen ind i terminalen, tryk Enter, og vent til den er færdig,
før du går videre.

> **Tip:** Når der står `sudo`, beder serveren om **din** adgangskode til serveren.
> Der vises ingen prikker, mens du skriver – det er helt normalt.

---

## Trin 1 – Log ind på serveren og hent koden

Åbn en terminal på din egen computer og skriv:

```bash
ssh din-server
git clone https://github.com/simonlockdk/julemandenlive.git
cd julemandenlive
```

---

## Trin 2 – Giv siden lov til at køre hele tiden (sudo)

Det her sørger for, at siden starter af sig selv, også efter en genstart af serveren,
og opretter mapperne til data og videoer.

```bash
sudo loginctl enable-linger DIN_BRUGER
sudo mkdir -p /var/www/julemandenlive.dk/{public_html,data,media/videos}
sudo chown -R DIN_BRUGER:www-data /var/www/julemandenlive.dk
sudo chmod 2755 /var/www/julemandenlive.dk /var/www/julemandenlive.dk/public_html
sudo chmod 2770 /var/www/julemandenlive.dk/data
sudo chmod 2775 /var/www/julemandenlive.dk/media /var/www/julemandenlive.dk/media/videos
```

✅ Der kommer ingen besked, når det lykkes. Det er godt.

---

## Trin 3 – Byg siden

```bash
./deploy/deploy.sh --build-only
```

✅ Til sidst står der: `✔ Image bygget`. Det tager et par minutter første gang.

---

## Trin 4 – Vælg dit admin-login

**4a.** Lav filen med indstillinger:

```bash
mkdir -p ~/.config/nordpolen
cp .env.example ~/.config/nordpolen/nordpolen.env
chmod 600 ~/.config/nordpolen/nordpolen.env
```

**4b.** Vælg en adgangskode. Brug mindst 12 tegn, gerne en hel sætning, fx
`Rudolf-spiser-7-gulerødder!`. Skriv den ind to gange, når du bliver spurgt:

```bash
podman run --rm -it localhost/nordpolen node dist/server/tools/hash-password.js
```

Du får en lang linje, der starter med `ADMIN_PASSWORD_HASH=scrypt$...`.
**Kopiér hele linjen.** Selve adgangskoden gemmes ingen steder, kun et "fingeraftryk" af den.

**4c.** Åbn indstillingsfilen:

```bash
nano ~/.config/nordpolen/nordpolen.env
```

- Ret `ADMIN_USER=julemanden` til et brugernavn, kun du kender, fx `ADMIN_USER=chefnisse-42`.
- Erstat linjen `ADMIN_PASSWORD_HASH=` med den linje, du kopierede.
- Gem med **Ctrl+O**, tryk **Enter**, og luk med **Ctrl+X**.

---

## Trin 5 – Start siden

```bash
mkdir -p ~/.config/containers/systemd
cp deploy/nordpolen.container ~/.config/containers/systemd/
./deploy/deploy.sh
```

✅ Til sidst står der: `✔ Nordpolens Kontrolcentral kører.`

Siden kører nu, men kun inde på serveren. I næste trin åbner vi den for internettet.

---

## Trin 6 – Gør siden synlig på julemandenlive.dk (sudo)

Først skal dit domæne pege på serveren: opret en **A-record** for både `julemandenlive.dk` og
`www.julemandenlive.dk` hos din domæneudbyder med serverens IP-adresse. Det kan tage op til en time,
før det virker.

Ret også `ServerAdmin` i de to filer i `deploy/apache/` til din egen e-mail.

**6a.** Aktivér den almindelige adresse (bruges kun til at hente certifikatet):

```bash
sudo cp deploy/apache/julemandenlive.dk.conf /etc/apache2/sites-available/
sudo a2ensite julemandenlive.dk.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
```

✅ Der skal stå `Syntax OK`.

**6b.** Hent certifikatet (gratis fra Let's Encrypt):

```bash
sudo certbot certonly --webroot -w /var/www/julemandenlive.dk/public_html -d julemandenlive.dk -d www.julemandenlive.dk
```

✅ Der skal stå `Successfully received certificate`.

**6c.** Aktivér den sikre HTTPS-adresse:

```bash
sudo cp deploy/apache/julemandenlive.dk-le-ssl.conf /etc/apache2/sites-available/
sudo a2ensite julemandenlive.dk-le-ssl.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
```

✅ Der skal stå `Syntax OK`.

---

## Trin 7 – Prøv siden 🎄

Åbn i din browser:

- **https://julemandenlive.dk**: forsiden med kanen.
- **https://julemandenlive.dk/admin**: log ind med brugernavnet og adgangskoden fra trin 4.

Tjek gerne også siden på din telefon.

---

## Trin 8 (valgfrit, men anbefalet) – Kun din egen internetforbindelse kan se admin

Så kan fremmede slet ikke nå login-siden.

1. Find din IP-adresse hjemme ved at gå ind på https://ifconfig.me fra din egen computer.
2. Åbn filen:
   ```bash
   sudo nano /etc/apache2/sites-available/julemandenlive.dk-le-ssl.conf
   ```
3. Find de tre linjer, der starter med `# <LocationMatch`, `#     Require ip` og
   `# </LocationMatch>`. Fjern `#` foran dem, og skriv din IP i stedet for `DIN.IP.ADRESSE.HER`.
4. Gem (**Ctrl+O**, **Enter**, **Ctrl+X**), og kør:
   ```bash
   sudo apache2ctl configtest && sudo systemctl reload apache2
   ```

> Skifter din IP-adresse hjemme, skal du rette den igen. Ellers kan du ikke komme ind på admin.

---

## Senere: når siden skal opdateres

```bash
ssh din-server
cd julemandenlive
git pull          # henter den nyeste version
./deploy/deploy.sh
```

Dine kameraer, tekster og videoer bevares altid.

## Hvis noget går galt

| Problem | Løsning |
|---|---|
| `✘ Serveren svarer ikke` | Kør `journalctl --user -u nordpolen -n 50`, og se den sidste fejl |
| Siden viser "opdateres – prøv igen" | Containeren kører ikke. Kør `systemctl --user restart nordpolen` |
| Kan ikke logge ind på admin | Tjek brugernavn og hash i `~/.config/nordpolen/nordpolen.env`, og kør så `./deploy/deploy.sh` |
| "For mange forsøg" ved login | Vent 5 minutter. Det er beskyttelsen mod gætteri. |
| Glemt adgangskoden | Gentag trin 4b–4c, og kør `./deploy/deploy.sh` |

Flere detaljer om alt det tekniske står i [README.md](README.md).
