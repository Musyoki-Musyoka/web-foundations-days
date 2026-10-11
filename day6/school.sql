-- Day 6: school enrolments
-- Run once in a fresh SQLite database. All sample records are illustrative.
-- The brief does not specify a grade scale: grade is nullable TEXT.

PRAGMA foreign_keys = ON;

-- 1. Create the tables.
CREATE TABLE students (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  email  TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL
);

CREATE TABLE enrolments (
  student_id  INTEGER NOT NULL,
  course_id   INTEGER NOT NULL,
  grade       TEXT,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- The primary key starts with student_id; this index helps course lookups.
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- 2. Insert the sample data.
-- Diana has no enrolments; Python Basics has no students.
INSERT INTO students (id, name, email) VALUES
  (1, 'Amina Otieno', 'amina@example.com'),
  (2, 'Brian Kamau', 'brian@example.com'),
  (3, 'Chao Muli', 'chao@example.com'),
  (4, 'Diana Njeri', 'diana@example.com');

INSERT INTO courses (id, name) VALUES
  (1, 'Web Foundations'),
  (2, 'Database Basics'),
  (3, 'Python Basics');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'B'),
  (1, 2, 'A-'),
  (2, 1, 'A'),
  (2, 2, NULL),
  (3, 1, 'B+');

-- 3. The five required queries.

-- Query 1: all courses for one student, selected by name.
SELECT courses.id AS course_id, courses.name AS course_name
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno'
ORDER BY courses.id;

-- Query 2: all students on course 1 (Web Foundations).
SELECT students.id AS student_id, students.name AS student_name, students.email
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students ON students.id = enrolments.student_id
WHERE courses.id = 1
ORDER BY students.id;

-- Query 3: number of students on every course, including zero.
-- COUNT(student_id), not COUNT(*), ignores the empty side of a LEFT JOIN.
SELECT courses.id AS course_id,
       courses.name AS course_name,
       COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.name
ORDER BY courses.id;

-- Query 4: students who have no enrolments.
SELECT students.id AS student_id, students.name AS student_name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.student_id IS NULL
ORDER BY students.id;

-- Query 5: update exactly one enrolment's grade, from B to A.
-- Both parts of the composite key identify the enrolment being changed.
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1 AND course_id = 1;
