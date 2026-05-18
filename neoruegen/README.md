# Neoruegen

Ein deutsches Foundry-VTT-System fuer Neoruegen.

## Inhalt

- ein Dokumenttyp: Charakter
- drei Attribute: Koerper, Verstand, Schneid
- 32 Fertigkeiten von 0 bis 4
- deutsche Uebersetzungen als Standard und Fallback

## Build

```bash
npm run release
```

Der Release-Build schreibt die aktuellen Systemdaten nach `build/neoruegen` und erzeugt `system.json` sowie `neoruegen.zip` unter `release/<version>/`.
