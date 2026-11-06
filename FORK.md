# Deze fork naar GitHub uploaden

Deze zip is een complete kloon van de repository, inclusief de `.git`-map en
de volledige geschiedenis. De bovenste commit voegt de server-laadoptie voor
`/share/a2racer2` toe (add-onversie 1.1.0). GitHub kan een zip niet
rechtstreeks als repository importeren; pak de zip uit en push de map met
Git. Zo blijft de geschiedenis bewaard en is het resultaat een echte fork.

De knop **Upload files** op de GitHub-website accepteert geen zip als
repository. Gebruik Git of GitHub Desktop; een zip kan wel als
release-bestand worden geüpload, maar dat maakt er geen add-on-repository
van.

## Een fork maken

1. Ga naar <https://github.com/berobloom/a2racer2-re> en kies **Fork**.
2. Pak deze zip uit.
3. Open een terminal in de uitgepakte map en wijs de remote naar jouw fork:

   ```sh
   git remote set-url origin https://github.com/<jouw-gebruiker>/a2racer2-re.git
   git push -u origin main
   ```

4. Voeg de URL van jouw fork toe als add-on-repository in Home Assistant:
   `https://github.com/<jouw-gebruiker>/a2racer2-re`.

## Een nieuwe repository gebruiken

1. Maak op GitHub een lege repository zonder README, licentie of `.gitignore`.
2. Pak deze zip uit en push de bestaande geschiedenis:

   ```sh
   git remote set-url origin https://github.com/<jouw-gebruiker>/<repository>.git
   git push -u origin main
   ```

3. Gebruik de URL van die repository in Home Assistant.

## Controleren

```sh
git log --oneline -3
git status
```

De bovenste commit moet de server-laadoptie voor `/share/a2racer2` bevatten.
`git status` hoort schoon te zijn. De add-on zelf staat in `a2racer2/`; de
repositoryroot bevat `repository.yaml`, zoals Home Assistant verwacht.
