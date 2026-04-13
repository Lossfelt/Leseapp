# Leseapp

En enkel prototype for å teste hurtiglesing med ett ord av gangen i fast posisjon på skjermen.

## Bakgrunn

Prosjektet startet som et forsøk på å teste en idé fra speed reading: hvis teksten vises som ett ord av gangen på samme sted, slipper øynene å vandre langs linjene, og hjernen kan i stedet fokusere på å registrere ordene raskt.

Målet er ikke først og fremst å bevise at dette fungerer generelt, men å bygge en prototype som kan testes i praksis og gi et ærlig svar på om leseopplevelsen faktisk er nyttig.

## Mål

Første mål er å lage en PC-basert prototype som:

- laster inn `txt`-filer
- viser ett ord av gangen i et fast visningsområde
- lar brukeren starte, pause og holde inne for å lese
- lar brukeren justere lesehastighet
- viser kontekst i vanlig tekstformat når brukeren stopper
- husker progresjon per tekstfil
- fungerer offline

Det langsiktige målet er en mobilapp med tilsvarende leseopplevelse.

## Status

Dette repoet inneholder en fungerende første prototype bygget som en lokal nettapp.

Den støtter:

- åpning av lokale `txt`-filer
- hurtigvisning av ett ord av gangen
- `1` sekund oppstartsvisning før lesing begynner
- `Start / Pause` med knapp
- hold-for-lesing med mus
- hold-for-lesing med `Space`
- justerbar hastighet i `WPM`
- kontekstpanel som viser avsnittet rundt siste ord
- markering av nåværende ord i kontekstpanelet
- lokal lagring av hastighet, posisjon og innstillinger per fil
- valgfri ekstra tid på lange ord

## Hvordan kjøre

Det er ingen byggesteg i denne versjonen.

Åpne [index.html](./index.html) direkte i nettleseren, eller kjør en enkel lokal server:

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

## Hvorfor kontekstpanelet finnes

Et av hovedproblemene med denne typen lesing er at det er lett å falle av. Derfor viser prototypen automatisk avsnittet rundt siste ord når lesingen stoppes. Tanken er at brukeren raskt skal kunne finne tilbake til meningen uten å miste progresjonen.

## Avgrensninger akkurat nå

Denne versjonen støtter foreløpig bare:

- `txt`
- PC / nettleser
- ett ord av gangen

Følgende er naturlige neste steg:

- `epub`-støtte
- bedre finjustering av lesealgoritmen
- rikere pausevisning
- mobiltilpasset interaksjon

## Filer

- [index.html](./index.html): struktur og innhold
- [styles.css](./styles.css): visuelt uttrykk
- [app.js](./app.js): lesealgoritme, kontroller og lagring
- [MVP.md](./MVP.md): avklart MVP-spesifikasjon
- [eksempel.txt](./eksempel.txt): enkel testfil
