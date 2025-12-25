#!/usr/bin/env python3
"""
Script to clean CSV files by sorting alphabetically by the first column
and removing duplicate rows based on the first column, averaging the second column.
"""

import csv
import sys
from pathlib import Path


def clean_csv(filename):
    """
    Sort CSV by first column and remove duplicates based on first column.
    When duplicates are found, average the second column values and round to nearest integer.
    
    Args:
        filename: Path to the CSV file to clean
    """
    filepath = Path(filename)
    
    if not filepath.exists():
        print(f"Error: File '{filename}' not found.")
        sys.exit(1)
    
    # Read all rows from CSV
    rows = []
    with open(filepath, 'r', encoding='utf-8', newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            rows.append(row)
    
    if not rows:
        print(f"Error: File '{filename}' is empty.")
        sys.exit(1)
    
    # Separate header from data
    header = rows[0]
    data_rows = rows[1:]
    
    # Group rows by first column (word) and collect difficulty values
    word_groups = {}
    for row in data_rows:
        if len(row) >= 2:
            word = row[0]
            try:
                difficulty = int(row[1])
            except (ValueError, IndexError):
                continue
            
            if word not in word_groups:
                word_groups[word] = []
            word_groups[word].append(difficulty)
    
    # Create unique rows with averaged difficulty
    unique_rows = []
    for word, difficulties in word_groups.items():
        avg_difficulty = round(sum(difficulties) / len(difficulties))
        unique_rows.append([word, str(avg_difficulty)])
    
    # Sort by first column alphabetically
    unique_rows.sort(key=lambda x: x[0].lower() if x[0] else '')
    
    # Write back to file
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(unique_rows)
    
    duplicates_removed = len(data_rows) - len(unique_rows)
    print(f"Cleaned '{filename}': Removed {duplicates_removed} duplicate(s), "
          f"sorted {len(unique_rows)} unique rows alphabetically.")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python genre_cleaning.py <filename>")
        print("Example: python genre_cleaning.py g0.csv")
        sys.exit(1)
    
    clean_csv(sys.argv[1])

