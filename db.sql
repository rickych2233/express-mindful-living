CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  donation_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS donation_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

INSERT INTO users (name, email, password_hash, donation_amount)
VALUES
  (
    'Dummy User',
    'dummy@mail.com',
    '$2b$10$2Ea49IHh8lDRWmKuw/IoCuLElnyCaDn3YE5zE1iaxH2lP17KUlo7e',
    50000.00
  ),
  (
    'Alya Pratama',
    'alya@mail.com',
    '$2b$10$FPQc/hWAB1l9seP793ghCeI1MXdKJxMV7oBqke/sv7BrfaaKa9oAK',
    125000.00
  ),
  (
    'Bima Saputra',
    'bima@mail.com',
    '$2b$10$kAnz4HymkbHRlxubl8bmTeTG5ApphTGF8V//mGOjKEEhmfKSZCYjK',
    80000.00
  ),
  (
    'Citra Lestari',
    'citra@mail.com',
    '$2b$10$cbAQsD1GIzOst01OO3vRnOAEc6u7AeBVIepBbFZNyN4w5s48lCRqy',
    200000.00
  ),
  (
    'Danu Wijaya',
    'danu@mail.com',
    '$2b$10$buTItEOwaHy2ur/nR.vPVOcvx.LROT8YpGsjrp4Qce5Gn92Euu3NO',
    35000.00
  ),
  (
    'Eka Putri',
    'eka@mail.com',
    '$2b$10$ex7EbANSJB29GigAnRstlerOxhUHMZQrRxdPyrrF/HZqiN9LLGgUK',
    150000.00
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  donation_amount = EXCLUDED.donation_amount;

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  chapter_order INTEGER NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO chapters (chapter_order, title, description, status)
VALUES
  (
    1,
    'Introduction to Mindful Living',
    'Learn the foundations of mindfulness and begin your journey toward a calmer, more aware life.',
    'Published'
  ),
  (
    2,
    'Building Positive Daily Habits',
    'Cultivate routines that reinforce mindfulness and well-being, transforming your everyday life.',
    'Published'
  ),
  (
    3,
    'Managing Stress & Emotions',
    'Discover practical techniques to handle daily pressures and emotional responses with mindfulness.',
    'Published'
  )
ON CONFLICT (chapter_order) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status;
