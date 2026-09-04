# Formatos de las Ligas — EAFC27 Career Mode Online

> Documento de referencia para implementar el funcionamiento competitivo (ascensos, descensos, playoffs y clasificación a copas continentales) de las 50 ligas incluidas en `League.json`.
>
> **Importante sobre las fuentes:** el `League.json` original solo contiene metadatos de cada liga (nombre, país, continente, colores, imagen) — los campos `championsSlots`, `europaSlots`, `conferenceSlots` y `relegationSlots` están vacíos (a `0`) en las 50 entradas. Este documento rellena esa información con el funcionamiento **real** de cada competición a fecha de la temporada 2026/27 (Europa) y 2026 (Sudamérica/Norteamérica), para que sirva de base al implementar la lógica del modo carrera.
>
> Los cupos europeos (Champions/Europa/Conference League) se recalculan **cada temporada** según el coeficiente UEFA del país, por lo que las posiciones exactas indicadas aquí son las vigentes para el ciclo 2024-27, pero deben revisarse contra la *Access List* oficial de la UEFA en cada actualización del juego.
>
> Por indicación del encargo, **no se describen los descensos de ninguna liga que no tenga en este mismo `League.json` una división directamente inferior de su país** (por ejemplo, Argentina, Brasil, Chile, Colombia, Países Bajos, Portugal, Bélgica, etc. no tienen su 2ª división listada, así que no se detalla a dónde ni cómo descienden).

---

## 0. Leyenda de colores por zona de tabla

Código de color sugerido para pintar cada fila de la clasificación según lo que esa posición significa. Es el mismo esquema para todas las ligas (ajustando qué zonas aplican en cada caso).

| Zona | Significado | Color | Hex |
|---|---|---|---|
| 🥇 Campeón | Gana el título de liga | Dorado | `#FFD700` |
| 🔵 Champions League — directo | Entra directo a la fase de liga de la UCL | Azul oscuro | `#0B3D91` |
| 🔷 Champions League — clasificación | Debe superar rondas previas / playoff de la UCL | Azul claro | `#4FA8FF` |
| 🟠 Europa League — directo | Entra directo a la fase de liga de la UEL | Naranja | `#FF7A00` |
| 🟧 Europa League — clasificación | Debe superar rondas previas de la UEL | Naranja claro | `#FFB366` |
| 🟢 Conference League — directo | Entra directo a la fase de liga de la UECL | Verde | `#2E9E44` |
| 🟩 Conference League — clasificación | Debe superar rondas previas de la UECL | Verde claro | `#8FD19E` |
| ⚪ Zona media | Sin objetivo europeo ni riesgo de descenso | Gris muy claro / sin color | `#F2F2F2` |
| 🟣 Playoff de ascenso | Disputa el ascenso en eliminatorias | Púrpura | `#8E44AD` |
| 🟩🔼 Ascenso directo | Asciende automáticamente | Turquesa | `#17A398` |
| 🟡 Playoff de descenso / promoción | Disputa la permanencia en eliminatorias | Ámbar | `#F2A900` |
| 🔴 Descenso directo | Desciende automáticamente | Rojo | `#D32F2F` |

Para Sudamérica se reutiliza el mismo código sustituyendo Champions League → **Copa Libertadores** y Europa League → **Copa Sudamericana** (Conmebol no tiene un tercer torneo equivalente a la Conference League).

---

## 1. Cómo funcionan las plazas europeas (UEFA): Champions, Europa y Conference League

Desde la reforma de 2024, las tres competiciones UEFA usan un **formato de liga única (Swiss)** antes de los cruces eliminatorios:

- **Champions League:** 36 equipos, fase de liga a 8 partidos (4 en casa/4 fuera), clasifican directos a octavos los puestos 1-8, disputan un playoff los puestos 9-24, quedan eliminados 25-36.
- **Europa League:** 36 equipos, fase de liga a 8 partidos, mismo esquema de playoff (9-24) y eliminación (25-36).
- **Conference League:** 36 equipos, fase de liga a 6 partidos, mismo esquema.

**¿Cuántos equipos manda cada país?** Depende del *coeficiente UEFA de asociación* (resultados de los clubes del país en las 5 temporadas anteriores). Para el ciclo 2024-27, la plantilla de reparto de la Champions League es:

