# A2 Racer II

Home Assistant OS-add-on rond de bestaande WebAssembly-port van **A2 Racer II**.
De volledige game werkt in de browser: het introfilmpje, het menu, de races,
de uitslagen en de eindscène.

- **Geen speldata meegeleverd.** Je hebt je eigen kopie van A2 Racer II nodig.
- **Speldata via Samba NAS:** leg je eigen bestanden in `/share/a2racer2`;
  de add-on leest ze read-only.
- **Werkt op alle gangbare HAOS-architecturen:** `aarch64`, `amd64`, `armv7`,
  `armhf` en `i386`.
- **Geen noVNC of software-OpenGL.** De add-on serveert de WASM-build via
  Home Assistant-ingress.

Installatie, gebruik en het opnieuw bouwen van de webmap staan in
[DOCS.md](DOCS.md).
