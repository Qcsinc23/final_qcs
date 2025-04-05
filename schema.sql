-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS event_elements;
DROP TABLE IF EXISTS kit_elements;
DROP TABLE IF EXISTS kits;
DROP TABLE IF EXISTS elements;
DROP TABLE IF EXISTS element_types;
DROP TABLE IF EXISTS equipment_assignments;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS template_equipment;
DROP TABLE IF EXISTS event_template_fields;
DROP TABLE IF EXISTS event_templates;
DROP TABLE IF EXISTS event_categories;
DROP TABLE IF EXISTS client_communications;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS event_conflicts;
DROP TABLE IF EXISTS event_tasks;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS calendar_feeds;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;

-- User Authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'viewer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Enhanced Clients Table
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    preferences TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Client Communication History
CREATE TABLE client_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('email', 'phone', 'meeting', 'other')),
    notes TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Event Categories
CREATE TABLE event_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Locations Table
CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    phone TEXT,
    email TEXT,
    website TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar Feeds Table
CREATE TABLE calendar_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    category_id INTEGER,
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_sync INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (category_id) REFERENCES event_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Event Templates
CREATE TABLE event_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3788d8',
    default_duration REAL NOT NULL DEFAULT 2,
    notes TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES event_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table for Element Types (e.g., "Banner", "Table", "Tent")
CREATE TABLE element_types (
    type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT NOT NULL UNIQUE
);

-- Table for individual Elements (specific instances of each type)
CREATE TABLE elements (
    element_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    item_number TEXT,  -- Can be NULL if no item number is assigned
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    location TEXT NOT NULL,
    is_kit_component BOOLEAN DEFAULT 0, -- 0 for false, 1 for true.
    FOREIGN KEY (type_id) REFERENCES element_types(type_id)
);

