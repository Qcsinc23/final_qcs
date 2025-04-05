import sqlite3
from flask import g, session, flash, redirect, url_for, abort, current_app
from functools import wraps

# Database helper functions
def get_db():
    """Connect to the database if there's no connection yet"""
    if 'db' not in g:
        # Use current_app to access app configuration
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    """Close the database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Authentication helpers
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in first', 'warning')
            # Need to reference the login route endpoint correctly.
            # Assuming 'login' is the endpoint name in app.py or a user blueprint.
            # If login is in a blueprint (e.g., 'auth'), use 'auth.login'.
            # For now, assuming it's a top-level route.
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash('Please log in first', 'warning')
                # Assuming 'login' is the endpoint name
                return redirect(url_for('login'))

            # Check if user has required role
            db = get_db()
            user = db.execute('SELECT role FROM users WHERE id = ?',
                             (session['user_id'],)).fetchone()

            if not user or user['role'] not in roles:
                flash('You do not have permission to access this page', 'danger')
                abort(403) # Use Flask's abort for permission denied

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_current_user():
    """Get the current logged-in user"""
    if 'user_id' in session:
        db = get_db()
        return db.execute('SELECT * FROM users WHERE id = ?',
                         (session['user_id'],)).fetchone()
    return None