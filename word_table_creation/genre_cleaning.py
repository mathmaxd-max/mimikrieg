#!/usr/bin/env python3
"""
Script to clean CSV files by sorting alphabetically by the first column
and removing exact duplicate rows.
"""

import csv
import sys
from pathlib import Path


def clean_csv(filename):
    """
    Sort CSV by first column and remove exact duplicates.
    
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
    
    # Remove exact duplicates (convert to tuple for set, then back to list)
    seen = set()
    unique_rows = []
    for row in data_rows:
        row_tuple = tuple(row)
        if row_tuple not in seen:
            seen.add(row_tuple)
            unique_rows.append(list(row_tuple))
    
    # Sort by first column alphabetically
    unique_rows.sort(key=lambda x: x[0].lower() if x[0] else '')
    
    # Write back to file
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(unique_rows)
    
    print(f"Cleaned '{filename}': Removed {len(data_rows) - len(unique_rows)} duplicate(s), "
          f"sorted {len(unique_rows)} unique rows alphabetically.")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python genre_cleaning.py <filename>")
        print("Example: python genre_cleaning.py g0.csv")
        sys.exit(1)
    
    clean_csv(sys.argv[1])

