-- Day 6 hands-on lab: QuickNotes data and relationships.
-- Run once in a fresh SQLite database. Sample records are illustrative.

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  text        TEXT NOT NULL CHECK (length(text) <= 200),
  category    TEXT NOT NULL DEFAULT 'personal',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id  INTEGER NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Find one user's notes in date order.
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);

-- Find notes from a tag; the join table's primary key starts with note_id.
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);

INSERT INTO users (id, name, email) VALUES
  (1, 'Amina Otieno', 'amina@example.com'),
  (2, 'Brian Kamau', 'brian@example.com'),
  (3, 'Chao Muli', 'chao@example.com');

INSERT INTO notes (id, user_id, text, category, created_at) VALUES
  (1, 1, 'Revise HTTP methods', 'study', '2026-09-21 09:00:00'),
  (2, 1, 'Buy milk', 'personal', '2026-09-21 15:30:00'),
  (3, 2, 'Finish report', 'work', '2026-09-22 08:15:00');

INSERT INTO tags (id, name) VALUES
  (10, 'exams'),
  (11, 'urgent');

INSERT INTO note_tags (note_id, tag_id) VALUES
  (1, 10),
  (1, 11),
  (2, 11);

-- Query 1: all of Amina's notes, newest first.
SELECT notes.id, notes.text, notes.category, notes.created_at
FROM users
JOIN notes ON notes.user_id = users.id
WHERE users.name = 'Amina Otieno'
ORDER BY notes.created_at DESC, notes.id DESC;

-- Query 2: all notes tagged urgent, using two JOINs.
SELECT notes.text
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent'
ORDER BY notes.id;

-- Query 3: the number of notes for each user, including users with zero.
SELECT users.id AS user_id,
       users.name,
       COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id, users.name
ORDER BY users.id;
