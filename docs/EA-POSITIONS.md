# Posiciones de EA Sports FC

El buscador usa el parámetro numérico `position` de `drop-api.ea.com/rating/ea-sports-fc`.
La interfaz selecciona estas posiciones mediante botones; no es necesario escribir el ID.

| ID EA | Abreviatura | Posición en español | Grupo |
| ---: | --- | --- | --- |
| 0 | POR | Portero | Portero |
| 3 | LI | Lateral izquierdo | Defensa |
| 5 | LD | Lateral derecho | Defensa |
| 14 | DFC | Defensa central | Defensa |
| 15 | CAD | Carrilero derecho | Defensa |
| 16 | CAI | Carrilero izquierdo | Defensa |
| 21 | MCD | Mediocentro defensivo | Centrocampista |
| 22 | MC | Mediocentro | Centrocampista |
| 23 | MI | Mediocentro izquierdo | Centrocampista |
| 24 | MD | Mediocentro derecho | Centrocampista |
| 25 | DC | Delantero centro | Ataque |
| 26 | SD | Segundo delantero | Ataque |
| 27 | EI | Extremo izquierdo | Ataque |
| 28 | ED | Extremo derecho | Ataque |
| 29 | MCO | Mediapunta | Centrocampista |
| 30 | DFC | Defensa central | Defensa |
| 31 | POR | Portero | Portero |

La lista se mantiene en `src/lib/ratings/positions.ts`. Si EA incorpora una posición
adicional, se debe añadir allí y en esta tabla antes de habilitarla en la UI.
