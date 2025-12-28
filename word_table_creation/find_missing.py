"""
Script to find rows missing in enhanced tables compared to original tables.
Compares based on the word column and writes missing rows to the missing directory.
"""

import csv
import os
from pathlib import Path

# Define directories
ORIGINAL_DIR = Path("words_n_difficulty")
ENHANCED_DIR = Path("genre_finals")
MISSING_DIR = Path("missing")

# Create missing directory if it doesn't exist
MISSING_DIR.mkdir(exist_ok=True)

def get_words_from_file(filepath):
    """Extract set of words from a CSV file."""
    words = set()
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row.get('word', '').strip()
                if word:
                    words.add(word)
    except FileNotFoundError:
        print(f"Warning: {filepath} not found")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return words

def get_rows_by_word(filepath):
    """Get all rows from a CSV file indexed by word."""
    rows = {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row.get('word', '').strip()
                if word:
                    rows[word] = row
    except FileNotFoundError:
        print(f"Warning: {filepath} not found")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return rows

def process_file(filename):
    """Process a single file pair and write missing rows."""
    original_path = ORIGINAL_DIR / filename
    enhanced_path = ENHANCED_DIR / filename
    missing_path = MISSING_DIR / filename
    
    # Get words from both files
    original_words = get_words_from_file(original_path)
    enhanced_words = get_words_from_file(enhanced_path)
    
    # Find missing words
    missing_words = original_words - enhanced_words
    
    if not missing_words:
        # Delete file if it exists (no missing words)
        if missing_path.exists():
            missing_path.unlink()
            print(f"{filename}: No missing words, deleted {missing_path}")
        else:
            print(f"{filename}: No missing words")
        return
    
    # Get all rows from original file
    original_rows = get_rows_by_word(original_path)
    
    # Write missing rows to output file
    with open(missing_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['word', 'difficulty'])
        writer.writeheader()
        
        for word in sorted(missing_words):
            if word in original_rows:
                row = original_rows[word]
                writer.writerow({
                    'word': row.get('word', ''),
                    'difficulty': row.get('difficulty', '')
                })
    
    print(f"{filename}: Found {len(missing_words)} missing words, written to {missing_path}")

def main():
    """Main function to process all files."""
    # Get all CSV files from original directory
    original_files = sorted([f.name for f in ORIGINAL_DIR.glob('*.csv')])
    
    if not original_files:
        print(f"No CSV files found in {ORIGINAL_DIR}")
        return
    
    print(f"Processing {len(original_files)} files...")
    print("-" * 50)
    
    for filename in original_files:
        process_file(filename)
    
    print("-" * 50)
    print("Done!")

if __name__ == "__main__":
    main()

