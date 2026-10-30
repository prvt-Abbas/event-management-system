-- ============================================================
-- Event Management System - Database (Tier 3)
-- Database: event_db
-- Idempotent: safe to run again with `npm run setup`.
-- Running it twice does NOT duplicate users, categories or events
-- (all seed inserts use ON DUPLICATE KEY UPDATE).
-- ============================================================
CREATE DATABASE IF NOT EXISTS event_db;
USE event_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('attendee', 'organizer', 'admin') NOT NULL DEFAULT 'attendee',
  phone VARCHAR(30) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT,
  organizer_id INT,
  venue VARCHAR(200) NOT NULL,
  event_date DATETIME NOT NULL,
  capacity INT NOT NULL DEFAULT 100,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  tickets INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- ---------------- Seed users (passwords are bcrypt hashes) ----------------
-- Admin:     admin@events.com     / admin123
-- Organizer: organizer@events.com / organizer123
-- Attendee:  user@events.com      / user123
INSERT INTO users (id, full_name, email, password_hash, role, phone) VALUES
  (1, 'Admin', 'admin@events.com', '$2b$10$2FHVt7x3yxMdMVh.ZlwA3OTKDYCHc2GY5qZIQ8uA/NE3fW05tPWUu', 'admin', '0300-0000001'),
  (2, 'Sara Organizer', 'organizer@events.com', '$2b$10$fiRDFrYYREiCB6atRWcUUeDCC8YiBB0wxGWO/O/OeJSvD3aqtuALC', 'organizer', '0300-0000002'),
  (3, 'Ali Attendee', 'user@events.com', '$2b$10$fu5Ma0SAvl9an0Hio2tmz.fPM7msBzQKnlLa.1kVD2koINwbp2nWy', 'attendee', '0300-0000003')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role);

INSERT INTO categories (id, name) VALUES
  (1, 'Conference'), (2, 'Workshop'), (3, 'Concert'),
  (4, 'Seminar'), (5, 'Exhibition'), (6, 'Sports')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO events (id, title, description, category_id, organizer_id, venue, event_date, capacity, price, status) VALUES
  (1, 'Tech Innovators Conference 2026', 'A full day of talks on AI, startups and the future of software in Pakistan.', 1, 2, 'Karachi Expo Centre, Karachi', '2026-11-20 09:00:00', 500, 2500.00, 'upcoming'),
  (2, 'Web Development Bootcamp', 'Hands-on workshop: build a complete 3-tier website with HTML, Node.js and MySQL.', 2, 2, 'Arfa Software Technology Park, Lahore', '2026-11-28 10:00:00', 80, 1500.00, 'upcoming'),
  (3, 'Winter Music Night - Live Concert', 'Live performances by top Pakistani artists, food stalls and a winter festival vibe.', 3, 2, 'Jinnah Convention Centre, Islamabad', '2026-12-05 19:00:00', 1000, 1200.00, 'upcoming'),
  (4, 'Startup Pitch Night', '10 startups pitch to investors, followed by networking and Q&A.', 1, 2, 'National Incubation Center, Karachi', '2026-12-12 18:00:00', 200, 500.00, 'upcoming'),
  (5, 'Digital Marketing Seminar', 'SEO, social media and paid ads - practical strategies for small businesses.', 4, 2, 'Lahore Expo Centre, Lahore', '2026-12-19 10:00:00', 150, 800.00, 'upcoming'),
  (6, 'Art & Design Exhibition', 'Paintings, calligraphy and digital art from emerging Pakistani artists.', 5, 2, 'Alhamra Arts Council, Lahore', '2027-01-09 11:00:00', 300, 300.00, 'upcoming'),
  (7, 'Business Leadership Summit 2027', 'CEOs and founders share lessons on leading teams and growing a business.', 4, 1, 'Pearl Continental Hotel, Karachi', '2027-01-23 09:00:00', 400, 5000.00, 'upcoming'),
  (8, 'Community Cricket Festival', 'Friendly matches, coaching clinics for kids and a family fun day.', 6, 1, 'Gaddafi Stadium, Lahore', '2027-02-06 14:00:00', 600, 200.00, 'upcoming')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
  category_id = VALUES(category_id), venue = VALUES(venue), event_date = VALUES(event_date),
  capacity = VALUES(capacity), price = VALUES(price), status = VALUES(status);
