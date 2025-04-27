// JavaScript for QCS Event Management Application

document.addEventListener('DOMContentLoaded', function() {
    // Apply client colors to badges
    applyClientColors();

    // Calendar initialization moved to dedicated calendar.js

    // Setup event listeners
    setupEventListeners();

    // Login form validation
    const loginForm = document.querySelector('.auth-form form'); // Select the form within auth-form

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            if (!usernameInput.value || !passwordInput.value) {
                e.preventDefault();

                // Show validation message
                const alertBox = document.createElement('div');
                alertBox.className = 'alert alert-danger alert-dismissible fade show mt-3';
                alertBox.innerHTML = `
                    <strong>Error!</strong> Please enter both username and password.
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;

                // Remove any existing alerts before adding a new one
                const existingAlert = loginForm.querySelector('.alert');
                if (existingAlert) {
                    existingAlert.remove();
                }

                // Insert alert at the top of the form
                loginForm.insertBefore(alertBox, loginForm.firstChild);
            }
        });
    }

    // Registration form validation
    const registerForm = document.querySelector('.auth-form form'); // Select the form within auth-form

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const usernameInput = document.getElementById('username');
            const fullNameInput = document.getElementById('full_name');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm_password');

            // Remove any existing alerts before adding a new one
            const existingAlert = registerForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!usernameInput.value || !fullNameInput.value || !emailInput.value || !passwordInput.value || !confirmPasswordInput.value) {
                e.preventDefault();
                displayFormError(registerForm, 'Please fill in all required fields.');
            } else if (passwordInput.value !== confirmPasswordInput.value) {
                e.preventDefault();
                displayFormError(registerForm, 'Passwords do not match!');
            }
        });
    }
});

// Helper function to display form errors
function displayFormError(formElement, message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'alert alert-danger alert-dismissible fade show mt-3';
    alertBox.innerHTML = `
        <strong>Error!</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    formElement.insertBefore(alertBox, formElement.firstChild);
}


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
    // Delete confirmation using modal
    const deleteButtons = document.querySelectorAll('.delete-event-btn, .delete-item-btn'); // Select all delete buttons
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    let itemToDeleteUrl = ''; // Variable to store the URL of the item to delete

    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent the default link behavior
            itemToDeleteUrl = this.href; // Store the URL from the button's href
            deleteModal.show(); // Show the confirmation modal
        });
    });

    // Handle click on the modal's Delete button
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (itemToDeleteUrl) {
                window.location.href = itemToDeleteUrl; // Navigate to the delete URL
            }
        });
    }

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

    // Show loading indicator on form submission
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            showLoading();
        });
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
            const eventNameInput = document.getElementById('event_name');
            const clientSelect = document.getElementById('client_id');
            const eventDateInput = document.getElementById('event_date');

            // Remove any existing alerts before adding a new one
            const existingAlert = newEventForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!eventNameInput.value) {
                e.preventDefault();
                displayFormError(newEventForm, 'Please enter an event title.');
            } else if (!clientSelect.value) {
                e.preventDefault();
                displayFormError(newEventForm, 'Please select a client.');
            } else if (!eventDateInput.value) {
                e.preventDefault();
                displayFormError(newEventForm, 'Please select a start date.');
            }
        });
    }

    // Edit event form validation
    const editEventForm = document.querySelector('form[action*="/edit_event/"]'); // Select form with action containing /edit_event/

    if (editEventForm) {
        editEventForm.addEventListener('submit', function(e) {
            const eventNameInput = document.getElementById('event_name');
            const clientSelect = document.getElementById('client_id');
            const statusSelect = document.getElementById('status');
            const eventDateInput = document.getElementById('event_date');

            // Remove any existing alerts before adding a new one
            const existingAlert = editEventForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!eventNameInput.value) {
                e.preventDefault();
                displayFormError(editEventForm, 'Please enter an event title.');
            } else if (!clientSelect.value) {
                e.preventDefault();
                displayFormError(editEventForm, 'Please select a client.');
            } else if (!statusSelect.value) {
                e.preventDefault();
                displayFormError(editEventForm, 'Please select a status.');
            } else if (!eventDateInput.value) {
                e.preventDefault();
                displayFormError(editEventForm, 'Please select a start date.');
            }
        });
    }
}

