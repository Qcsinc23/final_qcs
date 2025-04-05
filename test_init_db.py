#!/usr/bin/env python3
"""
Test script to initialize the database with the consolidated schema.
"""

import os
import sqlite3
from flask import Flask

def init_db(db_path, schema_path):
    """Initialize the database with schema"""
    # Delete existing database if it exists
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed existing database at {db_path}")
    
    # Create new database
    conn = sqlite3.connect(db_path)
    
    # Read schema file
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
    
    # Execute schema
    conn.executescript(schema_sql)
    conn.commit()
    print(f"Database initialized at {db_path}")
    
    # Verify tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"\nDatabase contains {len(tables)} tables:")
    for i, table in enumerate(tables, 1):
        print(f"{i}. {table[0]}")
    
    # Verify some key tables have expected columns
    check_table_columns(cursor, 'events', [
        'event_id', 'event_name', 'client_id', 'event_date', 'end_date', 
        'drop_off_time', 'pickup_time', 'is_all_day', 'has_conflicts', 
        'is_recurring', 'recurrence_pattern', 'location_id', 'ics_uid'
    ])
    
    check_table_columns(cursor, 'locations', [
        'id', 'name', 'address', 'city', 'state', 'zip_code', 'country', 'is_active'
    ])
    
    check_table_columns(cursor, 'event_tasks', [
        'id', 'event_id', 'description', 'is_completed', 'due_date', 'assigned_to'
    ])
    
    check_table_columns(cursor, 'event_conflicts', [
        'id', 'event_id', 'conflicting_event_id', 'conflict_type', 'resolved'
    ])
    
    check_table_columns(cursor, 'calendar_feeds', [
        'id', 'url', 'last_synced', 'auto_sync'
    ])
    
    conn.close()
    print("\nDatabase schema verification complete!")

def check_table_columns(cursor, table_name, expected_columns):
    """Check if a table has expected columns"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    print(f"\nChecking table '{table_name}':")
    print(f"  Found {len(columns)} columns")
    
    missing_columns = [col for col in expected_columns if col not in column_names]
    if missing_columns:
        print(f"  WARNING: Missing expected columns: {', '.join(missing_columns)}")
    else:
        print(f"  All expected columns are present")

if __name__ == "__main__":
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define paths
    db_path = os.path.join(script_dir, 'test_db.db')
    schema_path = os.path.join(script_dir, 'schema.sql')
    
    # Initialize database
    init_db(db_path, schema_path)