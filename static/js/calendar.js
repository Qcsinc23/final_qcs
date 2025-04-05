document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const calendarEl = document.getElementById('calendar');
    const eventDetailsSidebar = document.getElementById('eventDetailsSidebar');
    const eventDetailsContent = eventDetailsSidebar.querySelector('.event-details-content');
    const closeEventDetailsBtn = document.getElementById('closeEventDetails');
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersToggleBtn = document.getElementById('filtersToggle'); // Button in header
    const closeFiltersBtn = document.getElementById('closeFilters');
    const eventTooltip = document.createElement('div'); // Create tooltip dynamically
    eventTooltip.id = 'eventTooltip';
    eventTooltip.className = 'event-tooltip'; // Use class from style.css
    document.body.appendChild(eventTooltip);
    const calendarLoading = document.getElementById('calendarLoading');
    const showConflictsOnly = document.getElementById('showConflictsOnly'); // Assuming this still exists in filter panel

    // Helper function to format duration
    function formatDuration(start, end) {
        const diffMs = end - start;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        let durationStr = '';
        if (diffHrs > 0) durationStr += `${diffHrs}h `;
        if (diffMins > 0) durationStr += `${diffMins}m`;
        return durationStr.trim();
    }

    // Initialize calendar with enhanced options
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        views: {
            timeGridDay: { dayMaxEventRows: false, dayMinWidth: 200 },
            timeGridWeek: { dayMaxEventRows: 6, dayMinWidth: 120 }
        },
        businessHours: { daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' },
        nowIndicator: true,
        navLinks: true,
        dayMaxEvents: true,
        weekNumbers: true,
        weekNumberCalculation: 'ISO',
        editable: true,
        selectable: true,
        events: function(fetchInfo, successCallback, failureCallback) {
            // Show loading indicator
            if (calendarLoading) calendarLoading.classList.add('show');

            var categoryFilters = Array.from(document.querySelectorAll('.category-filter:checked')).map(cb => cb.value);
            var statusFilters = Array.from(document.querySelectorAll('.status-filter:checked')).map(cb => cb.value);
            var clientFilter = document.querySelector('.client-filter')?.value;
            var showOnlyConflicts = document.getElementById('showConflictsOnly')?.checked;

            var url = new URL('/api/events', window.location.origin);
            url.searchParams.append('start', fetchInfo.startStr);
            url.searchParams.append('end', fetchInfo.endStr);
            if (categoryFilters.length > 0) url.searchParams.append('categories', categoryFilters.join(','));
            if (statusFilters.length > 0) url.searchParams.append('statuses', statusFilters.join(','));
            if (clientFilter && clientFilter !== 'all') url.searchParams.append('client_id', clientFilter);
            if (showOnlyConflicts) url.searchParams.append('conflicts_only', 'true');

            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => successCallback(data))
                .catch(error => {
                    console.error('Error fetching events:', error);
                    showToast('Failed to load events.', 'error');
                    failureCallback(error);
                })
                .finally(() => {
                     // Hide loading indicator with delay
                    if (calendarLoading) {
                        setTimeout(() => calendarLoading.classList.remove('show'), 150);
                    }
                });
        },

        // Enhanced event click handler - Opens Sidebar
        eventClick: function(info) {
            info.jsEvent.preventDefault(); // Prevent browser navigation

            const event = info.event;
            const eventId = event.id;
            const extendedProps = event.extendedProps || {};

            // Format dates/times nicely
            const startStr = event.start ? event.start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
            const endStr = event.end ? event.end.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
            const durationStr = event.start && event.end ? formatDuration(event.start, event.end) : '';

            // Build details HTML for the sidebar
            let detailsHTML = `
                <h4>${event.title}</h4>
                <hr class="my-3">
                <div class="mb-2"><i class="fas fa-calendar-alt fa-fw me-2 text-muted"></i>${startStr}${endStr && endStr !== startStr ? ` - ${endStr}` : ''} ${durationStr ? `(${durationStr})` : ''}</div>
                ${extendedProps.client_name ? `<div class="mb-2"><i class="fas fa-user fa-fw me-2 text-muted"></i>${extendedProps.client_name}</div>` : ''}
                ${extendedProps.location ? `<div class="mb-2"><i class="fas fa-map-marker-alt fa-fw me-2 text-muted"></i>${extendedProps.location}</div>` : ''}
                ${extendedProps.category_name ? `<div class="mb-2"><i class="fas fa-tag fa-fw me-2 text-muted"></i><span class="badge" style="background-color:${extendedProps.category_color || 'var(--gray-500)'}; color: white;">${extendedProps.category_name}</span></div>` : ''}
                ${extendedProps.status ? `<div class="mb-2"><i class="fas fa-info-circle fa-fw me-2 text-muted"></i><span class="badge bg-${getStatusBadgeClass(extendedProps.status)}">${formatStatus(extendedProps.status)}</span></div>` : ''}
                ${extendedProps.is_recurring ? `<div class="mb-2"><i class="fas fa-sync-alt fa-fw me-2 text-muted"></i><span class="badge bg-info">Recurring Event</span></div>` : ''}
                ${extendedProps.description ? `<div class="mt-3"><p>${extendedProps.description.replace(/\n/g, '<br>')}</p></div>` : ''}
            `;

            // Add conflict warning if needed
            if (extendedProps.has_conflicts) {
                detailsHTML += `<div class="mt-3 alert alert-danger d-flex align-items-center py-2"><i class="fas fa-exclamation-triangle fa-fw me-2"></i> Scheduling Conflict Detected</div>`;
                showToast('Scheduling conflict detected for this event.', 'warning');
            }

            // Add action buttons
            detailsHTML += `
                <div class="mt-4 d-grid gap-2">
                    <a href="/events/${eventId}" class="btn btn-primary"><i class="fas fa-eye me-1"></i>View Full Details</a>
                    <a href="/events/${eventId}/edit" class="btn btn-outline-secondary"><i class="fas fa-edit me-1"></i>Edit Event</a>
                </div>
            `;

            // Populate and open the sidebar
            eventDetailsContent.innerHTML = detailsHTML;
            if (filtersPanel.classList.contains('show')) {
                closeSidebar(filtersPanel);
            }
            openSidebar(eventDetailsSidebar);
        },

        // Enhanced Tooltip Logic
        eventMouseEnter: function(info) {
            const event = info.event;
            const extendedProps = event.extendedProps || {};
            const el = info.el;

            let tooltipHTML = `<div class="event-tooltip-title">${event.title}</div>`;
            const timeStr = event.start ? event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
            tooltipHTML += `<div class="event-tooltip-meta"><i class="far fa-clock fa-fw"></i> ${timeStr}</div>`;
            if (extendedProps.location) {
                tooltipHTML += `<div class="event-tooltip-meta"><i class="fas fa-map-marker-alt fa-fw"></i> ${extendedProps.location}</div>`;
            }
            if (extendedProps.status) {
                tooltipHTML += `<div class="event-tooltip-meta"><i class="fas fa-info-circle fa-fw"></i> <span class="badge bg-${getStatusBadgeClass(extendedProps.status)}">${formatStatus(extendedProps.status)}</span></div>`;
            }

            eventTooltip.innerHTML = tooltipHTML;

            // Use Popper.js if available
            if (typeof Popper !== 'undefined') {
                Popper.createPopper(el, eventTooltip, {
                    placement: 'top',
                    modifiers: [ { name: 'offset', options: { offset: [0, 8] } }, { name: 'preventOverflow', options: { padding: 10 } } ],
                });
            } else { // Basic fallback
                const rect = el.getBoundingClientRect();
                const tooltipRect = eventTooltip.getBoundingClientRect();
                let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
                let top = rect.top + window.scrollY - tooltipRect.height - 5;
                if (left < 0) left = 5;
                if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 5;
                if (top < window.scrollY) top = rect.bottom + window.scrollY + 5;
                eventTooltip.style.left = `${left}px`;
                eventTooltip.style.top = `${top}px`;
            }
            eventTooltip.classList.add('show');
        },

        eventMouseLeave: function(info) {
            eventTooltip.classList.remove('show');
        },

        // Drag and drop functionality
        eventDrop: function(info) {
            var event = info.event;
            var eventId = event.id;
            var newStart = event.start;
            var newEnd = event.end;

            var startDate = newStart.toISOString().split('T')[0];
            var startTime = newStart.toTimeString().split(' ')[0]; // HH:MM:SS
            var endDate = newEnd ? newEnd.toISOString().split('T')[0] : startDate; // Use start date if no end
            var endTime = newEnd ? newEnd.toTimeString().split(' ')[0] : startTime;

            var isRecurring = event.extendedProps && event.extendedProps.is_recurring;

            if (isRecurring) {
                showMoveEventModal(eventId, event.title, startDate, endDate, startTime, endTime, true);
            } else {
                updateEventDates(eventId, startDate, endDate, startTime, endTime);
            }
        },

        // Date selection for quick event creation
        select: function(info) {
            var startDate = info.startStr;
            if (startDate.includes('T')) startDate = startDate.split('T')[0];
            document.getElementById('quickEventDate').value = startDate;
            var quickEventModal = new bootstrap.Modal(document.getElementById('quickEventModal'));
            quickEventModal.show();
        },

        eventDidMount: function(info) {
            var event = info.event;
            var element = info.el;
            if (event.extendedProps.has_conflicts) element.classList.add('event-conflict');
            // Add recurring icon if needed (simplified)
            if (event.extendedProps.is_recurring && element.querySelector('.fc-event-title')) {
                 element.querySelector('.fc-event-title').innerHTML += ' <i class="fas fa-sync-alt" style="font-size: 0.8em;"></i>';
            }
        },

        loading: function(isLoading) {
            // Toggle loading overlay with fade effect using class
            if (calendarLoading) {
                if (isLoading) {
                    calendarLoading.classList.add('show');
                } else {
                    setTimeout(() => calendarLoading.classList.remove('show'), 150);
                }
            }
        }
    });

    calendar.render();

    // Filter panel toggle functionality
    if (filtersToggleBtn && filtersPanel && closeFiltersBtn) {
        // Apply filters when inputs change
        const filterInputs = filtersPanel.querySelectorAll('.category-filter, .status-filter, .client-filter, #showConflictsOnly');
        filterInputs.forEach(input => {
            input.addEventListener('change', () => calendar.refetchEvents());
        });
    }

    // Quick Event Form Submission
    var quickEventForm = document.getElementById('quickEventForm');
    if (quickEventForm) {
        quickEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitButton = quickEventForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
            }

            var formData = new FormData(quickEventForm);
            fetch('/api/events/quick_add', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        bootstrap.Modal.getInstance(document.getElementById('quickEventModal'))?.hide();
                        calendar.refetchEvents();
                        showToast('Event created successfully', 'success');
                        quickEventForm.reset();
                    } else {
                        showToast(data.message || 'Error creating event', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('An error occurred while creating the event', 'error');
                })
                .finally(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-plus me-1"></i>Create Event';
                    }
                });
        });
    }

    // Move Event Form Submission
    var moveEventForm = document.getElementById('moveEventForm');
    if (moveEventForm) {
        moveEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitButton = moveEventForm.querySelector('button[type="submit"]');
             if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
            }

            var formData = new FormData(moveEventForm);
            var eventId = formData.get('event_id');

            fetch('/api/events/update_dates', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        bootstrap.Modal.getInstance(document.getElementById('moveEventModal'))?.hide();
                        calendar.refetchEvents();
                        showToast('Event updated successfully', 'success');
                        if (data.has_conflicts) {
                            showToast(`Event "${document.getElementById('moveEventTitle').textContent}" now has conflicts.`, 'warning');
                        }
                    } else {
                        showToast(data.message || 'Error updating event', 'error');
                        calendar.refetchEvents(); // Revert visual change on error
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('An error occurred while updating the event', 'error');
                    calendar.refetchEvents(); // Revert visual change on error
                })
                .finally(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-check me-1"></i>Update Event';
                    }
                });
        });
    }

    // Copy ICS URL button - Modern API
    const copyIcsUrlBtn = document.getElementById('copyIcsUrlBtn');
    const icsSubscribeUrlInput = document.getElementById('icsSubscribeUrl');
    if (copyIcsUrlBtn && icsSubscribeUrlInput) {
        copyIcsUrlBtn.addEventListener('click', function() {
            const urlToCopy = icsSubscribeUrlInput.value;
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(urlToCopy)
                    .then(() => showToast('Subscription URL copied!', 'success'))
                    .catch(err => {
                        console.error('Failed to copy URL: ', err);
                        showToast('Failed to copy URL', 'error');
                        icsSubscribeUrlInput.select(); // Fallback
                        document.execCommand('copy');
                    });
            } else { // Fallback
                icsSubscribeUrlInput.select();
                try {
                    document.execCommand('copy');
                    showToast('Subscription URL copied!', 'success');
                } catch (err) {
                    console.error('Fallback copy failed: ', err);
                    showToast('Failed to copy URL', 'error');
                }
            }
        });
    }

    // Import type toggle
    var importType = document.getElementById('importType');
    var icsFileSection = document.getElementById('icsFileSection');
    var icsUrlSection = document.getElementById('icsUrlSection');
    if (importType && icsFileSection && icsUrlSection) {
        importType.addEventListener('change', function() {
            icsFileSection.style.display = (this.value === 'ics_file') ? 'block' : 'none';
            icsUrlSection.style.display = (this.value === 'ics_url') ? 'block' : 'none';
        });
    }

    // Print calendar button
    var printCalendarBtn = document.getElementById('printCalendarBtn');
    if (printCalendarBtn) {
        printCalendarBtn.addEventListener('click', () => window.print());
    }

    // --- Helper Functions ---

    // Get status badge class
    function getStatusBadgeClass(status) {
        const statusMap = { booked: 'primary', confirmed: 'success', in_progress: 'warning', completed: 'secondary', cancelled: 'danger' };
        return statusMap[status] || 'primary';
    }

    // Format status text
    function formatStatus(status) {
        if (!status) return '';
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    // --- Toastify Helper ---
    function showToast(message, type = 'info') {
        let backgroundColor;
        switch (type) {
            case 'success': backgroundColor = "linear-gradient(to right, #00b09b, #96c93d)"; break;
            case 'error':   backgroundColor = "linear-gradient(to right, #ff5f6d, #ffc371)"; break;
            case 'warning': backgroundColor = "linear-gradient(to right, #f7971e, #ffd200)"; break;
            default:        backgroundColor = "linear-gradient(to right, #007bff, #00a4ff)";
        }
        Toastify({
            text: message, duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true,
            style: { background: backgroundColor, borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }
        }).showToast();
    }

    // Show move event modal
    function showMoveEventModal(eventId, eventTitle, startDate, endDate, startTime, endTime, isRecurring) {
        document.getElementById('moveEventId').value = eventId;
        document.getElementById('moveEventTitle').textContent = eventTitle;
        document.getElementById('moveEventStartDate').value = startDate;
        document.getElementById('moveEventEndDate').value = endDate || '';
        document.getElementById('moveEventStartTime').value = startTime || '';
        document.getElementById('moveEventEndTime').value = endTime || '';
        const recurringSection = document.getElementById('moveEventRecurringSection');
        if (recurringSection) recurringSection.style.display = isRecurring ? 'block' : 'none';
        var moveEventModal = new bootstrap.Modal(document.getElementById('moveEventModal'));
        moveEventModal.show();
    }

    // Update event dates (Simplified - removed old alert call)
    function updateEventDates(eventId, startDate, endDate, startTime, endTime) {
        var formData = new FormData();
        formData.append('event_id', eventId);
        formData.append('start_date', startDate);
        if (endDate) formData.append('end_date', endDate);
        if (startTime) formData.append('start_time', startTime);
        if (endTime) formData.append('end_time', endTime);

        fetch('/api/events/update_dates', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    calendar.refetchEvents();
                    showToast('Event updated successfully', 'success');
                    if (data.has_conflicts) {
                         showToast(`Event update caused conflicts.`, 'warning');
                    }
                } else {
                    showToast(data.message || 'Error updating event', 'error');
                    calendar.refetchEvents(); // Revert visual change
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred while updating the event', 'error');
                calendar.refetchEvents(); // Revert visual change
            });
    }

    // --- Sidebar Management ---
    function openSidebar(sidebar) {
        sidebar.classList.add('show');
        if (sidebar === eventDetailsSidebar) document.body.classList.add('event-details-open');
    }

    function closeSidebar(sidebar) {
        sidebar.classList.remove('show');
        if (sidebar === eventDetailsSidebar) document.body.classList.remove('event-details-open');
    }

    // Event Details Sidebar Toggle
    if (closeEventDetailsBtn && eventDetailsSidebar) {
        closeEventDetailsBtn.addEventListener('click', () => closeSidebar(eventDetailsSidebar));
    }

    // Filters Panel Toggle
    if (filtersToggleBtn && filtersPanel && closeFiltersBtn) {
        filtersToggleBtn.addEventListener('click', () => {
            if (filtersPanel.classList.contains('show')) {
                closeSidebar(filtersPanel);
            } else {
                if (eventDetailsSidebar.classList.contains('show')) closeSidebar(eventDetailsSidebar);
                openSidebar(filtersPanel);
            }
        });
        closeFiltersBtn.addEventListener('click', () => closeSidebar(filtersPanel));
    }

    // Close sidebars if clicking outside
    document.addEventListener('click', function(event) {
        if (eventDetailsSidebar.classList.contains('show') && !eventDetailsSidebar.contains(event.target) && !event.target.closest('.fc-event')) {
            closeSidebar(eventDetailsSidebar);
        }
        if (filtersPanel.classList.contains('show') && !filtersPanel.contains(event.target) && event.target !== filtersToggleBtn && !filtersToggleBtn.contains(event.target)) {
            closeSidebar(filtersPanel);
        }
    });

}); // End DOMContentLoaded