| Ranking del país | Cupos de Champions League |
|---|---|
| Puestos 1 a 5 | 4 equipos |
| Puesto 6 | 3 equipos |
| Puestos 7 a 15 | 2 equipos |
| Puestos 16 a 55 | 1 equipo |

Las ligas mejor rankeadas meten más equipos **directos a la fase de liga** (sin pasar por rondas previas); las peor rankeadas solo clasifican a su campeón, y este debe superar hasta 3-4 eliminatorias previas (empezando en la 1ª o 2ª ronda de clasificación según el año) para llegar a la fase de liga. Los eliminados en las rondas previas de Champions "caen" a Europa League, y los eliminados de Europa League "caen" a Conference League.

A continuación se agrupan las ligas del `League.json` según su bloque actual (los bloques cambian de país cada temporada; lo indicado es la posición aproximada vigente para 2026/27):

### Bloque A — Top 5 (4 plazas de Champions League): Inglaterra, España, Italia, Alemania, Portugal
- **1º-4º de liga → Champions League, fase de liga directa.**
- **5º → Europa League**, normalmente directo a la fase de liga o a una ronda de clasificación muy avanzada.
- **6º (o el ganador de la copa nacional si no está ya clasificado) → Conference League.**
- Si el campeón de la Champions o de la Europa League de la temporada anterior es de este país y ya clasificó por liga, su plaza extra ("performance spot") sube a otro clasificado nacional.

### Bloque B — Rango 6 (3 plazas de Champions League): Francia
- **1º-3º → Champions League, fase de liga directa.**
- **4º (o el ganador de la Copa de Francia) → Europa League.**
- **5º → Conference League.**

### Bloque C — Rango ~7-16 (2 plazas de Champions League): Países Bajos, Bélgica, Turquía, Austria, Suiza, República Checa, Dinamarca, Grecia, Noruega, Suecia
- **Campeón → Champions League**, entrando en una ronda de clasificación avanzada (normalmente 3ª previa o playoff).
- **Subcampeón → Champions League**, pero entra mucho antes (1ª o 2ª ronda previa) y debe ganar 2-3 eliminatorias para llegar a la fase de liga.
- **3º → Europa League**, ronda de clasificación.
- **4º (o el campeón de copa nacional) → Conference League**, ronda de clasificación.

### Bloque D — Resto de ligas del json (1 plaza de Champions League): Escocia, Polonia, Croacia, Ucrania, Chipre, Bulgaria, Hungría, Rumanía, Irlanda, Finlandia, Azerbaiyán
- **Campeón → Champions League**, entrando en 1ª o 2ª ronda de clasificación (debe ganar 3-4 eliminatorias seguidas para llegar a la fase de liga; lo habitual es que no lo consiga y caiga transferido a Europa League o Conference League).
- **Subcampeón → Europa League**, ronda de clasificación temprana.
- **3º (o el campeón de la copa nacional) → Conference League**, ronda de clasificación temprana.

> Nota de implementación: si se quiere máxima fidelidad, el juego debería guardar el ranking de coeficiente de cada país como variable anual y recalcular los bloques A-D cada temporada (así una liga puede "subir" de bloque D a C si sus equipos rinden bien en Europa varios años seguidos).

---

## 2. Ligas con pirámide completa en el JSON

Solo 5 países tienen más de una división en `League.json`. Son las únicas para las que se detalla el ascenso/descenso interno.

### 🏴 Inglaterra — Premier League / EFL Championship / EFL League One / EFL League Two

| División | Equipos | Ascienden directos | Playoff de ascenso | Descienden directos |
|---|---|---|---|---|
| **Premier League** (Bloque A Champions) | 20 | — | — | Últimos 3 (18º-20º) → Championship |
| **EFL Championship** | 24 | 1º y 2º → Premier League | 3º-6º juegan playoff (semifinales y final) por la 3ª plaza | Últimos 3 (22º-24º) → League One |
| **EFL League One** | 24 | 1º y 2º → Championship | 3º-6º juegan playoff por la 3ª plaza | Últimos 4 (21º-24º) → League Two |
| **EFL League Two** | 24 | 1º, 2º y 3º → League One | 4º-7º juegan playoff por la 4ª plaza | *(desciende a la National League, no incluida en este json — no se detalla)* |

**Plazas europeas (Premier League, Bloque A):**
- 1º-4º → Champions League directa.
- 5º → Europa League.
- 6º (o campeón de la FA Cup si no está ya clasificado) → Conference League.

