# A2 Racer II voor Home Assistant OS

Deze add-on serveert de bestaande WebAssembly-port van A2 Racer II via
Home Assistant-ingress. De volledige game werkt: het introfilmpje, het menu,
de races, de uitslagen en de eindscène.

De add-on bevat **geen spelbestanden**. A2 Racer II is eigendom van Davilex;
gebruik je eigen kopie. De engine leest de originele bestanden ongewijzigd.

## Wat je nodig hebt

- Home Assistant OS op een van de architecturen hieronder.
- Een eigen kopie van A2 Racer II (Nederlandse versie, v1.01).
- De map met `RCS.IMG` en `spel.dat`: de geïnstalleerde game, of de
  `data`-map van de cd / het uitgepakte schijfimage.

De spelbestanden worden eenmalig in de browser opgeslagen (IndexedDB). Je
kunt ze op twee manieren aan de add-on geven:

- **Op de server (aanbevolen):** zet ze in `/share/a2racer2`. De add-on
  leest die map read-only en de pagina haalt de bestanden daar bij de eerste
  start op.
- **In de browser:** kies de spelmap met **Choose the game folder…**.

De browser moet genoeg opslagruimte hebben; bij het wissen van
websitegegevens moet je opnieuw laden. Gebruik bij voorkeur een
desktopbrowser: de mapkiezer werkt niet in elke mobiele webview.

## Installeren

1. Maak op GitHub een fork van deze repository, of push de inhoud van deze
   zip naar je eigen repository. De repositoryroot moet `repository.yaml`
   bevatten.
2. Ga in Home Assistant naar **Instellingen → Add-ons → Add-on store**.
3. Open rechtsboven het menu (drie puntjes) en kies **Repositories**.
4. Voeg de URL van jouw fork toe, bijvoorbeeld
   `https://github.com/<jouw-gebruiker>/a2racer2-re`.
5. Installeer **A2 Racer II** en start de add-on.
6. Open de add-on via het paneel in de zijbalk of via **Open web UI**.
7. Kies de map met de spelbestanden, of gebruik de bestanden die je in
   `/share/a2racer2` hebt gezet. Daarna verschijnt **Play**.

De add-on heeft geen configuratie-opties nodig.

## Spelbestanden op de server zetten

De add-on heeft read-only toegang tot `/share`. In de **Samba NAS**-app
heet deze map standaard `share` en zie je hem als SMB-share. Zet de
bestanden in de submap `a2racer2`:

1. Open in de Samba NAS-app de share `share` (of gebruik een
   bestandseditor of SSH).
2. Maak in die share de map `a2racer2` aan.
3. Kopieer de inhoud van de spelmap naar `/share/a2racer2`, zodat
   `RCS.IMG` en `spel.dat` direct in die map staan. Heb je de cd, kopieer
   dan de inhoud van de `data`-map. Een losse submap `data` met daarin de
   bestanden werkt ook.
4. Werk de add-on bij of bouw hem opnieuw, zodat de nieuwe
   share-koppeling actief wordt, en start hem.
5. Open de add-on. Naast **Choose the game folder…** verschijnt **Use the
   game files on the server**. Klik daarop; de bestanden worden eenmalig
   naar de browseropslag gekopieerd.

De share heet in Samba NAS standaard `share`; wijst jouw share naar
dezelfde map, gebruik dan die naam. De add-on schrijft niets naar
`/share`; carrières en instellingen worden in de browser opgeslagen.
Wijzig je later bestanden in `/share/a2racer2`, kies dan eerst **Forget the
game files** en daarna opnieuw de serverknop.

## Spelen

- **Play** start het spel in het huidige venster.
- **Play full screen** vraagt de browser om volledig scherm. In een
  HA-paneel kan de browser dat blokkeren; open de add-on dan in een eigen
  tabblad.
- **Forget the game files** verwijdert de gekopieerde spelbestanden uit de
  browseropslag. Je carrières en instellingen worden daarbij ook gewist.

