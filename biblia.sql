\c postgres
DROP DATABASE IF EXISTS biblia;
CREATE DATABASE biblia;

\c biblia

-- Testamentos
CREATE TABLE testaments (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50)
);

-- Libros
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  testament_id INTEGER REFERENCES testaments(id),
  name VARCHAR(50),
  abbreviation VARCHAR(5)
);

-- Versículos
CREATE TABLE verses (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id),
  chapter INTEGER,
  verse INTEGER,
  text TEXT
);

-- Usuarios (ajustado para usar TEXT como ID)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone_number TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Amistades
CREATE TABLE friendships (
  user_id TEXT REFERENCES users(id),
  friend_id TEXT REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- Versículos resaltados
CREATE TABLE highlighted_verse (
  user_id TEXT REFERENCES users(id),
  verse_id INTEGER REFERENCES verses(id),
  visibility TEXT CHECK (visibility IN ('private', 'friends', 'public')) DEFAULT 'private',
  color TEXT CHECK (color IN ('yellow', 'green', 'blue', 'pink')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, verse_id)
);

-- Notas
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  visibility TEXT CHECK (visibility IN ('private', 'friends', 'public')) DEFAULT 'private',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Relación nota-versículo
CREATE TABLE note_verse (
  note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  verse_id INTEGER REFERENCES verses(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, verse_id)
);

-- Consulta para ver versículos resaltados por amigos
-- SELECT v.*
-- FROM highlighted_verse hv
-- JOIN verses v ON hv.verse_id = v.id
-- WHERE hv.visibility = 'friends'
--   AND hv.user_id IN (
--     SELECT friend_id
--     FROM friendships
--     WHERE user_id = $CURRENT_USER_ID AND status = 'accepted'
--   );
