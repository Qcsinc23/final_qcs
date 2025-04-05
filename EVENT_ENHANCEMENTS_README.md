# Event Management System Enhancements

This project enhances the QCS Event Management application with advanced calendar features, location management, task tracking, and conflict detection capabilities.

## Table of Contents

1. [Features Overview](#features-overview)
2. [Installation](#installation)
3. [Quick Fix for BuildError](#quick-fix-for-builderror)
4. [Calendar Features](#calendar-features)
5. [Location Database](#location-database)
6. [Task Management](#task-management)
7. [Technical Documentation](#technical-documentation)

## Features Overview

### Enhanced Calendar
- **Drag-and-Drop Events**: Quickly move events to new dates/times on the calendar
- **Conflict Detection**: Automatic alerts when overlapping events use the same equipment or location
- **Calendar Feeds**: Subscribe to/export ICS feeds for external calendar integration
- **Multi-Day Events**: Support for events spanning multiple days
- **Recurring Events**: Create repeating events with various recurrence patterns

### Location Database
- **Venue Management**: Store and manage frequently used venues
- **Quick Selection**: Easily select venues when creating events
- **Location History**: Track all events held at a particular location

### Task Management
- **Event Checklists**: Create and manage tasks for each event
- **Staff Assignment**: Assign tasks to specific team members
- **Progress Tracking**: Monitor completion status for each event

## Installation

### 1. Database Setup

Run the setup script to configure all necessary database tables:

```bash
python setup_enhanced_features.py
```

This script will:
- Create the locations table
- Create the event_tasks table
- Add enhancements to the events table for multi-day/recurring events
- Create tables for conflict tracking

### 2. Integrate Routes into app.py

You must add the new routes to app.py for the enhancements to work. You have two options:

#### Option A: Import All Routes (Recommended)

Add these import statements at the top of app.py after the other imports:

```python
# Import enhanced event management routes
from app_calendar_routes import *
from app_location_routes import *
from app_event_tasks_routes import *
```

#### Option B: Copy Individual Routes

Alternatively, you can copy specific route functions from each file to app.py.

**From app_calendar_routes.py:**
Add these routes before the `if __name__ == '__main__'` line in app.py:

```python
@app.route('/export-calendar/<format>')
@login_required
def export_calendar(format):
    """Export calendar in various formats (ICS, etc.)"""
    if format == 'ics':
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all events
        cursor.execute('''
            SELECT e.event_id, e.event_name, e.event_date, e.drop_off_time, e.pickup_time, 
                   e.end_date, e.client_id, c.name as client_name, e.event_location
            FROM events e
            LEFT JOIN clients c ON e.client_id = c.id
            ORDER BY e.event_date
        ''')
        events = cursor.fetchall()
        conn.close()
        
        # Create iCalendar file
        cal = Calendar()
        cal.add('prodid', '-//QCS Event Management//EN')
        cal.add('version', '2.0')
        
        for event in events:
            cal_event = Event()
            
            # Set UID (required for iCalendar)
            cal_event['uid'] = f"event-{event['event_id']}@qcseventmgmt.com"
            
            # Set summary (title)
            cal_event.add('summary', event['event_name'])
            
            # Set start and end dates/times
            start_date = datetime.strptime(event['event_date'], '%Y-%m-%d')
            
            # Handle all-day events vs. timed events
            if event['drop_off_time']:
                # Convert time string to datetime
                start_time = datetime.strptime(event['drop_off_time'], '%H:%M').time()
                start_datetime = datetime.combine(start_date.date(), start_time)
                cal_event.add('dtstart', start_datetime)
                
                if event['pickup_time']:
                    end_time = datetime.strptime(event['pickup_time'], '%H:%M').time()
                    if event['end_date']:
                        end_date = datetime.strptime(event['end_date'], '%Y-%m-%d')
                    else:
                        end_date = start_date
                    end_datetime = datetime.combine(end_date.date(), end_time)
                    cal_event.add('dtend', end_datetime)
            else:
                # All-day event
                cal_event.add('dtstart', start_date.date())
                if event['end_date']:
                    end_date = datetime.strptime(event['end_date'], '%Y-%m-%d')
                    # For all-day events in iCalendar, the end date is exclusive
                    cal_event.add('dtend', end_date.date() + timedelta(days=1))
                else:
                    cal_event.add('dtend', start_date.date() + timedelta(days=1))
            
            # Add location if available
            if event['event_location']:
                cal_event.add('location', event['event_location'])
            
            # Add description with client name
            if event['client_name']:
                cal_event.add('description', f"Client: {event['client_name']}")
            
            cal.add_component(cal_event)
        
        # Return calendar file
        response = Response(cal.to_ical(), mimetype='text/calendar')
        response.headers['Content-Disposition'] = 'attachment; filename=calendar.ics'
        return response
    
    # Unsupported format
    abort(400)

@app.route('/import-calendar', methods=['POST'])
@login_required
def import_calendar():
    """Import events from ICS file or URL"""
    if 'ics_file' in request.files:
        file = request.files['ics_file']
        if file.filename == '':
            flash('No file selected', 'danger')
            return redirect(url_for('calendar'))
        
        try:
            # Parse ICS file
            cal_content = file.read().decode('utf-8')
            cal = Calendar.from_ical(cal_content)
            import_count = _process_ical_events(cal)
            
            flash(f'Successfully imported {import_count} events', 'success')
        except Exception as e:
            flash(f'Error importing calendar: {str(e)}', 'danger')
            
    elif 'ics_url' in request.form and request.form['ics_url'].strip():
        url = request.form['ics_url'].strip()
        try:
            # Fetch ICS from URL
            response = requests.get(url)
            if response.status_code == 200:
                cal = Calendar.from_ical(response.text)
                import_count = _process_ical_events(cal)
                
                # Save feed for sync if requested
                if 'auto_sync' in request.form:
                    conn = get_db_connection()
                    conn.execute(
                        'INSERT INTO calendar_feeds (url, last_synced, auto_sync) VALUES (?, ?, ?)',
                        (url, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 1)
                    )
                    conn.commit()
                    conn.close()
                
                flash(f'Successfully imported {import_count} events from URL', 'success')
            else:
                flash(f'Error fetching calendar from URL: HTTP {response.status_code}', 'danger')
        except Exception as e:
            flash(f'Error importing calendar from URL: {str(e)}', 'danger')
    
    return redirect(url_for('calendar'))

def _process_ical_events(cal):
    """Process iCalendar events and add them to the database"""
    conn = get_db_connection()
    import_count = 0
    
    # Get optional category assignment
    category_id = request.form.get('category_id') or None
    
    for component in cal.walk():
        if component.name == "VEVENT":
            try:
                # Extract event details
                summary = str(component.get('summary', 'Imported Event'))
                start = component.get('dtstart').dt
                end = component.get('dtend').dt if component.get('dtend') else None
                location = str(component.get('location', ''))
                description = str(component.get('description', ''))
                
                # Determine if all-day event
                all_day = not isinstance(start, datetime)
                
                # Format dates and times
                if all_day:
                    event_date = start.strftime('%Y-%m-%d')
                    end_date = (end - timedelta(days=1)).strftime('%Y-%m-%d') if end else None
                    drop_off_time = None
                    pickup_time = None
                else:
                    event_date = start.strftime('%Y-%m-%d')
                    end_date = end.strftime('%Y-%m-%d') if end and end.date() != start.date() else None
                    drop_off_time = start.strftime('%H:%M')
                    pickup_time = end.strftime('%H:%M') if end else None
                
                # Insert event
                conn.execute(
                    '''INSERT INTO events 
                       (event_name, event_date, end_date, drop_off_time, pickup_time, 
                        event_location, notes, status, category_id, is_all_day, client_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (summary, event_date, end_date, drop_off_time, pickup_time, 
                     location, description, 'booked', category_id, 1 if all_day else 0, 
                     None)  # No client assigned for imported events
                )
                import_count += 1
            except Exception as e:
                print(f"Error importing event: {str(e)}")
                continue
    
    conn.commit()
    conn.close()
    return import_count

@app.route('/api/events')
@login_required
def api_events():
    """API endpoint to get all events for the calendar"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all events for calendar display
    cursor.execute('''
        SELECT e.*, c.name as client_name, c.color as client_color,
               cat.name as category_name, cat.color as category_color
        FROM events e 
        LEFT JOIN clients c ON e.client_id = c.id
        LEFT JOIN event_categories cat ON e.category_id = cat.id
        ORDER BY e.event_date
    ''')
    events = cursor.fetchall()
    
    # Check for conflicts if needed
    check_conflicts = request.args.get('check_conflicts', 'false') == 'true'
    if check_conflicts:
        for event in events:
            if event['has_conflicts']:
                # Get conflict details
                cursor.execute('''
                    SELECT ec.*, e.event_name, e.event_date, e.client_id, c.name as client_name
                    FROM event_conflicts ec
                    JOIN events e ON ec.conflicting_event_id = e.event_id
                    LEFT JOIN clients c ON e.client_id = c.id
                    WHERE ec.event_id = ? AND ec.resolved = 0
                ''', (event['event_id'],))
                
                conflicts = cursor.fetchall()
                event['conflicts'] = [dict(conflict) for conflict in conflicts]
    
    conn.close()
    
    # Format events for FullCalendar
    calendar_events = []
    for event in events:
        # Determine color priority: category_color > client_color > default
        event_color = event['category_color'] or event['client_color'] or '#3788d8'
        
        # Format event for FullCalendar
        calendar_event = {
            'id': event['event_id'],
            'title': event['event_name'],
            'start': event['event_date'],
            'backgroundColor': event_color,
            'borderColor': event_color,
            'textColor': '#ffffff',
            'extendedProps': {
                'client_id': event['client_id'],
                'client_name': event['client_name'],
                'location': event['event_location'],
                'status': event['status'],
                'has_conflicts': bool(event['has_conflicts']),
                'is_recurring': bool(event['is_recurring'])
            }
        }
        
        # Add end date for multi-day events
        if event['end_date'] and event['end_date'] != event['event_date']:
            # Add 1 day to end_date for FullCalendar (it uses exclusive end dates)
            end_date = datetime.strptime(event['end_date'], '%Y-%m-%d')
            end_date = end_date + timedelta(days=1)
            calendar_event['end'] = end_date.strftime('%Y-%m-%d')
        
        # Add times if this is not an all-day event
        if not event['is_all_day'] and event['drop_off_time']:
            calendar_event['start'] += f"T{event['drop_off_time']}"
            
            # Add end time/date
            if event['pickup_time']:
                if event['end_date'] and event['end_date'] != event['event_date']:
                    calendar_event['end'] = f"{event['end_date']}T{event['pickup_time']}"
                else:
                    calendar_event['end'] = f"{event['event_date']}T{event['pickup_time']}"
            
            calendar_event['allDay'] = False
        else:
            calendar_event['allDay'] = True
        
        # Add conflicts if available
        if check_conflicts and 'conflicts' in event:
            calendar_event['extendedProps']['conflicts'] = event['conflicts']
        
        calendar_events.append(calendar_event)
    
    return jsonify(calendar_events)

@app.route('/api/events/quick_add', methods=['POST'])
@login_required
def api_quick_add_event():
    """API endpoint to quickly add an event from the calendar"""
    try:
        # Extract form data
        title = request.form['title']
        event_date = request.form['event_date']
        client_id = request.form.get('client_id')
        category_id = request.form.get('category_id')
        location_id = request.form.get('location_id')
        
        # Basic validation
        if not title or not event_date:
            return jsonify({'success': False, 'message': 'Title and date are required'})
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get location details if provided
        location = None
        if location_id:
            location_result = cursor.execute(
                'SELECT * FROM locations WHERE id = ?', (location_id,)
            ).fetchone()
            if location_result:
                location = location_result['name']
        
        # Insert the event
        cursor.execute(
            '''INSERT INTO events 
               (event_name, event_date, client_id, category_id, event_location, status) 
               VALUES (?, ?, ?, ?, ?, ?)''',
            (title, event_date, client_id, category_id, location, 'booked')
        )
        
        # Get the new event ID
        event_id = cursor.lastrowid
        
        # If location is used, create a location usage record
        if location_id:
            cursor.execute(
                'INSERT INTO location_usage (location_id, event_id) VALUES (?, ?)',
                (location_id, event_id)
            )
        
        conn.commit()
        
        # Get the created event
        event = cursor.execute(
            '''SELECT e.*, c.name as client_name, c.color as client_color,
                   cat.name as category_name, cat.color as category_color
               FROM events e 
               LEFT JOIN clients c ON e.client_id = c.id
               LEFT JOIN event_categories cat ON e.category_id = cat.id
               WHERE e.event_id = ?''',
            (event_id,)
        ).fetchone()
        
        conn.close()
        
        # Format the event for the response
        event_color = event['category_color'] or event['client_color'] or '#3788d8'
        
        event_data = {
            'id': event['event_id'],
            'title': event['event_name'],
            'start': event['event_date'],
            'color': event_color,
            'allDay': True,
            'extended_props': {
                'client_id': event['client_id'],
                'client_name': event['client_name'],
                'location': event['event_location'],
                'status': event['status']
            }
        }
        
        return jsonify({'success': True, 'event': event_data})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/events/update_dates', methods=['POST'])
@login_required
def api_update_event_dates():
    """API endpoint to update event dates when dragged on calendar"""
    try:
        event_id = request.form['event_id']
        start_date = request.form['start_date']
        end_date = request.form.get('end_date')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the current event
        event = cursor.execute(
            'SELECT * FROM events WHERE event_id = ?', (event_id,)
        ).fetchone()
        
        if not event:
            conn.close()
            return jsonify({'success': False, 'message': 'Event not found'})
        
        # Handle recurring events
        if event['is_recurring'] and 'recurrence_edit' in request.form:
            recurrence_edit = request.form['recurrence_edit']
            
            if recurrence_edit == 'all':
                # Calculate date difference
                old_start = datetime.strptime(event['event_date'], '%Y-%m-%d')
                new_start = datetime.strptime(start_date, '%Y-%m-%d')
                date_diff = (new_start - old_start).days
                
                # Update all events in the series
                if event['parent_event_id']:
                    # This is a child event, update all children and parent
                    parent_id = event['parent_event_id']
                    
                    # Update the parent
                    cursor.execute(
                        '''UPDATE events 
                           SET event_date = date(event_date, ? || ' days'),
                               end_date = CASE WHEN end_date IS NOT NULL 
                                          THEN date(end_date, ? || ' days')
                                          ELSE NULL END
                           WHERE event_id = ?''',
                        (date_diff, date_diff, parent_id)
                    )
                    
                    # Update all children
                    cursor.execute(
                        '''UPDATE events 
                           SET event_date = date(event_date, ? || ' days'),
                               end_date = CASE WHEN end_date IS NOT NULL 
                                          THEN date(end_date, ? || ' days')
                                          ELSE NULL END
                           WHERE parent_event_id = ?''',
                        (date_diff, date_diff, parent_id)
                    )
                else:
                    # This is a parent event, update all children
                    cursor.execute(
                        '''UPDATE events 
                           SET event_date = date(event_date, ? || ' days'),
                               end_date = CASE WHEN end_date IS NOT NULL 
                                          THEN date(end_date, ? || ' days')
                                          ELSE NULL END
                           WHERE parent_event_id = ?''',
                        (date_diff, date_diff, event_id)
                    )
                    
                    # Also update this event
                    cursor.execute(
                        '''UPDATE events 
                           SET event_date = ?, end_date = ?
                           WHERE event_id = ?''',
                        (start_date, end_date, event_id)
                    )
            
            elif recurrence_edit == 'future':
                # Update this event and all future events
                if event['parent_event_id']:
                    # This is a child, detach it from the series
                    cursor.execute(
                        '''UPDATE events 
                           SET is_recurring = 0, parent_event_id = NULL
                           WHERE event_id = ?''',
                        (event_id,)
                    )
                    
                    # Also detach all future events
                    cursor.execute(
                        '''UPDATE events 
                           SET is_recurring = 0, parent_event_id = NULL
                           WHERE parent_event_id = ? AND event_date >= ?''',
                        (event['parent_event_id'], event['event_date'])
                    )
                else:
                    # This is a parent, update recurrence_end_date
                    cursor.execute(
                        '''UPDATE events 
                           SET recurrence_end_date = ?
                           WHERE event_id = ?''',
                        (datetime.strptime(event['event_date'], '%Y-%m-%d').strftime('%Y-%m-%d'), event_id)
                    )
                    
                    # Detach all events after current date
                    cursor.execute(
                        '''UPDATE events 
                           SET is_recurring = 0, parent_event_id = NULL
                           WHERE parent_event_id = ? AND event_date > ?''',
                        (event_id, event['event_date'])
                    )
                
                # Update this event's dates
                cursor.execute(
                    '''UPDATE events 
                       SET event_date = ?, end_date = ?
                       WHERE event_id = ?''',
                    (start_date, end_date, event_id)
                )
            
            else:  # single event
                # Just update this event
                cursor.execute(
                    '''UPDATE events 
                       SET event_date = ?, end_date = ?, is_recurring = 0, parent_event_id = NULL
                       WHERE event_id = ?''',
                    (start_date, end_date, event_id)
                )
        else:
            # Simple update for non-recurring events
            cursor.execute(
                'UPDATE events SET event_date = ?, end_date = ? WHERE event_id = ?',
                (start_date, end_date, event_id)
            )
        
        # Handle time updates if provided
        if 'start_time' in request.form and request.form['start_time']:
            cursor.execute(
                'UPDATE events SET drop_off_time = ?, is_all_day = 0 WHERE event_id = ?',
                (request.form['start_time'], event_id)
            )
        
        if 'end_time' in request.form and request.form['end_time']:
            cursor.execute(
                'UPDATE events SET pickup_time = ?, is_all_day = 0 WHERE event_id = ?',
                (request.form['end_time'], event_id)
            )
        
        # Check for conflicts
        # This is a simplified version - you would want more sophisticated conflict detection
        cursor.execute('''
            SELECT e1.event_id, e1.event_name, e1.client_id
            FROM events e1
            JOIN events e2 ON (
                e1.event_id != e2.event_id AND 
                (e1.event_date BETWEEN e2.event_date AND IFNULL(e2.end_date, e2.event_date) OR
                 IFNULL(e1.end_date, e1.event_date) BETWEEN e2.event_date AND IFNULL(e2.end_date, e2.event_date))
            )
            JOIN equipment_assignments ea1 ON e1.event_id = ea1.event_id
            JOIN equipment_assignments ea2 ON e2.event_id = ea2.event_id
            WHERE ea1.equipment_id = ea2.equipment_id
              AND e1.event_id = ?
            GROUP BY e1.event_id, e1.event_name, e1.client_id
        ''', (event_id,))
        
        conflicts = cursor.fetchall()
        
        # If conflicts found, mark the event
        if conflicts:
            cursor.execute(
                'UPDATE events SET has_conflicts = 1 WHERE event_id = ?',
                (event_id,)
            )
            
            # Record conflicts
            for conflict in conflicts:
                cursor.execute('''
                    INSERT OR IGNORE INTO event_conflicts 
                    (event_id, conflicting_event_id, conflict_type)
                    VALUES (?, ?, 'equipment')
                ''', (event_id, conflict['event_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'conflicts': [dict(c) for c in conflicts] if conflicts else []
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/events/check_conflicts', methods=['POST'])
@login_required
def api_check_event_conflicts():
    """API endpoint to check for conflicts when moving events"""
    try:
        event_id = request.form['event_id']
        start_date = request.form['start_date']
        end_date = request.form.get('end_date', start_date)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find equipment conflicts
        cursor.execute('''
            SELECT e2.event_id, e2.event_name, e2.event_date, e2.client_id, c.name as client_name,
                   'equipment' as conflict_type, e.name as equipment_name
            FROM events e1
            JOIN events e2 ON (
                e1.event_id != e2.event_id AND 
                e2.event_date <= ? AND (IFNULL(e2.end_date, e2.event_date) >= ?)
            )
            JOIN equipment_assignments ea1 ON e1.event_id = ea1.event_id
            JOIN equipment_assignments ea2 ON e2.event_id = ea2.event_id
            JOIN equipment e ON ea1.equipment_id = e.id
            LEFT JOIN clients c ON e2.client_id = c.id
            WHERE ea1.equipment_id = ea2.equipment_id
              AND e1.event_id = ?
        ''', (end_date, start_date, event_id))
        
        equipment_conflicts = cursor.fetchall()
        
        # Find location conflicts
        cursor.execute('''
            SELECT e2.event_id, e2.event_name, e2.event_date, e2.client_id, c.name as client_name,
                   'location' as conflict_type, e1.event_location as location_name
            FROM events e1
            JOIN events e2 ON (
                e1.event_id != e2.event_id AND 
                e2.event_date <= ? AND (IFNULL(e2.end_date, e2.event_date) >= ?) AND
                e1.event_location IS NOT NULL AND e1.event_location != '' AND
                e1.event_location = e2.event_location
            )
            LEFT JOIN clients c ON e2.client_id = c.id
            WHERE e1.event_id = ?
        ''', (end_date, start_date, event_id))
        
        location_conflicts = cursor.fetchall()
        
        conn.close()
        
        # Combine conflicts
        all_conflicts = [dict(c) for c in equipment_conflicts]
        all_conflicts.extend([dict(c) for c in location_conflicts])
        
        return jsonify({
            'success': True,
            'conflicts': all_conflicts
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e), 'conflicts': []})
```

**From app_location_routes.py:**
Add these routes before the `if __name__ == '__main__'` line in app.py:

```python
@app.route('/locations')
@login_required
def locations():
    """Display all venue locations"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all locations with usage count
    cursor.execute('''
        SELECT l.*, 
               (SELECT COUNT(*) FROM events WHERE event_location = l.name) as usage_count
        FROM locations l
        ORDER BY l.name
    ''')
    locations = cursor.fetchall()
    
    conn.close()
    
    return render_template('locations.html', locations=locations)

@app.route('/locations/new', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'staff')
def new_location():
    """Add a new venue location"""
    if request.method == 'POST':
        name = request.form['name']
        address = request.form['address']
        city = request.form['city']
        state = request.form['state']
        zip_code = request.form['zip']
        contact_name = request.form.get('contact_name', '')
        contact_phone = request.form.get('contact_phone', '')
        contact_email = request.form.get('contact_email', '')
        capacity = request.form.get('capacity', 0)
        notes = request.form.get('notes', '')
        
        conn = get_db_connection()
        
        # Check if location with this name already exists
        existing = conn.execute(
            'SELECT id FROM locations WHERE name = ?', (name,)
        ).fetchone()
        
        if existing:
            flash('A location with this name already exists', 'danger')
            conn.close()
            return render_template('new_location.html')
        
        # Insert the new location
        conn.execute('''
            INSERT INTO locations (
                name, address, city, state, zip, 
                contact_name, contact_phone, contact_email, 
                capacity, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name, address, city, state, zip_code,
            contact_name, contact_phone, contact_email,
            capacity, notes, session.get('user_id')
        ))
        
        conn.commit()
        conn.close()
        
        flash('Location added successfully', 'success')
        return redirect(url_for('locations'))
    
    return render_template('new_location.html')

@app.route('/locations/<int:location_id>')
@login_required
def view_location(location_id):
    """View a location's details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get location details
    cursor.execute('SELECT * FROM locations WHERE id = ?', (location_id,))
    location = cursor.fetchone()
    
    if not location:
        conn.close()
        flash('Location not found', 'danger')
        return redirect(url_for('locations'))
    
    # Get events at this location
    cursor.execute('''
        SELECT e.*, c.name as client_name
        FROM events e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.event_location = ?
        ORDER BY e.event_date DESC
    ''', (location['name'],))
    events = cursor.fetchall()
    
    conn.close()
    
    return render_template('view_location.html', location=location, events=events)

@app.route('/locations/<int:location_id>/edit', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'staff')
def edit_location(location_id):
    """Edit a location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get location details
    cursor.execute('SELECT * FROM locations WHERE id = ?', (location_id,))
    location = cursor.fetchone()
    
    if not location:
        conn.close()
        flash('Location not found', 'danger')
        return redirect(url_for('locations'))
    
    if request.method == 'POST':
        name = request.form['name']
        address = request.form['address']
        city = request.form['city']
        state = request.form['state']
        zip_code = request.form['zip']
        contact_name = request.form.get('contact_name', '')
        contact_phone = request.form.get('contact_phone', '')
        contact_email = request.form.get('contact_email', '')
        capacity = request.form.get('capacity', 0)
        notes = request.form.get('notes', '')
        
        # Check if another location with this name exists
        existing = conn.execute(
            'SELECT id FROM locations WHERE name = ? AND id != ?', 
            (name, location_id)
        ).fetchone()
        
        if existing:
            flash('Another location with this name already exists', 'danger')
            conn.close()
            return render_template('edit_location.html', location=location)
        
        # Update location
        conn.execute('''
            UPDATE locations SET
                name = ?, address = ?, city = ?, state = ?, zip = ?,
                contact_name = ?, contact_phone = ?, contact_email = ?,
                capacity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            name, address, city, state, zip_code,
            contact_name, contact_phone, contact_email,
            capacity, notes, location_id
        ))
        
        # Check if name has changed, if so update event references
        if name != location['name']:
            conn.execute(
                'UPDATE events SET event_location = ? WHERE event_location = ?',
                (name, location['name'])
            )
        
        conn.commit()
        conn.close()
        
        flash('Location updated successfully', 'success')
        return redirect(url_for('view_location', location_id=location_id))
    
    conn.close()
    return render_template('edit_location.html', location=location)

@app.route('/locations/<int:location_id>/delete', methods=['POST'])
@login_required
@role_required('admin', 'staff')
def delete_location(location_id):
    """Delete a location"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get location details
    cursor.execute('SELECT * FROM locations WHERE id = ?', (location_id,))
    location = cursor.fetchone()
    
    if not location:
        conn.close()
        flash('Location not found', 'danger')
        return redirect(url_for('locations'))
    
    # Check if this location is in use
    cursor.execute(
        'SELECT COUNT(*) as count FROM events WHERE event_location = ?',
        (location['name'],)
    )
    usage_count = cursor.fetchone()['count']
    
    if usage_count > 0:
        conn.close()
        flash(f'Cannot delete location that is used in {usage_count} events', 'danger')
        return redirect(url_for('view_location', location_id=location_id))
    
    # Delete the location
    conn.execute('DELETE FROM locations WHERE id = ?', (location_id,))
    conn.commit()
    conn.close()
    
    flash('Location deleted successfully', 'success')
    return redirect(url_for('locations'))

@app.route('/api/locations')
@login_required
def api_locations():
    """API endpoint to get all locations"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM locations ORDER BY name')
    locations = cursor.fetchall()
    
    conn.close()
    
    # Convert to list of dicts for JSON serialization
    locations_list = [dict(location) for location in locations]
    
    return jsonify(locations_list)
```

**From app_event_tasks_routes.py:**
Add these routes before the `if __name__ == '__main__'` line in app.py:

```python
@app.route('/events/<int:event_id>/tasks')
@login_required
def event_tasks(event_id):
    """View and manage tasks for an event"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get event details
    cursor.execute('''
        SELECT e.*, c.name as client_name 
        FROM events e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.event_id = ?
    ''', (event_id,))
    event = cursor.fetchone()
    
    if not event:
        conn.close()
        flash('Event not found', 'danger')
        return redirect(url_for('calendar'))
    
    # Get tasks for this event
    cursor.execute('''
        SELECT t.*, u.username as assigned_to_name
        FROM event_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.event_id = ?
        ORDER BY t.due_date, t.status
    ''', (event_id,))
    tasks = cursor.fetchall()
    
    # Get staff members for assignment
    cursor.execute('''
        SELECT id, username, full_name
        FROM users
        WHERE role IN ('admin', 'staff')
        ORDER BY username
    ''')
    staff = cursor.fetchall()
    
    # Calculate task completion percentage
    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task['status'] == 'completed')
    completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    conn.close()
    
    return render_template(
        'event_tasks.html', 
        event=event, 
        tasks=tasks, 
        staff=staff,
        completion_percentage=completion_percentage,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks
    )

@app.route('/events/<int:event_id>/tasks/add', methods=['POST'])
@login_required
def add_event_task(event_id):
    """Add a new task to an event"""
    conn = get_db_connection()
    
    # Verify event exists
    event = conn.execute('SELECT event_id FROM events WHERE event_id = ?', (event_id,)).fetchone()
    if not event:
        conn.close()
        flash('Event not found', 'danger')
        return redirect(url_for('calendar'))
    
    # Extract form data
    description = request.form['description']
    due_date = request.form['due_date'] or None
    assigned_to = request.form['assigned_to'] or None
    status = request.form.get('status', 'pending')
    
    if not description:
        flash('Task description is required', 'danger')
        return redirect(url_for('event_tasks', event_id=event_id))
    
    # Add the task
    conn.execute('''
        INSERT INTO event_tasks (
            event_id, description, status, due_date, 
            assigned_to, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ''', (
        event_id, description, status, due_date,
        assigned_to, session.get('user_id')
    ))
    
    conn.commit()
    conn.close()
    
    flash('Task added successfully', 'success')
    return redirect(url_for('event_tasks', event_id=event_id))

@app.route('/events/tasks/<int:task_id>/update', methods=['POST'])
@login_required
def update_event_task(task_id):
    """Update an event task"""
    conn = get_db_connection()
    
    # Verify task exists
    task = conn.execute('''
        SELECT t.*, e.event_id 
        FROM event_tasks t
        JOIN events e ON t.event_id = e.event_id
        WHERE t.id = ?
    ''', (task_id,)).fetchone()
    
    if not task:
        conn.close()
        flash('Task not found', 'danger')
        return redirect(url_for('calendar'))
    
    # Extract form data
    description = request.form['description']
    due_date = request.form['due_date'] or None
    assigned_to = request.form['assigned_to'] or None
    status = request.form['status']
    
    if not description:
        flash('Task description is required', 'danger')
        return redirect(url_for('event_tasks', event_id=task['event_id']))
    
    # Update the task
    conn.execute('''
        UPDATE event_tasks SET
            description = ?, status = ?, due_date = ?,
            assigned_to = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (description, status, due_date, assigned_to, task_id))
    
    conn.commit()
    conn.close()
    
    flash('Task updated successfully', 'success')
    return redirect(url_for('event_tasks', event_id=task['event_id']))

@app.route('/events/tasks/<int:task_id>/toggle', methods=['POST'])
@login_required
def toggle_task_status(task_id):
    """Toggle a task's status between 'pending' and 'completed'"""
    conn = get_db_connection()
    
    # Verify task exists
    task = conn.execute('''
        SELECT t.*, e.event_id 
        FROM event_tasks t
        JOIN events e ON t.event_id = e.event_id
        WHERE t.id = ?
    ''', (task_id,)).fetchone()
    
    if not task:
        conn.close()
        flash('Task not found', 'danger')
        return redirect(url_for('calendar'))
    
    # Toggle status
    new_status = 'completed' if task['status'] != 'completed' else 'pending'
    
    conn.execute(
        'UPDATE event_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (new_status, task_id)
    )
    
    conn.commit()
    conn.close()
    
    # For AJAX requests
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': True, 
            'task_id': task_id, 
            'new_status': new_status
        })
    
    flash('Task status updated', 'success')
    return redirect(url_for('event_tasks', event_id=task['event_id']))

@app.route('/events/tasks/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_event_task(task_id):
    """Delete an event task"""
    conn = get_db_connection()
    
    # Verify task exists and get event_id
    task = conn.execute('''
        SELECT t.event_id FROM event_tasks t
        WHERE t.id = ?
    ''', (task_id,)).fetchone()
    
    if not task:
        conn.close()
        flash('Task not found', 'danger')
        return redirect(url_for('calendar'))
    
    event_id = task['event_id']
    
    # Delete the task
    conn.execute('DELETE FROM event_tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    
    flash('Task deleted successfully', 'success')
    return redirect(url_for('event_tasks', event_id=event_id))

@app.route('/api/events/<int:event_id>/tasks')
@login_required
def api_event_tasks(event_id):
    """API endpoint to get tasks for an event"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify event exists
    event = cursor.execute(
        'SELECT event_id FROM events WHERE event_id = ?', (event_id,)
    ).fetchone()
    
    if not event:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    # Get tasks
    cursor.execute('''
        SELECT t.*, u.username as assigned_to_name
        FROM event_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.event_id = ?
        ORDER BY t.due_date, t.status
    ''', (event_id,))
    
    tasks = cursor.fetchall()
    conn.close()
    
    # Convert to list of dicts for JSON serialization
    tasks_list = [dict(task) for task in tasks]
    
    return jsonify(tasks_list)
```

### 3. Update app.py to Initialize Calendar Feeds Table

After adding the routes, add this function to your app.py file, at the end of your database setup section:

```python
def init_calendar_feeds_table():
    """Create the calendar_feeds table if it doesn't exist"""
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS calendar_feeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            last_synced TIMESTAMP NOT NULL,
            auto_sync INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
```

And call it in your setup_enhanced_features.py script.

## Quick Fix for BuildError

If you encounter a BuildError when accessing the calendar page before applying the full integration, you can use the app_patch.py file we've provided. This file contains minimal implementations of the required routes to make the calendar page load properly.

To apply the quick fix:

1. Copy the routes from app_patch.py to the end of your app.py file (before the `if __name__ == '__main__'` line)
2. This will provide temporary implementations of:
   - export_calendar
   - import_calendar
   - api_events
   - api_quick_add_event
   - api_update_event_dates
   - api_check_event_conflicts

These minimal routes will prevent errors while loading the calendar page, but you should replace them with the full implementations from app_calendar_routes.py when ready.

## Calendar Features

The enhanced calendar system provides:

### Multi-Day Events
- **Date Range Selection**: Create events spanning multiple days
- **Visual Display**: Clear indication of event duration on calendar
- **End Date Management**: Proper handling of event end dates

### Recurring Events
- **Pattern Options**: Support for daily, weekly, monthly, or yearly recurrence
- **End Date Specification**: Set when the recurrence should stop
- **Single/Series Editing**: Choose to edit one occurrence or the entire series

### Conflict Detection
- **Equipment Conflict Detection**: Alert when overlapping events use the same equipment
- **Location Conflict Detection**: Alert when overlapping events use the same venue
- **Visual Indicators**: Red highlighting for conflicting events
- **Conflict Resolution**: Tools to view and resolve scheduling conflicts

### Calendar Feeds
- **ICS Export**: Export calendar as an iCalendar file
- **ICS Import**: Import events from external calendar systems
- **Subscription URL**: Generate a URL for calendar apps to subscribe to

## Location Database

The location management system includes:

### Location Management
- **Location Directory**: Centralized repository of frequently used venues
- **Contact Information**: Store venue contact details, capacity, and notes
- **Address Information**: Full address information for venues

### Location Usage
- **Automatic Tracking**: Events automatically linked to location database entries
- **Usage History**: See all past and upcoming events at each location
- **Venue Analytics**: Track which venues are used most frequently

## Task Management

The task management system provides:

### Task Creation and Tracking
- **Task Assignments**: Assign tasks to specific staff members
- **Due Dates**: Set deadlines for task completion
- **Status Tracking**: Mark tasks as pending, in progress, or completed
- **Progress Visualization**: See overall completion percentage for event preparation

### Task Workflow
- **Quick Toggling**: One-click status changes for rapid updates
- **Filtering**: View tasks by status, assignee, or due date
- **Notifications**: Optional alerts for upcoming or overdue tasks

## Technical Documentation

### Database Schema

The enhanced event management system adds the following tables:

1. **locations**
   - id: INTEGER PRIMARY KEY
   - name: TEXT (unique venue name)
   - address: TEXT (street address)
   - city: TEXT
   - state: TEXT
   - zip: TEXT
   - contact_name: TEXT
   - contact_phone: TEXT
   - contact_email: TEXT
   - capacity: INTEGER (seating/standing capacity)
   - notes: TEXT
   - created_by: INTEGER (FK to users)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

2. **event_tasks**
   - id: INTEGER PRIMARY KEY
   - event_id: INTEGER (FK to events)
   - description: TEXT
   - status: TEXT ('pending', 'in_progress', 'completed')
   - due_date: DATE
   - assigned_to: INTEGER (FK to users)
   - created_by: INTEGER (FK to users)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

3. **event_conflicts**
   - id: INTEGER PRIMARY KEY
   - event_id: INTEGER (FK to events)
   - conflicting_event_id: INTEGER (FK to events)
   - conflict_type: TEXT ('equipment', 'location')
   - resolved: INTEGER (0/1)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

4. **calendar_feeds**
   - id: INTEGER PRIMARY KEY
   - url: TEXT
   - last_synced: TIMESTAMP
   - auto_sync: INTEGER (0/1)
   - created_at: TIMESTAMP

### Event Table Enhancements

The existing events table is enhanced with the following columns:

- end_date: DATE (for multi-day events)
- is_recurring: INTEGER (0/1)
- recurrence_pattern: TEXT ('daily', 'weekly', 'monthly', 'yearly')
- recurrence_end_date: DATE
- is_all_day: INTEGER (0/1)
- has_conflicts: INTEGER (0/1)
- parent_event_id: INTEGER (for recurring events)
- original_start_date: DATE (for moved recurring events)

### API Endpoints

The system provides the following API endpoints:

- GET /api/events - Get all events for the calendar
- POST /api/events/quick_add - Quickly add an event
- POST /api/events/update_dates - Update event dates when dragged
- POST /api/events/check_conflicts - Check for conflicts
- GET /api/locations - Get all locations
- GET /api/events/{event_id}/tasks - Get tasks for an event

## Contributing

When enhancing the system further, please follow these guidelines:

1. Maintain the separation of concerns in the route files
2. Add new SQL tables using the same pattern as existing add_*.py files
3. Follow the Flask application structure for new features
4. Keep templates consistent with the existing UI design