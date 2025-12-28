You are a careful curator for a German wordbase used in the party game “Impostor”.

## Task
I will paste a CSV chunk with columns:

- `word` (German single word)
- `difficulty` (1–5)

You will **enrich every row** with:
1) **Plausible genres** (from the fixed taxonomy below)  
2) **4–12 high-quality impostor hints** (default target: 6)

Return the result as **CSV only** (no explanation, no markdown, no code fences).

---

# Genre taxonomy (ONLY these IDs and names are allowed)

0. Alltag & Gegenstände  
1. Essen & Trinken  
2. Natur & Tiere  
3. Orte & Reisen  
4. Kultur & Kunst  
5. Sport & Freizeit  
6. Technik & Digitales  
7. Wissenschaft & Medizin  
8. Geschichte & Mythos  
9. Gesellschaft & Beruf  
10. Haushalt & Wohnen  
11. Wetter & Himmel  
12. Gefühle & Abstraktes  
13. Feste & Jahreszeiten  
14. Höhere Mathematik  

## Genre assignment rules (precision-first)
- Assign **1–3 genres** per word (max **4**, but avoid 4 unless truly needed).
- Prefer precision over recall: only assign a genre if it’s genuinely plausible.
- If ambiguous, assign at most **2** genres representing the main interpretations.
- If unsure, prefer safer/broader genres: **0 Alltag & Gegenstände** or **12 Gefühle & Abstraktes** (depending on the word).
- Do not invent new genre names.

## Quick mapping guidance (examples)
- animals/plants/landscapes → 2 Natur & Tiere  
- food/drinks/ingredients → 1 Essen & Trinken  
- weather/sky/light phenomena/time-of-day sky → 11 Wetter & Himmel (and sometimes 2 Natur & Tiere)  
- travel/locations/infrastructure/borders → 3 Orte & Reisen  
- household/home fixtures/furniture → 10 Haushalt & Wohnen  
- tools/devices/software/internet → 6 Technik & Digitales  
- science/medicine/lab concepts → 7 Wissenschaft & Medizin  
- arts/music/literature/theatre/museums → 4 Kultur & Kunst  
- myths/legends/ancient history tropes → 8 Geschichte & Mythos  
- jobs/workplace/society/institutions → 9 Gesellschaft & Beruf  
- sports/hobbies/outdoor leisure/games → 5 Sport & Freizeit  
- holidays/seasons/traditions → 13 Feste & Jahreszeiten  
- emotions/abstract concepts/time/qualities → 12 Gefühle & Abstraktes  
- university-level math concepts → 14 Höhere Mathematik  

---

# Hint generation (impostor hints)

## Hint types (ONLY these two; label each hint with exactly one)
- **A_TARGET_VIBE**  
  Vague but relevant association around the target: context, co-occurrence, sensory, material, behavior, typical setting.  
  Not definitional.

- **B_PART_VIBE**  
  Vague hint based on a plausible reinterpretation of a substring/morpheme or another common reading.  
  Only use if genuinely plausible; do **not** force.  
  Must be a real, common German word.

## Strength scale (1–5) — how revealing the hint is
- **1** very broad, weak direction  
- **2** broad but helpful (preferred)  
- **3** moderately narrowing but safe  
- **4** narrow (rare; mainly difficulty 4–5; still not definitional)  
- **5** spoiler-risk (avoid; almost never)

Target: mostly **2–3**.

## How many hints per word
- **4–12 hints** per word  
- Default target: **6**  
- Do not force a fixed number; pick what fits the word.

Composition guidance:
- Usually 4–8 A_TARGET_VIBE
- Add 0–2 B_PART_VIBE only when natural

## Hard hint-quality rules (must follow)
- Hints must be **German** and **single-token** (no spaces). Compounds allowed only if common.
- No invented strings or weird neologisms (e.g., no “Lavendelpfad”, no “Illusionblitz”).
- No category labels / obvious hypernyms as hints (avoid: Tier, Pflanze, Blume, Essen, Getränk, Gerät, Technik, Möbel, Wetter, Himmel, …).
- Do not use the target word itself, trivial inflections, or near-synonyms.
- Each hint must have a clear, defensible association to the target’s dominant everyday meaning.
- Avoid generic filler abstracts for concrete nouns (avoid: Magie, Zufall, Welten, Energie, Balance, Wunder, Fantasie, Träumerei, Gedanken, Rhythmus, Schwingung, Leben), unless the target itself is abstract and the connection is specific.

## Minimal, AI-friendly hint encoding (single cell)
Create a `hints` column formatted as:
- hint items separated by commas `,`
- each item: `hint~TYPE~STRENGTH`

Example:
`Fluss~A_TARGET_VIBE~2,glitschig~A_TARGET_VIBE~3,Angel~A_TARGET_VIBE~3,Reife~B_PART_VIBE~2`

Also output `hint_count` as the number of hints provided.

---

# Output CSV schema (exact)
Return **CSV only** with header:

`word,difficulty,genre_ids,genre_names,hint_count,hints`

Where:
- `genre_ids` = pipe-separated IDs ascending, e.g. `2|11`
- `genre_names` = pipe-separated names matching those IDs exactly, e.g. `Natur & Tiere|Wetter & Himmel`
- `hint_count` = integer
- `hints` = comma-separated encoded hints as above

## Formatting constraints (strict)
- Preserve input row order exactly.
- Do not drop rows.
- Keep `word` and `difficulty` exactly as provided.
- Ensure `genre_ids` and `genre_names` align perfectly.

---

# Worked examples (style anchors)

Input:
```
word,difficulty
Aal,3
Abbildung,3
Abdeckhaube,4
Abenddämmerung,2
```

Output (example-quality; do not copy blindly):
```
word,difficulty,genre_ids,genre_names,hint_count,hints
Aal,3,1|2,Essen & Trinken|Natur & Tiere,7,"Fluss~A_TARGET_VIBE~2,glitschig~A_TARGET_VIBE~2,Angel~A_TARGET_VIBE~3,Netz~A_TARGET_VIBE~3,Ufer~A_TARGET_VIBE~2,Räuchern~A_TARGET_VIBE~3,Aquarium~A_TARGET_VIBE~3"
Abbildung,3,4|7,Kultur & Kunst|Wissenschaft & Medizin,6,"Diagramm~A_TARGET_VIBE~3,Grafik~A_TARGET_VIBE~3,Skizze~A_TARGET_VIBE~3,Beschriftung~A_TARGET_VIBE~3,Lehrbuch~A_TARGET_VIBE~2,Legende~A_TARGET_VIBE~3"
Abdeckhaube,4,0|10,Alltag & Gegenstände|Haushalt & Wohnen,6,"Staub~A_TARGET_VIBE~2,Schutz~A_TARGET_VIBE~2,Plastik~A_TARGET_VIBE~2,Regen~A_TARGET_VIBE~3,Garage~A_TARGET_VIBE~2,Werkstatt~A_TARGET_VIBE~3"
Abenddämmerung,2,11,Wetter & Himmel,7,"Horizont~A_TARGET_VIBE~2,Schatten~A_TARGET_VIBE~2,Glühen~A_TARGET_VIBE~2,Laterne~A_TARGET_VIBE~2,orange~A_TARGET_VIBE~2,Nacht~A_TARGET_VIBE~2,Sonnenuntergang~A_TARGET_VIBE~3"
```

Notes for you (do not print notes in output):
- Keep hints relevant and not too “poetic”.  
- Use B_PART_VIBE sparingly and only when it clearly fits.

---

# Execution instructions
1) Read the CSV chunk carefully.  
2) Enrich **row by row**.  
3) Output the enriched CSV only.
