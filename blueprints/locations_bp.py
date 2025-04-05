# Location Management Routes Blueprint
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, abort
from datetime import datetime

# Create the blueprint
locations_bp = Blueprint('locations', __name__, url_prefix='')

# Import helpers from the new helpers module
from helpers import get_db, login_required, role_required

# Locations Routes
@locations_bp.route('/locations')
@login_required
def locations():
    """List all locations"""
    db = get_db()
    locations = db.execute(
        '''SELECT l.*, 
           (SELECT COUNT(*) FROM events WHERE location_id = l.id) as event_count
           FROM locations l 
           ORDER BY l.name'''
    ).fetchall()
    
    return render_template('locations.html', locations=locations)

@locations_bp.route('/locations/new', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'staff')
def new_location():
    """Create a new location"""
    if request.method == 'POST':
        name = request.form['name']
        address = request.form.get('address', '')
        city = request.form.get('city', '')
        state = request.form.get('state', '')
        zip_code = request.form.get('zip_code', '')
        country = request.form.get('country', 'USA')
        phone = request.form.get('phone', '')
        email = request.form.get('email', '')
        website = request.form.get('website', '')
        notes = request.form.get('notes', '')
        
        error = None
        if not name:
            error = 'Location name is required'
            
        if error is not None:
            flash(error, 'danger')
        else:
            db = get_db()
            db.execute(
                '''INSERT INTO locations 
                   (name, address, city, state, zip_code, country, phone, email, website, notes) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (name, address, city, state, zip_code, country, phone, email, website, notes)
            )
            db.commit()
            flash('Location created successfully', 'success')
            return redirect(url_for('locations_bp.locations'))
            
    return render_template('new_location.html')

@locations_bp.route('/locations/<int:location_id>')
@login_required
def view_location(location_id):
    """View location details"""
    db = get_db()
    location = db.execute('SELECT * FROM locations WHERE id = ?', (location_id,)).fetchone()
    
    if location is None:
        abort(404)
    
    # Get events at this location
    events = db.execute(
        '''SELECT e.*, c.name as client_name, c.color as client_color
           FROM events e 
           LEFT JOIN clients c ON e.client_id = c.id
           WHERE e.location_id = ?
           ORDER BY e.event_date DESC''',
        (location_id,)
    ).fetchall()
    
    return render_template('view_location.html', location=location, events=events)

@locations_bp.route('/locations/<int:location_id>/edit', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'staff')
def edit_location(location_id):
    """Edit a location"""
    db = get_db()
    location = db.execute('SELECT * FROM locations WHERE id = ?', (location_id,)).fetchone()
    
    if location is None:
        abort(404)
    
    if request.method == 'POST':
        name = request.form['name']
        address = request.form.get('address', '')
        city = request.form.get('city', '')
        state = request.form.get('state', '')
        zip_code = request.form.get('zip_code', '')
        country = request.form.get('country', 'USA')
        phone = request.form.get('phone', '')
        email = request.form.get('email', '')
        website = request.form.get('website', '')
        notes = request.form.get('notes', '')
        is_active = bool(request.form.get('is_active', False))
        
        error = None
        if not name:
            error = 'Location name is required'
            
        if error is not None:
            flash(error, 'danger')
        else:
            db.execute(
                '''UPDATE locations SET 
                   name = ?, address = ?, city = ?, state = ?, zip_code = ?, 
                   country = ?, phone = ?, email = ?, website = ?, notes = ?, is_active = ?
                   WHERE id = ?''',
                (name, address, city, state, zip_code, country, phone, email, 
                 website, notes, 1 if is_active else 0, location_id)
            )
            db.commit()
            flash('Location updated successfully', 'success')
            return redirect(url_for('locations_bp.view_location', location_id=location_id))
    
    return render_template('edit_location.html', location=location)

@locations_bp.route('/locations/<int:location_id>/delete', methods=['POST'])
@login_required
@role_required('admin', 'staff')
def delete_location(location_id):
    """Delete a location"""
    db = get_db()
    
    # Check if this location is used in any events
    events_count = db.execute(
        'SELECT COUNT(*) as count FROM events WHERE location_id = ?', 
        (location_id,)
    ).fetchone()['count']
    
    if events_count > 0:
        flash(f'Cannot delete this location because it is used in {events_count} events', 'danger')
        return redirect(url_for('locations_bp.view_location', location_id=location_id))
    
    db.execute('DELETE FROM locations WHERE id = ?', (location_id,))
    db.commit()
    
    flash('Location deleted successfully', 'success')
    return redirect(url_for('locations_bp.locations'))

# API Routes
@locations_bp.route('/api/locations')
@login_required
def api_locations():
    """API endpoint to get all active locations"""
    db = get_db()
    locations = db.execute(
        'SELECT * FROM locations WHERE is_active = 1 ORDER BY name'
    ).fetchall()
    
    # Convert to list of dicts for JSON serialization
    locations_list = [dict(location) for location in locations]
    
    return jsonify(locations_list)

@locations_bp.route('/api/locations/search')
@login_required
def api_search_locations():
    """API endpoint to search locations"""
    query = request.args.get('q', '')
    
    if not query or len(query) < 2:
        return jsonify([])
    
    db = get_db()
    locations = db.execute(
        '''SELECT * FROM locations 
           WHERE is_active = 1 AND
                 (name LIKE ? OR address LIKE ? OR city LIKE ?)
           ORDER BY name
           LIMIT 10''',
        (f'%{query}%', f'%{query}%', f'%{query}%')
    ).fetchall()
    
    # Convert to list of dicts for JSON serialization
    locations_list = [dict(location) for location in locations]
    
    return jsonify(locations_list)