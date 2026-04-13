# MVP-spesifikasjon for PC-prototype

## Mål

Denne første versjonen skal teste om rask ordvisning fungerer godt nok til at konseptet er verdt å videreutvikle. Prototypen skal være enkel, lokal, offline og fokusert på leseopplevelsen.

## Omfang i første versjon

- Støtte for innlasting av `txt`-filer
- Ett ord av gangen i fast visningsområde
- Lys og minimalistisk visning
- Lokal lagring av progresjon og innstillinger per tekstfil
- Offline bruk i nettleser på PC

## Kjerneopplevelse

- Når en tekst åpnes, skal appen kunne fortsette fra sist leste posisjon for den teksten
- Når brukeren starter lesing, vises første ord alene i `2 sekunder` før normal avspilling begynner
- Under lesing vises ett ord om gangen på samme sted på skjermen
- Lange ord får litt ekstra visningstid
- Setningsslutt (`.`, `!`, `?`) gir en liten ekstra pause
- Avsnittsskifte gir en tydeligere, men fortsatt kort pause

## Styring på PC

Appen skal støtte to måter å styre lesingen på:

### 1. Vanlig toggle-styring

- Klikk på `Start/Pause` for å starte eller pause
- `Space` kan også brukes som tastatursnarvei for start/pause

### 2. Hold-for-lesing

- Hold inne musen på lese-knappen for å spille av så lenge knappen holdes nede
- Slipp museknappen for å pause
- Hold inne `Space` for å spille av
- Slipp `Space` for å pause

For `Space`-styring bør prototypen håndtere tastetrykk slik at vanlig auto-repeat fra tastaturet ikke fører til uønsket start/stopp-flimmer.

## Kontekstvisning

Når brukeren pauser eller slipper i hold-modus, skal appen automatisk vise kontekst under hovedvisningen.

Kontekstvisningen skal:

- vise avsnittet brukeren er i
- markere ordet som sist ble vist i hurtigvisningen
- gjøre det enkelt å finne igjen meningen dersom brukeren falt av

## Hastighet

- Appen skal ha en justerbar hastighetskontroll
- Første versjon kan bruke `WPM` som måleenhet
- Standardhastigheten bør være moderat, slik at prototypen er lett å teste uten forkunnskap

## Lagring

Appen skal lagre følgende lokalt per tekst:

- sist leste ordposisjon
- sist brukte hastighet

Dette gjør at hver fil får sin egen progresjon.

## Bevisste avgrensninger

Følgende er utsatt til senere:

- `epub`-støtte
- `pdf`-støtte
- innliming av tekst
- spoling bakover
- mobilgrensesnitt
- avansert kontroll for tegnsetting og rytme

## Tekniske føringer

- Prototypen bygges som en lokal nettapp
- Den skal fungere uten nettverk etter at siden er åpnet lokalt
- Løsningen skal fungere for både norsk og engelsk tekst

## Neste steg

Etter at første prototype er bygget, bør vi teste spesielt:

- om ett ord av gangen faktisk oppleves nyttig
- om `2` sekunders oppstart føles riktig
- om hold-for-lesing fungerer naturlig med mus og `Space`
- om kontekstpanelet under visningen er tilstrekkelig når man mister tråden
