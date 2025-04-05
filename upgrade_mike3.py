import sqlite3
import os
import sys

# Import the custom password hashing function from app.py
sys.path.append('.')  # Ensure the current directory is in the Python path
from app import generate_password_hash

# Connect to the database
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Check if user mike3 exists
cursor.execute("SELECT id, username, role FROM users WHERE username = 'mike3'")
user = cursor.fetchone()

if user:
    user_id, username, current_role = user
    print(f"User found: {username}, Current role: {current_role}")
    
    if current_role == 'admin':
        print("User already has the highest role (admin). No changes needed.")
    else:
        # Update user role to admin
        cursor.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user_id,))
        conn.commit()
        print(f"User {username} role upgraded from '{current_role}' to 'admin'")
else:
    print("User 'mike3' not found in the database. Creating user with 'viewer' role...")
    
    # Create password hash (using default password 'password123')
    password_hash = generate_password_hash('password123')
    
    # Create the user with initial 'viewer' role
    cursor.execute(
        "INSERT INTO users (username, password_hash, email, full_name, role) VALUES (?, ?, ?, ?, ?)",
        ('mike3', password_hash, 'mike3@example.com', 'Mike Three', 'viewer')
    )
    conn.commit()
    
    # Get the newly created user ID
    cursor.execute("SELECT id FROM users WHERE username = 'mike3'")
    user_id = cursor.fetchone()[0]
    
    print(f"User 'mike3' created with 'viewer' role (ID: {user_id}).")
    
    # Now upgrade the user to admin
    cursor.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user_id,))
    conn.commit()
    print("User 'mike3' role upgraded from 'viewer' to 'admin'")

# Verify changes
cursor.execute("SELECT username, role FROM users")
users = cursor.fetchall()
print("\nAll users:")
for username, role in users:
    print(f"- {username} (role: {role})")

# Close the connection
conn.close()