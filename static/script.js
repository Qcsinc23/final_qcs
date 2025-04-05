// JavaScript for QCS Event Management Application

document.addEventListener('DOMContentLoaded', function() {
    // Apply client colors to badges
    applyClientColors();
    
    // Calendar initialization moved to dedicated calendar.js
    
    // Setup event listeners
    setupEventListeners();
});

// Apply colors to client badges based on data-color attribute
function applyClientColors() {
    const clientBadges = document.querySelectorAll('.client-badge');
    
    clientBadges.forEach(badge => {
        const color = badge.getAttribute('data-color');
        if (color) {
            badge.style.backgroundColor = color;
        }
    });
}

// Note: initializeCalendar function removed - now using the dedicated calendar.js implementation

// Setup various event listeners
function setupEventListeners() {
    // Delete confirmation
    const deleteButtons = document.querySelectorAll('.delete-event-btn');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this event?')) {
                e.preventDefault();
            }
        });
    });
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-important)');
    
    alerts.forEach(alert => {
        setTimeout(() => {
            const closeButton = alert.querySelector('.btn-close');
            if (closeButton) {
                closeButton.click();
            }
        }, 5000);
    });
    
    // Toggle invoice details
    const toggleButtons = document.querySelectorAll('.toggle-details-btn');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                if (targetElement.classList.contains('d-none')) {
                    targetElement.classList.remove('d-none');
                    this.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
                } else {
                    targetElement.classList.add('d-none');
                    this.innerHTML = '<i class="fas fa-chevron-down"></i> Show Details';
                }
            }
        });
    });
    
    // New event form validation
    const newEventForm = document.getElementById('newEventForm');
    
    if (newEventForm) {
        newEventForm.addEventListener('submit', function(e) {
            const title = document.getElementById('title').value;
            const client = document.getElementById('client_id').value;
            const eventDate = document.getElementById('event_date').value;
            
            if (!title || !client || !eventDate) {
                e.preventDefault();
                
                // Show validation message
                const alertBox = document.createElement('div');
                alertBox.className = 'alert alert-danger alert-dismissible fade show mt-3';
                alertBox.innerHTML = `
                    <strong>Error!</strong> Please fill in all required fields.
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                // Insert alert at the top of the form
                newEventForm.insertBefore(alertBox, newEventForm.firstChild);
            }
        });
    }
}

// Helper function to format date (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Helper function to format time (HH:MM)
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
}