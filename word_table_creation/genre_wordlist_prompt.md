# 100 German Words for One Genre (CSV)

You are helping me build a high-quality German wordbase for a party word game.  
Generate **exactly 100** German words for the genre:

**GENRE:** 

## Requirements (strict)
- Output **only** a CSV (no explanation, no markdown, no code fences).
- CSV header must be: `word,difficulty`
- Then **exactly 100 rows**.
- `word` must be **a single German word** (prefer **nouns**, **Singular**, **without article**).  
  - No multi-word phrases.
  - No hyphenated terms.
  - No abbreviations.
  - No brand names or proper names.
  - Avoid English loanwords unless they are truly common in everyday German.
- Words must be **commonly used and widely understood** across German speakers.
- Words must fit the specified genre. If a word is ambiguous, prefer the sense that fits the genre.
- **No duplicates** (including near-duplicates like plural/singular variants or obvious spelling variants).
- Keep the list **diverse** (avoid many close synonyms).

## Difficulty rating (1–5)
Provide an integer in `difficulty` that estimates how hard the word is to guess from indirect hints:
- **1** = extremely common, very easy, broad (e.g., “Tasse”).
- **2** = common, easy.
- **3** = moderately specific; still widely known.
- **4** = specific / less frequent; but still generally known.
- **5** = niche / specialized; avoid unless still widely understood by many adults.

Target difficulty mix (approximate):  
- 30–40% difficulty **1–2**  
- 40–50% difficulty **3**  
- 10–20% difficulty **4–5**

## Quality control (do silently; do not print)
Before outputting, verify:
- Count is exactly 100 rows after the header.
- All words are single-token (no spaces), non-empty, and genre-appropriate.
- No duplicates or trivial variants.
- Difficulty values are integers 1–5.

Now output the CSV.