**Campeón:** el 1º clasificado de la Premier League tras las 38 jornadas (liga regular, sin playoffs).

---

### 🇩🇪 Alemania — Bundesliga / Bundesliga 2 / 3. Liga

| División | Equipos | Ascienden directos | Playoff | Descienden directos |
|---|---|---|---|---|
| **Bundesliga** (Bloque A Champions) | 18 | — | 16º disputa la "Relegation" (ida y vuelta) contra el 3º de la Bundesliga 2 | 17º y 18º → Bundesliga 2 |
| **Bundesliga 2** | 18 | 1º y 2º → Bundesliga | 16º disputa la "Relegation" contra el 3º de la 3. Liga; el 3º de la Bundesliga 2 disputa la "Relegation" contra el 16º de la Bundesliga | 17º y 18º → 3. Liga |
| **3. Liga** | 20 | 1º y 2º → Bundesliga 2 | El 3º disputa la "Relegation" contra el 16º de la Bundesliga 2 | *(desciende a la Regionalliga, no incluida en este json — no se detalla)* |

**Plazas europeas (Bundesliga, Bloque A):**
- 1º-4º → Champions League directa.
- 5º → Europa League.
- 6º → Conference League (si el campeón de la DFB-Pokal ya está clasificado a Europa por otra vía, esta plaza baja al siguiente mejor clasificado de liga).

**Campeón:** 1º tras las 34 jornadas de liga regular.

---

### 🇪🇸 España — LALIGA EA SPORTS / LALIGA HYPERMOTION

| División | Equipos | Ascienden directos | Playoff de ascenso | Descienden directos |
|---|---|---|---|---|
| **LALIGA EA SPORTS** (Bloque A Champions) | 20 | — | — | Últimos 3 (18º-20º) → LALIGA HYPERMOTION |
| **LALIGA HYPERMOTION** | 22 | 1º y 2º → LALIGA EA SPORTS | 3º-6º disputan playoff (semifinales y final a ida y vuelta) por la 3ª plaza de ascenso | Últimos 4 (19º-22º) → *(3ª división, no incluida en este json)* |

**Plazas europeas (LALIGA EA SPORTS, Bloque A):**
- 1º-4º → Champions League directa.
- 5º → Europa League.
- 6º (o campeón de la Copa del Rey si ya está clasificado, baja al siguiente) → Conference League.

**Campeón:** 1º tras las 38 jornadas de liga regular. **No hay playoff de descenso** en Primera: los 3 últimos bajan de forma directa.

---

### 🇮🇹 Italia — Serie A Enilive / Serie BKT

| División | Equipos | Ascienden directos | Playoff de ascenso | Descienden directos |
|---|---|---|---|---|
| **Serie A Enilive** (Bloque A Champions) | 20 | — | — | Últimos 3 (18º-20º) → Serie BKT |
| **Serie BKT** | 20 | 1º y 2º → Serie A | 3º-8º disputan playoff (cuartos, semis y final; el 3º y 4º arrancan con ventaja) por la 3ª plaza | Últimos → *(Serie C, no incluida en este json)* |

**Plazas europeas (Serie A, Bloque A):**
- 1º-4º → Champions League directa.
- 5º → Europa League.
- 6º (o campeón de la Coppa Italia) → Conference League.

**Campeón:** 1º tras las 38 jornadas de liga regular. Desde 2018 no existe *playout* de descenso en Serie A: los 3 últimos bajan directos.

---

### 🇫🇷 Francia — Ligue 1 McDonald's / Ligue 2 BKT

| División | Equipos | Ascienden directos | Playoff de ascenso | Descienden directos |
|---|---|---|---|---|
| **Ligue 1 McDonald's** (Bloque B Champions) | 18 | — | — | Últimos 2 (17º-18º) → Ligue 2 |
| **Ligue 2 BKT** | 18 | 1º y 2º → Ligue 1 | 3º-5º disputan playoff por la 3ª plaza de ascenso | Últimos → *(National, no incluida en este json)* |

**Plazas europeas (Ligue 1, Bloque B):**
- 1º-3º → Champions League directa.
- 4º (o campeón de la Copa de Francia) → Europa League.
- 5º → Conference League. Si hay solape entre copa y liga, la plaza baja al siguiente mejor clasificado.

**Campeón:** 1º tras las 34 jornadas de liga regular.

