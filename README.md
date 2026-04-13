# Leseapp

En enkel prototype for å teste hurtiglesing med ett ord av gangen i fast posisjon på skjermen.

## Bakgrunn

Ideen bak prosjektet er å undersøke om det føles nyttig å lese tekst ved at ett ord av gangen vises på samme sted i synsfeltet. Tanken er at øynene da slipper å vandre langs linjene, og at oppmerksomheten heller kan brukes på å registrere selve ordet.

Målet er ikke å anta at dette fungerer best for alle, men å bygge noe konkret som kan testes ærlig i praksis, først på PC og senere på mobil.

## Hva prototypen gjør

Den nåværende versjonen støtter:

- lokale `txt`-filer
- lokale `epub`-filer
- ett ord av gangen i et fast visningsområde
- `1` sekund oppstartsvisning før lesingen starter
- `Start / Pause` med knapp
- hold-for-lesing med mus
- hold-for-lesing med `Space`
- justerbar hastighet i `WPM`
- automatisk kontekstpanel ved pause
- markering av gjeldende ord i kontekstpanelet
- lokal lagring av hastighet, posisjon og innstillinger per fil
- valgfri ekstra tid på lange ord
- offline bruk uten byggesteg

## Hvorfor kontekstpanelet finnes

Et sentralt problem med denne typen lesing er at det er lett å falle av. Derfor viser prototypen automatisk avsnittet rundt siste ord når lesingen stoppes. Målet er at brukeren raskt skal finne tilbake til meningen uten å miste progresjonen.

## Hvordan kjøre

Det er ingen byggesteg i denne versjonen.

Du kan enten:

1. åpne [index.html](./index.html) direkte i nettleseren
2. eller serve mappen lokalt, for eksempel:

```bash
python3 -m http.server 8765
```

Åpne deretter `http://localhost:8765/`.

## Kontroller

- Klikk `Start / Pause` for vanlig start og pause
- Hold inne knappen med musen for å lese bare mens den holdes inne
- Trykk kort `Space` for start/pause
- Hold inne `Space` for å lese bare mens tasten holdes inne
- Juster hastigheten med slideren
- Slipp knapp eller `Space` for å pause og vise kontekstpanelet

## EPUB-støtte

`EPUB` håndteres lokalt i nettleseren. Appen pakker ut boken, finner innholdslisten i pakken, leser kapitlene i spine-rekkefølge og bygger en lesemodell av avsnittene som faktisk inneholder tekst.

Dette er bevisst holdt enkelt i første versjon. Prototypen prøver å få ut lesbar tekst, ikke å bevare full bok-layout, typografi eller alle EPUB-spesialtilfeller.

## Prosjektstruktur

- [index.html](./index.html): struktur og innhold
- [styles.css](./styles.css): visuelt uttrykk
- [app.js](./app.js): UI, kontroller, rytme og lagring
- [reading-model.js](./reading-model.js): bygger ord- og avsnittsmodell
- [epub-loader.js](./epub-loader.js): EPUB-innlasting og tekstuttrekk
- [MVP.md](./MVP.md): tidlig MVP-avklaring
- [eksempel.txt](./eksempel.txt): enkel testfil
- [test-fixtures/minimal.epub](./test-fixtures/minimal.epub): enkel test-EPUB

## Rydding i repoet

Repoet inneholder også:

- [LICENSE](./LICENSE)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
- [.gitignore](./.gitignore)
- [vendor/jszip.min.js](./vendor/jszip.min.js) for lokal EPUB-støtte

## Naturlige neste steg

- teste prototypen på mobil
- forbedre EPUB-håndtering for flere bokvarianter
- finjustere lesealgoritmen videre
- vurdere en rikere pausevisning ved behov