// New client form validation
const newClientForm = document.querySelector('form[action*="/clients/new"]');

    if (newClientForm) {
        newClientForm.addEventListener('submit', function(e) {
            const nameInput = document.getElementById('name');
            const colorInput = document.getElementById('color');

            // Remove any existing alerts before adding a new one
            const existingAlert = newClientForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!nameInput.value) {
                e.preventDefault();
                displayFormError(newClientForm, 'Please enter a client name.');
            } else if (!colorInput.value) {
                e.preventDefault();
                displayFormError(newClientForm, 'Please select a calendar color.');
            }
        });
    }

    // Edit client form validation
    const editClientForm = document.querySelector('form[action*="/clients/edit/"]');

    if (editClientForm) {
        editClientForm.addEventListener('submit', function(e) {
            const nameInput = document.getElementById('name');
            const colorInput = document.getElementById('color');

            // Remove any existing alerts before adding a new one
            const existingAlert = editClientForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!nameInput.value) {
                e.preventDefault();
                displayFormError(editClientForm, 'Please enter a client name.');
            } else if (!colorInput.value) {
                e.preventDefault();
                displayFormError(editClientForm, 'Please select a calendar color.');
            }
        });
    }

    // New category form validation
    const newCategoryForm = document.getElementById('newCategoryForm');

    if (newCategoryForm) {
        newCategoryForm.addEventListener('submit', function(e) {
            const nameInput = document.getElementById('name');
            const colorInput = document.getElementById('color');
            let valid = true;

            // Remove any existing alerts before adding a new one
            const existingAlert = newCategoryForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!nameInput.value.trim()) {
                valid = false;
                displayFormError(newCategoryForm, 'Please enter a category name.');
                nameInput.classList.add('is-invalid');
            } else {
                nameInput.classList.remove('is-invalid');
            }

            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(colorInput.value)) {
                 if (valid) { // Only display color error if no name error
                    displayFormError(newCategoryForm, 'Please select a valid color.');
                 }
                valid = false;
                colorInput.classList.add('is-invalid');
            } else {
                colorInput.classList.remove('is-invalid');
            }

            if (!valid) {
                e.preventDefault();
            }
        });
    }

    // Edit category form validation
    const editCategoryForm = document.querySelector('form[action*="/categories/edit/"]');

    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', function(e) {
            const nameInput = document.getElementById('name');
            const colorInput = document.getElementById('color');
            let valid = true;

            // Remove any existing alerts before adding a new one
            const existingAlert = editCategoryForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            if (!nameInput.value.trim()) {
                valid = false;
                displayFormError(editCategoryForm, 'Please enter a category name.');
                nameInput.classList.add('is-invalid');
            } else {
                nameInput.classList.remove('is-invalid');
            }

            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(colorInput.value)) {
                 if (valid) { // Only display color error if no name error
                    displayFormError(editCategoryForm, 'Please select a valid color.');
                 }
                valid = false;
                colorInput.classList.add('is-invalid');
            } else {
                colorInput.classList.remove('is-invalid');
            }

            if (!valid) {
                e.preventDefault();
            }
        });
    }


// Helper function to format date (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// New element type form validation
const newElementTypeForm = document.querySelector('form[action*="/element_types/new"]');

if (newElementTypeForm) {
    newElementTypeForm.addEventListener('submit', function(e) {
        const typeNameInput = document.getElementById('type_name');

        // Remove any existing alerts before adding a new one
        const existingAlert = newElementTypeForm.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        if (!typeNameInput.value.trim()) {
            e.preventDefault();
            displayFormError(newElementTypeForm, 'Please enter an element type name.');
            typeNameInput.classList.add('is-invalid');
        } else {
            typeNameInput.classList.remove('is-invalid');
        }
    });
}