---

## 3. Resto de primeras divisiones europeas de una sola liga en el JSON

Ninguna de estas ligas tiene su 2ª división en `League.json`, así que **no se detalla el descenso** (solo formato de liga, campeón y plazas europeas según el bloque de la sección 1).

| Liga | País | Formato de liga | Campeón | Bloque UEFA / plazas |
|---|---|---|---|---|
| Eredivisie | Países Bajos | Todos contra todos, ida y vuelta (34 jornadas) | 1º clasificado | Bloque C — Campeón: Champions League (clasificación); Subcampeón: Champions League (clasificación temprana); 3º: Europa League; 4º-8º disputan un playoff propio por una plaza extra de Conference League |
| 1A Pro League | Bélgica | Fase regular (todos contra todos) y luego **Play-offs**: los 6 mejores disputan el "Champions' Play-off" (puntos se dividen a la mitad y se suman los de la fase regular) para coronar al campeón; equipos 7º-16º disputan Play-offs de Europa y de descenso | Ganador del Champions' Play-off | Bloque C |
| Trendyol Süper Lig | Turquía | Todos contra todos, ida y vuelta | 1º clasificado | Bloque C |
| Ö. Bundesliga | Austria | Fase regular (todos contra todos, doble vuelta) y luego división en **Grupo de Campeón** (6 mejores) y **Grupo de Clasificación** (6 restantes), cada uno con una segunda vuelta adicional sumando puntos | 1º del Grupo de Campeón | Bloque C |
| Brack Super League | Suiza | Todos contra todos, triple vuelta (36 jornadas) | 1º clasificado | Bloque C |
| Česká Liga | República Checa | Fase regular y luego división en grupo de título (top 6) y grupo de descenso | 1º del grupo de título | Bloque C |
| 3F Superliga | Dinamarca | Fase regular y luego "Championship round" (top 6) y "Relegation round" (6 restantes) | 1º del Championship round | Bloque C |
| Hellas Liga | Grecia | Fase regular (doble vuelta) y luego playoffs de campeón entre los mejores clasificados | 1º tras los playoffs | Bloque C |
| Eliteserien | Noruega | Todos contra todos, doble vuelta | 1º clasificado | Bloque C |
| Allsvenskan | Suecia | Todos contra todos, doble vuelta (calendario de primavera a otoño) | 1º clasificado | Bloque C |
| Liga Portugal | Portugal | Todos contra todos, doble vuelta | 1º clasificado | Bloque A |
| Scottish Prem | Escocia | Triple vuelta + una cuarta ronda de partidos tras dividir la tabla en top 6 / bottom 6 | 1º clasificado | Bloque D |
| PKO Bank Polski Ekstraklasa | Polonia | Fase regular y luego división en grupo de campeón (top 8) y grupo de descenso | 1º del grupo de campeón | Bloque D |
| Liga Hrvatska | Croacia | Todos contra todos, doble o triple vuelta | 1º clasificado | Bloque D |
| Ukrayina Liha | Ucrania | Todos contra todos, doble vuelta (con condicionantes por la situación bélica) | 1º clasificado | Bloque D |
| Liga Cyprus | Chipre | Fase regular y luego play-offs de título entre los mejores clasificados | 1º tras los playoffs | Bloque D |
| Liga Bulgaria | Bulgaria | Fase regular y luego grupo de campeón / grupo de descenso | 1º del grupo de campeón | Bloque D |
| Magyar Liga | Hungría | Todos contra todos, doble vuelta | 1º clasificado | Bloque D |
| SUPERLIGA | Rumanía | Fase regular y luego grupo de campeón (top 6) / grupo de descenso | 1º del grupo de campeón | Bloque D |
| SSE Airtricity PD | Irlanda | Todos contra todos, triple vuelta | 1º clasificado | Bloque D |
| Finnliiga | Finlandia | Todos contra todos, doble vuelta y luego playoffs de campeón entre los mejores | 1º tras los playoffs | Bloque D |
| Liga Azerbaijan | Azerbaiyán | Fase regular y luego grupo de campeón / grupo de descenso | 1º del grupo de campeón | Bloque D |

---

## 4. Ligas femeninas (sin plazas de Champions/Europa/Conference League masculinas)

