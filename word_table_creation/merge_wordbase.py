import csv
import os
from pathlib import Path
from collections import defaultdict

def parse_hint(hint_str):
    """Parse a hint string and return formatted version: 'word~A_TARGET_VIBE~2' -> 'word~A~2'"""
    parts = hint_str.split('~')
    if len(parts) >= 3:
        word = parts[0]
        vibe = parts[1].replace('_TARGET_VIBE', '').replace('_PART_VIBE', '')
        difficulty = parts[2]
        return f"{word}~{vibe}~{difficulty}"
    return hint_str

def merge_genre_ids(genre_id_strings):
    """Merge multiple genre_id strings (pipe-separated) into a sorted unique set"""
    all_ids = set()
    for genre_str in genre_id_strings:
        if genre_str:
            ids = [gid.strip() for gid in genre_str.split('|')]
            all_ids.update(ids)
    return '|'.join(sorted(all_ids, key=lambda x: int(x) if x.isdigit() else 999))

def merge_hints(hint_strings, target_word):
    """Merge hint strings, remove duplicates, format them, and purge hints that are substrings of the word"""
    all_hints = set()
    target_word_lower = target_word.lower()
    
    for hint_str in hint_strings:
        if hint_str:
            # Split by comma to get individual hints
            hints = [h.strip().strip('"') for h in hint_str.split(',')]
            for hint in hints:
                if hint:
                    formatted = parse_hint(hint)
                    # Extract the hint word and vibe (part before first ~ and second ~)
                    hint_parts = formatted.split('~')
                    if hint_parts:
                        hint_word = hint_parts[0].strip()
                        vibe = hint_parts[1].strip() if len(hint_parts) > 1 else ''
                        # Skip type B hints
                        if vibe == 'B':
                            continue
                        # Skip if hint word is a substring of the target word (case-insensitive)
                        if hint_word.lower() in target_word_lower:
                            continue
                    all_hints.add(formatted)
    return ','.join(sorted(all_hints))

def process_wordbase():
    """Merge all CSV files, deduplicate by word, and format output"""
    genre_finals_dir = Path(__file__).parent / 'genre_finals'
    output_file = Path(__file__).parent / 'raw_wordbase.csv'
    
    # Dictionary to store word data: word -> list of rows
    word_data = defaultdict(list)
    
    # Read all CSV files
    csv_files = sorted(genre_finals_dir.glob('g*.csv'))
    print(f"Found {len(csv_files)} CSV files to process")
    
    for csv_file in csv_files:
        print(f"Processing {csv_file.name}...")
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row['word'].strip()
                if word:
                    word_data[word].append(row)
    
    print(f"\nTotal unique words: {len(word_data)}")
    
    # Process each word group
    processed_rows = []
    for word, rows in word_data.items():
        # Average and round difficulty
        difficulties = [int(row['difficulty']) for row in rows if row['difficulty'].isdigit()]
        avg_difficulty = round(sum(difficulties) / len(difficulties)) if difficulties else 1
        
        # Merge genre_ids
        genre_ids = [row['genre_ids'] for row in rows if row.get('genre_ids')]
        merged_genre_ids = merge_genre_ids(genre_ids)
        
        # Merge hints
        hints = [row['hints'] for row in rows if row.get('hints')]
        merged_hints = merge_hints(hints, word)
        
        processed_rows.append({
            'word': word,
            'difficulty': avg_difficulty,
            'genre_ids': merged_genre_ids,
            'hints': merged_hints
        })
    
    # Sort alphabetically by word
    processed_rows.sort(key=lambda x: x['word'].lower())
    
    # Write output
    print(f"\nWriting {len(processed_rows)} rows to {output_file}...")
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['word', 'difficulty', 'genre_ids', 'hints']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(processed_rows)
    
    print(f"Done! Output written to {output_file}")

if __name__ == '__main__':
    process_wordbase()

