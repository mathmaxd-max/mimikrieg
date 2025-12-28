import csv
from pathlib import Path

def convert_csv_to_tsv():
    """Convert raw_wordbase.csv to wordbase.tsv, preserving format"""
    input_file = Path(__file__).parent / 'raw_wordbase.csv'
    output_file = Path(__file__).parent.parent / 'wordbase.tsv'
    
    print(f"Reading from {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"Found {len(rows)} rows")
    print(f"Writing to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        # Write header
        f.write('word\tdifficulty\tgenre_ids\thints\n')
        
        # Write data rows
        for row in rows:
            word = row['word']
            difficulty = row['difficulty']
            genre_ids = row['genre_ids']
            hints = row['hints']
            
            # Write as tab-separated values
            f.write(f"{word}\t{difficulty}\t{genre_ids}\t{hints}\n")
    
    print(f"Done! Converted {len(rows)} rows to {output_file}")

if __name__ == '__main__':
    convert_csv_to_tsv()