| Liga | País | Formato |
|---|---|---|
| Norge Kvinner Liga (Toppserien) | Noruega | Todos contra todos, doble vuelta. Campeón: 1º clasificado. No participa en las competiciones UEFA masculinas (CL/EL/ECL); su acceso continental es a la UEFA Women's Champions League, fuera del alcance de este json |
| Ísland Kvennadeild (Besta deild kvenna) | Islandia | Todos contra todos, doble vuelta. Campeón: 1º clasificado. Mismo caso: acceso a la UEFA Women's Champions League, no cubierto por los campos de este json |

---

## 5. Sudamérica: Brasil, Chile y Colombia

Las plazas continentales sudamericanas se reparten por **país**, no por posición fija de liga, y varían liga a liga. A continuación el reparto vigente para la Copa Libertadores 2026 y la Copa Sudamericana 2026 (Conmebol).

### 🇧🇷 Brasil — Liga do Brasil (Brasileirão Série A)
- **Formato:** todos contra todos, ida y vuelta (38 jornadas), sin playoffs. Campeón = 1º clasificado.
- **Copa Libertadores (7 cupos):** el campeón vigente de la Libertadores, el campeón de la Copa de Brasil (torneo de copa, no incluido en este json) y los mejores clasificados de la liga (normalmente del 2º al 6º-7º puesto) hasta completar los 7 cupos; si hay solapes, el cupo baja al siguiente mejor clasificado.
- **Copa Sudamericana (6 cupos):** los siguientes mejores clasificados de la liga que no lograron plaza en la Libertadores (aproximadamente del 7º al 12º puesto, más el finalista de la Copa de Brasil si no está ya clasificado).

### 🇨🇱 Chile — Liga Chile (Liga de Primera)
- **Formato:** todos contra todos, doble vuelta, sin playoffs. Campeón = 1º clasificado.
- **Copa Libertadores (4 cupos):** 1º, 2º y 3º de la liga, más el campeón de la Copa Chile (torneo de copa, no incluido en este json).
- **Copa Sudamericana (4 cupos):** del 4º al 7º puesto de la liga (los mejores clasificados que no accedieron a Libertadores).

### 🇨🇴 Colombia — Liga Colombia (Liga BetPlay)
- **Formato:** se disputan dos torneos cortos, **Apertura** y **Finalización**, cada uno con fase de todos contra todos seguida de "cuadrangulares"/playoffs para definir al campeón semestral. Además existe una **tabla de reclasificación** (acumulada de ambos torneos) que reparte los cupos restantes a copas internacionales.
- **Copa Libertadores (4 cupos):** campeón del Apertura, campeón del Finalización, y los 2 mejores de la tabla de reclasificación que no estén ya clasificados.
- **Copa Sudamericana (4 cupos):** campeón de la Copa Colombia (no incluida en este json) y los siguientes 3 mejores de la tabla de reclasificación.

---

## 6. Argentina — Liga Profesional de Fútbol (formato detallado)

Argentina tiene, con diferencia, el formato más complejo de todas las ligas de este listado. **No se describe el descenso** (Argentina no tiene una 2ª división en este json), pero sí todo lo demás en profundidad, tal y como pidió el encargo.

### 6.1 Estructura general de la temporada
- Se disputan **dos torneos cortos e independientes**: el **Torneo Apertura** (primer semestre) y el **Torneo Clausura** (segundo semestre). Cada uno corona a su propio campeón, con trofeo, tabla y dinámica propios.
- Los **30 clubes** de Primera División se dividen en **dos zonas de 15 equipos** (Zona A y Zona B) en cada torneo, mediante sorteo.
- **Fase regular (16 fechas) por torneo:**
  - 14 fechas todos contra todos dentro de la propia zona.
  - 1 fecha interzonal fija: el "clásico" de cada equipo (rival tradicional de la otra zona).
  - 1 fecha interzonal adicional, definida por sorteo, contra otro equipo de la zona rival.
- **Playoffs (por torneo):** los **8 mejores de cada zona** (16 equipos en total) avanzan a una fase eliminatoria — octavos, cuartos, semifinales y final — a partido único, que define al campeón de ese semestre.

### 6.2 Tabla Anual y "Campeón de Liga"
- La **Tabla Anual** es la suma de los puntos obtenidos por cada equipo en la **fase regular** (las 16 fechas) de ambos torneos — **no se cuentan los puntos de los playoffs**.
- El equipo que termina 1º en la Tabla Anual es reconocido como **"Campeón de Liga"**, un título honorífico creado por la AFA que **no otorga por sí solo ninguna plaza internacional**: las copas siguen repartiéndose por los torneos cortos y por la propia Tabla Anual como clasificación (ver 6.3), no por este título en particular.