-- Events Table (Enhanced with calendar functionality)
CREATE TABLE events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    client_id INTEGER,
    category_id INTEGER,
    template_id INTEGER,
    ics_uid TEXT UNIQUE,  -- Unique identifier for ICS events
    event_date TEXT,  -- Store as YYYY-MM-DD
    end_date TEXT,    -- For multi-day events
    drop_off_time TEXT,      -- Store as HH:MM:SS
    pickup_time TEXT,
    is_all_day INTEGER DEFAULT 0, -- 0 for false, 1 for true
    has_conflicts INTEGER DEFAULT 0, -- 0 for no conflicts, 1 for conflicts
    is_recurring INTEGER DEFAULT 0, -- 0 for one-time, 1 for recurring
    recurrence_pattern TEXT,     -- daily, weekly, monthly, yearly
    recurrence_end_date TEXT,    -- When recurring events should stop
    parent_event_id INTEGER,     -- For recurring events
    original_start_date TEXT,    -- For moved recurring instances
    manager TEXT,
    onsite_contact TEXT,
    onsite_contact_phone TEXT,
    event_location TEXT,
    location_id INTEGER,     -- Reference to locations table
    items_needed TEXT,       -- List of items needed, including kits.
    boxes_from_pi INTEGER,   -- Number of boxes to be picked up from Positive Impact.
    notes TEXT,              -- Additional Information.
    status TEXT DEFAULT 'booked' CHECK(status IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_updated TEXT,
    last_updated_by INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (category_id) REFERENCES event_categories(id),
    FOREIGN KEY (template_id) REFERENCES event_templates(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (parent_event_id) REFERENCES events(event_id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

-- Create indexes for faster queries
CREATE INDEX idx_events_dates ON events(event_date, end_date);
CREATE INDEX idx_events_ics_uid ON events(ics_uid);

-- Event Tasks Table
CREATE TABLE event_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    is_completed INTEGER DEFAULT 0,
    due_date DATE,
    assigned_to INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Event Conflicts Table
CREATE TABLE event_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    conflicting_event_id INTEGER NOT NULL,
    conflict_type TEXT NOT NULL CHECK(conflict_type IN ('equipment', 'location')),
    resolved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (conflicting_event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- Add triggers for updated_at timestamps
CREATE TRIGGER event_tasks_updated_at 
AFTER UPDATE ON event_tasks
FOR EACH ROW
BEGIN
    UPDATE event_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER event_conflicts_updated_at 
AFTER UPDATE ON event_conflicts
FOR EACH ROW
BEGIN
    UPDATE event_conflicts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Equipment/Inventory
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'maintenance', 'retired')),
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Equipment Assignments
CREATE TABLE equipment_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    assigned_by INTEGER,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    returned INTEGER NOT NULL DEFAULT 0,
    returned_at TEXT,
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Enhanced Invoices Table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    client_id INTEGER,
    amount REAL,
    issue_date TEXT NOT NULL DEFAULT (datetime('now')),
    due_date TEXT,
    status TEXT DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')),
    notes TEXT,
    created_by INTEGER,
    last_updated TEXT,
    last_updated_by INTEGER,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

-- Template Fields (for storing template-specific data)
CREATE TABLE event_template_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    field_value TEXT,
    FOREIGN KEY (template_id) REFERENCES event_templates(id)
);

-- Template Equipment (for storing equipment assigned to templates)
CREATE TABLE template_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES event_templates(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- Table for Kits (predefined sets of elements)
CREATE TABLE kits (
    kit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    kit_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Linking table for Kits and Elements (many-to-many)
CREATE TABLE kit_elements (
    kit_id INTEGER NOT NULL,
    element_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (kit_id, element_id),
    FOREIGN KEY (kit_id) REFERENCES kits(kit_id),
    FOREIGN KEY (element_id) REFERENCES elements(element_id)
);

-- Linking table for events and kits (many-to-many)
CREATE TABLE event_kits (
    event_id INTEGER NOT NULL,
    kit_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (event_id, kit_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (kit_id) REFERENCES kits(kit_id)
);

-- Linking table for events and elements.
CREATE TABLE event_elements (
    event_id INTEGER NOT NULL,
    element_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (event_id, element_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (element_id) REFERENCES elements(element_id)
);

-- Insert the default admin user
INSERT INTO users (username, password_hash, email, full_name, role) 
VALUES ('admin', '$2b$12$lW3X0k1W1Z7KJ3ZdOq8X9eMX8XGP5YKqc9Z5Z5Z5Z5Z5Z5Z5Z5', 'admin@qcsevents.com', 'Administrator', 'admin');

-- Insert the two primary clients
INSERT INTO clients (name, color) VALUES ('Robert Wood Johnson', '#e74c3c');  -- Red
INSERT INTO clients (name, color) VALUES ('Horizon Blue Cross', '#3498db');   -- Blue

-- Insert default event categories
INSERT INTO event_categories (name, description, color) 
VALUES ('Corporate', 'Corporate events and meetings', '#3498db');

INSERT INTO event_categories (name, description, color) 
VALUES ('Medical', 'Medical conferences and training', '#e74c3c');

INSERT INTO event_categories (name, description, color) 
VALUES ('Social', 'Social gatherings and celebrations', '#2ecc71');

-- Insert Element Types
INSERT INTO element_types (type_name) VALUES
('Pullup Banner'),
('Bin'),
('A-Frame'),
('Cooler'),
('Step & Repeat Banner'),
('Tear Drop Flags'),
('Feather Flags'),
('Hand Sanitizing Station'),
('Putting Green'),
('Case to Counter'),
('Table'),
('Flag'),
('Raffle'),
('Collateral'),
('Misc. Items');

-- Insert Elements
INSERT INTO elements (type_id, item_description, item_number, quantity, location) VALUES
((SELECT type_id FROM element_types WHERE type_name = 'Pullup Banner'), 'Horizon Branded Floor Mats', 'FA', 2, 'Storage'),
((SELECT type_id FROM element_types WHERE type_name = 'Bin'), 'RWJBH Clear Bin', NULL, 1, 'PI'),
((SELECT type_id FROM element_types WHERE type_name = 'Cooler'), 'Yeti Cooler', NULL, 5, 'PI'),
((SELECT type_id FROM element_types WHERE type_name = 'Table'), '6ft Folding Table', 'T1', 4, 'Storage'),
((SELECT type_id FROM element_types WHERE type_name = 'Hand Sanitizing Station'), 'Free Standing Hand Sanitizer', 'HS1', 2, 'Storage');

-- Insert a sample event
INSERT INTO events (event_name, client_id, event_date, drop_off_time, pickup_time, manager, onsite_contact, onsite_contact_phone, event_location) 
VALUES ('Field of Dreams', 1, '2024-05-31', '17:00:00', '20:15:00', 'Vanessa Kern', 'TBD', '732-540-9080', '1505 N Bay Ave, Toms River, NJ');

-- Insert sample kits
INSERT INTO kits (kit_name, description) VALUES
('RWJBH Standard Setup', 'Basic set of items for RWJBH events'),
('Horizon Popup Kit', 'Standard kit for Horizon events with a popup tent');

-- Insert kit elements
INSERT INTO kit_elements (kit_id, element_id, quantity) VALUES
(1, 1, 2),  -- 2 Horizon Branded Floor Mats for RWJBH Standard Setup
(1, 2, 1),  -- 1 RWJBH Clear Bin for RWJBH Standard Setup
(2, 1, 1),  -- 1 Horizon Branded Floor Mat for Horizon Popup Kit
(2, 3, 2);  -- 2 Yeti Coolers for Horizon Popup Kit

-- Insert event elements for the Field of Dreams event
-- First, add elements from RWJBH Standard Setup kit
INSERT INTO event_elements (event_id, element_id, quantity)
SELECT 1, element_id, quantity
FROM kit_elements
WHERE kit_id = 1;

-- Then add specific additional elements
INSERT INTO event_elements (event_id, element_id, quantity) VALUES (1, 5, 2); -- 2 Free Standing Hand Sanitizers