// Edit element type form validation
const editElementTypeForm = document.querySelector('form[action*="/element_types/edit/"]');

if (editElementTypeForm) {
    editElementTypeForm.addEventListener('submit', function(e) {
        const typeNameInput = document.getElementById('type_name');

        // Remove any existing alerts before adding a new one
        const existingAlert = editElementTypeForm.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        if (!typeNameInput.value.trim()) {
            e.preventDefault();
            displayFormError(editElementTypeForm, 'Please enter an element type name.');
            typeNameInput.classList.add('is-invalid');
        } else {
            typeNameInput.classList.remove('is-invalid');
        }
    });
}


// New element form validation
const newElementForm = document.querySelector('form[action*="/elements/new"]');

if (newElementForm) {
    newElementForm.addEventListener('submit', function(e) {
        const typeIdInput = document.getElementById('type_id');
        const itemDescriptionInput = document.getElementById('item_description');
        const quantityInput = document.getElementById('quantity');
        const locationInput = document.getElementById('location');
        let valid = true;

        // Remove any existing alerts before adding a new one
        const existingAlert = newElementForm.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        if (!typeIdInput.value) {
            valid = false;
            displayFormError(newElementForm, 'Please select an element type.');
            typeIdInput.classList.add('is-invalid');
        } else {
            typeIdInput.classList.remove('is-invalid');
        }

        if (!itemDescriptionInput.value.trim()) {
            valid = false;
            displayFormError(newElementForm, 'Please enter an item description.');
            itemDescriptionInput.classList.add('is-invalid');
        } else {
            itemDescriptionInput.classList.remove('is-invalid');
        }

        if (quantityInput.value === '' || parseInt(quantityInput.value) < 0) {
            valid = false;
            displayFormError(newElementForm, 'Please enter a valid quantity.');
            quantityInput.classList.add('is-invalid');
        } else {
            quantityInput.classList.remove('is-invalid');
        }

        if (!locationInput.value.trim()) {
            valid = false;
            displayFormError(newElementForm, 'Please enter a storage location.');
            locationInput.classList.add('is-invalid');
        } else {
            locationInput.classList.remove('is-invalid');
        }

        if (!valid) {
            e.preventDefault();
        }
    });
}

// Edit element form validation
const editElementForm = document.querySelector('form[action*="/elements/edit/"]');

if (editElementForm) {
    editElementForm.addEventListener('submit', function(e) {
        const typeIdInput = document.getElementById('type_id');
        const itemDescriptionInput = document.getElementById('item_description');
        const quantityInput = document.getElementById('quantity');
        const locationInput = document.getElementById('location');
        let valid = true;

        // Remove any existing alerts before adding a new one
        const existingAlert = editElementForm.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        if (!typeIdInput.value) {
            valid = false;
            displayFormError(editElementForm, 'Please select an element type.');
            typeIdInput.classList.add('is-invalid');
        } else {
            typeIdInput.classList.remove('is-invalid');
        }

        if (!itemDescriptionInput.value.trim()) {
            valid = false;
            displayFormError(editElementForm, 'Please enter an item description.');
            itemDescriptionInput.classList.add('is-invalid');
        } else {
            itemDescriptionInput.classList.remove('is-invalid');
        }

        if (quantityInput.value === '' || parseInt(quantityInput.value) < 0) {
            valid = false;
            displayFormError(editElementForm, 'Please enter a valid quantity.');
            quantityInput.classList.add('is-invalid');
        } else {
            quantityInput.classList.remove('is-invalid');
        }

        if (!locationInput.value.trim()) {
            valid = false;
            displayFormError(editElementForm, 'Please enter a storage location.');
            locationInput.classList.add('is-invalid');
        } else {
            locationInput.classList.remove('is-invalid');
        }

        if (!valid) {
            e.preventDefault();
        }
    });
}


// Helper function to format time (HH:MM)
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

// Show loading overlay
function showLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}