### 6.3 Clasificación a copas internacionales
- **Copa Libertadores (6 cupos base, puede haber 1 extra):**
  - Campeón del Torneo Apertura.
  - Campeón del Torneo Clausura.
  - Campeón de la Copa Argentina (torneo de copa, no incluido en este json).
  - Los mejores clasificados de la **Tabla Anual** que no estén ya clasificados por alguna de las vías anteriores, hasta completar los 6 cupos (habitualmente aportan 3 plazas).
  - **Cupo extra:** si un club argentino gana la Copa Sudamericana de la temporada anterior, Argentina suma un 7º cupo a la Libertadores.
- **Copa Sudamericana (6 cupos):** los siguientes mejores clasificados de la **Tabla Anual** que no lograron plaza en la Libertadores, junto con el subcampeón de la Copa Argentina si no está ya clasificado.

### 6.4 Otros títulos del calendario (no otorgan cupos)
- **Trofeo de Campeones:** enfrenta al campeón del Apertura contra el campeón del Clausura.
- **Supercopa Argentina:** enfrenta al ganador del Trofeo de Campeones contra el campeón de la Copa Argentina.

### 6.5 Colores sugeridos para la tabla de cada zona (Apertura/Clausura)

| Posición en la zona (de 15) | Situación | Color |
|---|---|---|
| 1º-8º | Clasifica a los playoffs del torneo | 🔵 Azul claro `#4FA8FF` |
| 9º-15º | Queda eliminado del semestre (sigue sumando en Tabla Anual) | ⚪ Gris `#F2F2F2` |

### 6.6 Colores sugeridos para la Tabla Anual

| Posición en la Tabla Anual | Situación | Color |
|---|---|---|
| 1º | "Campeón de Liga" (honorífico) | 🥇 Dorado `#FFD700` |
| Posiciones que completan los cupos de Libertadores no cubiertos por Apertura/Clausura/Copa Argentina (normalmente 3) | Copa Libertadores vía Tabla Anual | 🔵 Azul oscuro `#0B3D91` |
| Siguientes 6 posiciones no clasificadas aún | Copa Sudamericana vía Tabla Anual | 🟠 Naranja `#FF7A00` |

---

## 7. Norteamérica: México y Estados Unidos

### 🇲🇽 México — Liga BBVA MX
- **18 equipos**, dos torneos cortos por año (**Apertura** y **Clausura**).
- **Fase regular:** 17 jornadas, todos contra todos a un solo partido.
- **Liguilla (playoffs):** los **8 mejores** de la fase regular clasifican directo a cuartos de final (1º vs 8º, 2º vs 7º, 3º vs 6º, 4º vs 5º); cuartos, semifinal y final se juegan a ida y vuelta. *(En algunas ediciones recientes se usó un "Play-In" entre los puestos 7º-10º para definir los últimos clasificados a la Liguilla; a partir de la temporada 2026-27 vuelve el formato tradicional sin Play-In).*
- **Ascenso/descenso:** **no existe.** Desde 2020 la Liga MX suspendió el ascenso y descenso con la Liga de Expansión MX, y desde el reglamento 2026-27 esto queda fijado de forma permanente (los últimos de la tabla de cocientes pagan una multa económica en lugar de descender).
- **Campeón:** ganador de la final de la Liguilla de cada torneo (Apertura y Clausura reparten un título cada uno).

### 🇺🇸 Estados Unidos — Major League Soccer (MLS)
- **30 equipos** divididos en **Conferencia Este** y **Conferencia Oeste**, 34 jornadas de temporada regular.
- **Supporters' Shield:** se le otorga al equipo con más puntos de toda la liga en temporada regular (las dos conferencias combinadas) — es un título distinto al de campeón de liga.
- **Playoffs (MLS Cup):** clasifican los **9 mejores de cada conferencia** (18 equipos en total). Los sembrados 8º y 9º de cada conferencia disputan una ronda de **Wild Card** a partido único; el ganador se une a los 7 primeros en la **Primera Ronda**, que se juega al mejor de 3 partidos. Siguen semifinal y final de conferencia (partido único) hasta llegar a la **MLS Cup** (final única), que define al campeón de liga.
- **Ascenso/descenso:** no existe en la MLS.

