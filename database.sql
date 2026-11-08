-- BookHaven SQLite database
-- The Node.js server creates these tables and seeds the books automatically.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL,
  cover TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0
);

-- Example records for a fresh database. Passwords are created securely
-- through the registration route and are not stored in this seed file.
INSERT OR IGNORE INTO books
  (title, author, category, price, description, cover, featured)
VALUES
  ('Atomic Habits', 'James Clear', 'Self Development', 499,
   'A practical guide to building good habits and breaking bad ones.',
   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80', 1),
  ('The Psychology of Money', 'Morgan Housel', 'Finance', 399,
   'Timeless lessons on wealth, greed, and happiness.',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80', 1),
  ('Ikigai', 'Hector Garcia', 'Lifestyle', 299,
   'The Japanese secret to a long and happy life.',
   'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80', 1),
  ('Clean Code', 'Robert C. Martin', 'Technology', 699,
   'A handbook of agile software craftsmanship.',
   'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80', 0),
  ('The Alchemist', 'Paulo Coelho', 'Fiction', 249,
   'A shepherd''s journey toward a worldly treasure and a personal legend.',
   'https://images.unsplash.com/photo-1511108690759-009cbe9f5c2b?auto=format&fit=crop&w=600&q=80', 0),
  ('Wings of Fire', 'A. P. J. Abdul Kalam', 'Biography', 349,
   'An inspiring story of vision, perseverance, and achievement.',
   'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80', 0);
