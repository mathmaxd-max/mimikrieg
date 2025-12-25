#!/usr/bin/env python3
"""
Script to merge all CSV files from words_n_difficulty folder,
remove duplicates based on first column (averaging second column), and sort alphabetically.
"""

import csv
from pathlib import Path


def merge_csv_files():
    """
    Merge all CSV files in words_n_difficulty folder, remove duplicates based on first column,
    average the second column values for duplicates, and sort alphabetically by the first column.
    """
    script_dir = Path(__file__).parent
    input_dir = script_dir / 'words_n_difficulty'
    output_file = script_dir / 'words_n_difficulty.csv'
    
    if not input_dir.exists():
        print(f"Error: Directory '{input_dir}' not found.")
        return
    
    # Group rows by first column (word) and collect difficulty values
    word_groups = {}
    
    # Get all CSV files sorted by name
    csv_files = sorted(input_dir.glob('*.csv'))
    
    if not csv_files:
        print(f"Error: No CSV files found in '{input_dir}'.")
        return
    
    print(f"Found {len(csv_files)} CSV file(s) to merge...")
    
    # Read all CSV files
    total_rows_read = 0
    for csv_file in csv_files:
        with open(csv_file, 'r', encoding='utf-8', newline='') as f:
            reader = csv.reader(f)
            header = next(reader, None)  # Skip header
            
            if header is None:
                print(f"Warning: '{csv_file}' has no header, skipping.")
                continue
            
            file_rows = 0
            for row in reader:
                if len(row) >= 2:  # Ensure row has at least word and difficulty
                    word = row[0]
                    try:
                        difficulty = int(row[1])
                    except (ValueError, IndexError):
                        continue
                    
                    if word not in word_groups:
                        word_groups[word] = []
                    word_groups[word].append(difficulty)
                    file_rows += 1
                    total_rows_read += 1
            
            print(f"  Processed '{csv_file.name}': {file_rows} rows read")
    
    # Create unique rows with averaged difficulty
    all_rows = []
    for word, difficulties in word_groups.items():
        avg_difficulty = round(sum(difficulties) / len(difficulties))
        all_rows.append([word, str(avg_difficulty)])
    
    # Sort by first column alphabetically (case-insensitive)
    all_rows.sort(key=lambda x: x[0].lower() if x[0] else '')
    
    # Write merged data to output file
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['word', 'difficulty'])
        writer.writerows(all_rows)
    
    duplicates_removed = total_rows_read - len(all_rows)
    print(f"\nMerged {len(all_rows)} unique rows into '{output_file.name}'")
    print(f"Removed {duplicates_removed} duplicate(s) (based on first column)")
    print(f"Output file: {output_file}")


if __name__ == '__main__':
    merge_csv_files()