De eerste keer kopiëren kan even duren. Daarna staan de bestanden in de
browser en start het spel zonder opnieuw kiezen.

## Architecturen

De add-on is opgebouwd uit een architectuuronafhankelijke WASM-bundel en
`nginx:1.29-alpine`. Daardoor werkt dezelfde add-on op:

- `aarch64` (Raspberry Pi 4/5, Home Assistant Yellow/Green, 64-bit ARM)
- `amd64` (x86-64, NUC, VM)
- `armv7` (32-bit ARM, Raspberry Pi 2/3)
- `armhf` (ARMv6, Raspberry Pi 1/Zero)
- `i386` (32-bit x86)

De spelprestaties hangen vooral af van de browser en de CPU van de client,
niet van de architectuur van de Home Assistant-server.

## Opnieuw bouwen

De map `web/` bevat de kant-en-klare Emscripten-build. Na een wijziging aan
de C-broncode bouw je die opnieuw met:

```sh
./a2racer2/build.sh
```

Dat vereist `emcc` (Emscripten/emsdk). Het script bouwt `port/web/out` en
kopieert de uitvoer naar `a2racer2/web/`. Daarna laat je Home Assistant de
add-on opnieuw bouwen (add-on openen en **Rebuild** kiezen, of de add-on
verwijderen en opnieuw installeren).

De webmap wordt bewust meegeleverd: zo hoeft Home Assistant OS tijdens het
bouwen van de add-on geen Emscripten-toolchain te downloaden en werkt de
add-on op alle architecturen.

## Bestanden

| Pad | Functie |
|---|---|
| `config.yaml` | Add-on-definitie, ingress en architecturen |
| `Dockerfile` | Nginx-image met de voorgebouwde webmap |
| `nginx.conf` | Statische server op poort 8099 |
| `web/` | Gegenereerde `a2racer2.html`, `.js` en `.wasm`, plus `server-load.js` |
| `build.sh` | Bouwt `web/` opnieuw uit `port/web` |
| `icon.png`, `logo.png` | Add-on-illustraties in de add-on store |

## Problemen oplossen

- **Het spel blijft zwart of WebGL ontbreekt.** Gebruik een recente Chrome,
  Firefox, Edge of Safari met WebGL ingeschakeld. In een oude webview of met
  hardwareversnelling uit kan de 3D-weergave falen.
- **De mapkiezer ontbreekt.** Gebruik een desktopbrowser; niet elke mobiele
  webview ondersteunt `webkitdirectory`.
- **Het spel is traag.** De WASM-versie draait op de client. Sluit zware
  tabbladen en probeer een andere browser of computer.
- **De add-on start niet.** Bekijk het add-on-logboek in Home Assistant. De
  container heeft geen speciale rechten of poorten nodig; `/share` wordt
  read-only gekoppeld.
- **De serverknop verschijnt niet.** Controleer of
  `/share/a2racer2/RCS.IMG` bestaat, of de add-on na het instellen opnieuw
  is gestart, en of de bestandsnaam precies `RCS.IMG` is. Zonder
  share-koppeling blijft de knop weg; de mapkiezer werkt dan gewoon.
- **Bestanden kwijt.** Browseropslag kan door de browser worden opgeruimd.
  Kies de spelmap opnieuw of gebruik de serverknop; de add-on bewaart zelf
  geen speldata of saves.

## Hulp en bugs

- Engine en onderzoeksproject: <https://github.com/berobloom/a2racer2-re>
- Deze HAOS-verpakking: open een issue in je eigen fork of in de repository
  waar je de add-on vandaan hebt gehaald.

## Licentie en herkomst

De engine en research vallen onder de BOLA-licentie van het oorspronkelijke
project. A2 Racer II, de speldata en de boxart zijn eigendom van hun
rechthebbenden. Deze add-on distribueert geen speldata.
