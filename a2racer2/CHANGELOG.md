# Changelog

## 1.1.0 - 2026-11-06

- Spelbestanden kunnen op de server staan: `/share` wordt read-only
  gekoppeld en nginx serveert `/share/a2racer2` onder `/game/`.
- De pagina toont **Use the game files on the server** zodra daar een
  `RCS.IMG` staat; de mapkiezer blijft als alternatief bestaan.

## 1.0.0 - 2026-11-06

- Eerste Home Assistant OS-add-on rond de bestaande WebAssembly-port.
- Werkt via Home Assistant-ingress op `aarch64`, `amd64`, `armv7`, `armhf`
  en `i386`.
- De volledige game blijft beschikbaar; speldata wordt niet meegeleverd.
- De WASM-bundel is vooraf gebouwd, zodat de add-on geen Emscripten-toolchain
  nodig heeft tijdens het bouwen.