---

## 8. Asia

Ninguna de estas ligas tiene una división inferior en el json, así que no se detalla descenso. El encargo no pidió el detalle de las plazas de AFC Champions League Elite/Two, así que se deja solo el formato de campeonato.

| Liga | País | Formato | Campeón |
|---|---|---|---|
| CSL | China | Todos contra todos, doble vuelta | 1º clasificado |
| Thailand League | Tailandia | Todos contra todos, doble vuelta | 1º clasificado |
| ISL | India | Fase regular (todos contra todos) + playoffs entre los 6 mejores (semifinales y final) | Ganador de los playoffs (distinto del "ISL Shield", que premia al 1º de la fase regular) |
| United Emirates League | Emiratos Árabes Unidos | Todos contra todos, doble vuelta | 1º clasificado |
| K League 1 | Corea del Sur | Fase regular (todos contra todos, doble vuelta) y luego división en grupo de campeón (top 6) y grupo de descenso (6 restantes), sumando los puntos de ambas fases | 1º del grupo de campeón |
| ROSHN Saudi League | Arabia Saudí | Todos contra todos, doble vuelta | 1º clasificado |

---

## 9. Oceanía

| Liga | País | Formato | Campeón |
|---|---|---|---|
| Isuzu UTE A League | Australia | Fase regular (todos contra todos) y luego **Finals Series** entre los 6 mejores (eliminatorias hasta la Gran Final) | Ganador de la Gran Final ("Champions"), distinto del "Premiers" (1º de la fase regular) |

---

## 10. Resumen rápido — qué liga pertenece a qué bloque UEFA

| Bloque | Cupos CL | Ligas del json |
|---|---|---|
| A | 4 | Premier League, LALIGA EA SPORTS, Serie A Enilive, Bundesliga, Liga Portugal |
| B | 3 | Ligue 1 McDonald's |
| C | 2 | Eredivisie, 1A Pro League, Trendyol Süper Lig, Ö. Bundesliga, Brack Super League, Česká Liga, 3F Superliga, Hellas Liga, Eliteserien, Allsvenskan |
| D | 1 | Scottish Prem, PKO Bank Polski Ekstraklasa, Liga Hrvatska, Ukrayina Liha, Liga Cyprus, Liga Bulgaria, Magyar Liga, SUPERLIGA, SSE Airtricity PD, Finnliiga, Liga Azerbaijan |
| — (sin CL/EL/ECL masculina) | — | Norge Kvinner Liga, Ísland Kvennadeild |
| — (fuera de UEFA) | — | CSL, Liga BBVA MX, Thailand League, ISL, United Emirates League, Liga do Brasil, Liga Chile, Liga Azerbaijan*, Liga Colombia, Liga Profesional de Fútbol (Argentina), Isuzu UTE A League, Eliteserien*, K League 1, SUPERLIGA*, ROSHN Saudi League, Major League Soccer |

*(Azerbaiyán, Noruega y Rumanía aparecen también arriba porque sí compiten en UEFA — se listan una sola vez en la tabla de bloques; esta última fila solo agrupa las ligas fuera de la órbita UEFA por continente).*

---

## 11. Notas metodológicas

1. Los cupos UEFA (bloques A-D) están calculados sobre el coeficiente de país vigente para el ciclo 2024-27 y **cambian cada temporada**; al implementar esto en el juego, lo ideal es guardar el bloque de cada liga como un valor que se recalcule automáticamente en vez de un valor fijo.
2. Los cupos de Copa Libertadores/Sudamericana están tomados del reparto confirmado para la edición 2026 y también pueden variar de un año a otro según los criterios de cada federación (Conmebol no usa coeficiente de país como la UEFA; cada federación nacional define su propio sistema de clasificación interna).
3. Donde una liga reparte títulos mediante "grupo de campeón / grupo de descenso" o "play-offs" tras la fase regular (Bélgica, Austria, Dinamarca, República Checa, Polonia, Rumanía, Bulgaria, Azerbaiyán, Corea del Sur, etc.), se ha indicado el mecanismo general; el número exacto de equipos en cada grupo puede variar ligeramente si la federación cambia el número total de clubes de la liga.
4. Ninguna liga de una sola división en este json tiene detalle de descenso, tal y como se pidió expresamente.