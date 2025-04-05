# Event Tasks Management Routes Blueprint
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, abort
from datetime import datetime

# Create the blueprint
tasks_bp = Blueprint('tasks', __name__, url_prefix='')

# Import helpers from the new helpers module
from helpers import get_db, login_required, role_required

# Event Tasks Management Routes
@tasks_bp.route('/events/<int:event_id>/tasks')
@login_required
def event_tasks(event_id):
    """View tasks for an event"""
    db = get_db()
    
    # Verify event exists and user has access
    event = db.execute(
        '''SELECT e.*, c.name as client_name 
           FROM events e 
           LEFT JOIN clients c ON e.client_id = c.id 
           WHERE e.event_id = ?''',
        (event_id,)
    ).fetchone()
    
    if event is None:
        abort(404)
    
    # Get tasks for this event
    tasks = db.execute(
        '''SELECT t.*, u.username as assigned_user 
           FROM event_tasks t 
           LEFT JOIN users u ON t.assigned_to = u.id 
           WHERE t.event_id = ? 
           ORDER BY t.is_completed, t.due_date''',
        (event_id,)
    ).fetchall()
    
    # Get all users for assignment dropdown
    users = db.execute('SELECT id, username, full_name FROM users ORDER BY username').fetchall()
    
    # Calculate completion percentage
    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task['is_completed'])
    completion_percentage = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    
    return render_template(
        'event_tasks.html', 
        event=event, 
        tasks=tasks, 
        users=users,
        completion_percentage=completion_percentage,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks
    )

@tasks_bp.route('/events/<int:event_id>/tasks/add', methods=['POST'])
@login_required
def add_event_task(event_id):
    """Add a new task to an event"""
    db = get_db()
    
    # Verify event exists
    event = db.execute('SELECT event_id FROM events WHERE event_id = ?', (event_id,)).fetchone()
    if event is None:
        abort(404)
    
    description = request.form['description']
    due_date = request.form.get('due_date', '')
    assigned_to = request.form.get('assigned_to', '') or None
    
    error = None
    if not description:
        error = 'Task description is required'
    
    if error is not None:
        flash(error, 'danger')
    else:
        db.execute(
            '''INSERT INTO event_tasks 
               (event_id, description, due_date, assigned_to) 
               VALUES (?, ?, ?, ?)''',
            (event_id, description, due_date, assigned_to)
        )
        db.commit()
        flash('Task added successfully', 'success')
    
    return redirect(url_for('tasks_bp.event_tasks', event_id=event_id))

@tasks_bp.route('/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    """Mark a task as completed or uncompleted"""
    db = get_db()
    
    # Get the task
    task = db.execute('SELECT * FROM event_tasks WHERE id = ?', (task_id,)).fetchone()
    if task is None:
        abort(404)
    
    # Toggle completion status
    is_completed = not bool(task['is_completed'])
    
    db.execute(
        'UPDATE event_tasks SET is_completed = ? WHERE id = ?',
        (1 if is_completed else 0, task_id)
    )
    db.commit()
    
    # If responding to AJAX request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'success': True, 'is_completed': is_completed})
    
    # Otherwise redirect back to tasks page
    return redirect(url_for('tasks_bp.event_tasks', event_id=task['event_id']))

@tasks_bp.route('/tasks/<int:task_id>/edit', methods=['POST'])
@login_required
def edit_task(task_id):
    """Edit a task"""
    db = get_db()
    
    # Get the task
    task = db.execute('SELECT * FROM event_tasks WHERE id = ?', (task_id,)).fetchone()
    if task is None:
        abort(404)
    
    description = request.form['description']
    due_date = request.form.get('due_date', '')
    assigned_to = request.form.get('assigned_to', '') or None
    
    error = None
    if not description:
        error = 'Task description is required'
    
    if error is not None:
        flash(error, 'danger')
    else:
        db.execute(
            '''UPDATE event_tasks 
               SET description = ?, due_date = ?, assigned_to = ? 
               WHERE id = ?''',
            (description, due_date, assigned_to, task_id)
        )
        db.commit()
        flash('Task updated successfully', 'success')
    
    return redirect(url_for('tasks_bp.event_tasks', event_id=task['event_id']))

@tasks_bp.route('/tasks/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    """Delete a task"""
    db = get_db()
    
    # Get the task to find the associated event
    task = db.execute('SELECT event_id FROM event_tasks WHERE id = ?', (task_id,)).fetchone()
    if task is None:
        abort(404)
    
    event_id = task['event_id']
    
    db.execute('DELETE FROM event_tasks WHERE id = ?', (task_id,))
    db.commit()
    
    flash('Task deleted successfully', 'success')
    return redirect(url_for('tasks_bp.event_tasks', event_id=event_id))

# API endpoint to get tasks for an event
@tasks_bp.route('/api/events/<int:event_id>/tasks')
@login_required
def api_event_tasks(event_id):
    """API endpoint to get tasks for an event"""
    db = get_db()
    
    # Verify event exists
    event = db.execute('SELECT event_id FROM events WHERE event_id = ?', (event_id,)).fetchone()
    if event is None:
        return jsonify({"error": "Event not found"}), 404
    
    # Get tasks
    tasks = db.execute(
        '''SELECT t.*, u.username as assigned_user 
           FROM event_tasks t 
           LEFT JOIN users u ON t.assigned_to = u.id 
           WHERE t.event_id = ? 
           ORDER BY t.is_completed, t.due_date''',
        (event_id,)
    ).fetchall()
    
    # Convert to list of dicts for JSON serialization
    tasks_list = []
    for task in tasks:
        task_dict = dict(task)
        
        # Format dates for display
        if task['due_date']:
            due_date = datetime.strptime(task['due_date'], '%Y-%m-%d')
            task_dict['due_date_formatted'] = due_date.strftime('%b %d, %Y')
        
        tasks_list.append(task_dict)
    
    return jsonify(tasks_list)

@tasks_bp.route('/api/tasks/<int:task_id>/toggle', methods=['POST'])
@login_required
def api_toggle_task(task_id):
    """API endpoint to toggle task completion status"""
    db = get_db()
    
    # Get the task
    task = db.execute('SELECT * FROM event_tasks WHERE id = ?', (task_id,)).fetchone()
    if task is None:
        return jsonify({"error": "Task not found"}), 404
    
    # Toggle completion status
    is_completed = not bool(task['is_completed'])
    
    db.execute(
        'UPDATE event_tasks SET is_completed = ? WHERE id = ?',
        (1 if is_completed else 0, task_id)
    )
    db.commit()
    
    # Get updated task list for the event
    tasks = db.execute(
        'SELECT * FROM event_tasks WHERE event_id = ?',
        (task['event_id'],)
    ).fetchall()
    
    # Calculate new completion percentage
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t['is_completed'])
    completion_percentage = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    
    return jsonify({
        'success': True, 
        'is_completed': is_completed,
        'completion_percentage': completion_percentage
    })

# Context processor for task count
def task_count_processor():
    """Add function to templates to count tasks for an event"""
    def get_event_tasks_count(event_id):
        db = get_db()
        counts = db.execute(
            '''SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
               FROM event_tasks 
               WHERE event_id = ?''',
            (event_id,)
        ).fetchone()
        
        return {
            'total': counts['total'] or 0,
            'completed': counts['completed'] or 0
        }
    
    return dict(get_event_tasks_count=get_event_tasks_count)