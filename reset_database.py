import os
import sqlite3
from app import app, init_db

def reset_database():
    """Delete the existing database and create a new one with all tables"""
    print("Resetting database...")
    
    # Database path
    db_path = os.path.join(app.root_path, 'database.db')
    
    # Delete existing database if it exists
    if os.path.exists(db_path):
        print(f"Removing existing database at {db_path}")
        os.remove(db_path)
    
    # Initialize new database with application context
    print("Creating new database with all tables")
    with app.app_context():
        init_db()
    
    # Verify tables were created
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get list of all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Created tables:")
    for table in tables:
        print(f"- {table[0]}")
    
    conn.close()
    print("Database reset complete!")

if __name__ == '__main__':
    reset_database()