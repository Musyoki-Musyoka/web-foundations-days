# School Enrolment Database

## Tables

- **students** stores each student's name and email once. `id` is an integer primary key. Name and email are `NOT NULL`, and `UNIQUE` prevents duplicate email values.
- **courses** stores the course names. Its integer `id` is the primary key, and its name is `NOT NULL`.
- **enrolments** records that a student takes a course and stores that enrolment's grade. `student_id` and `course_id` are non-null foreign keys. Together they form the composite primary key, so the same student–course pair cannot be inserted twice.

The assignment does not define a grading scale. Here, `grade` is nullable `TEXT`: the illustrative rows use letter grades, and `NULL` means a grade has not been recorded yet. These are design choices, not additional assignment requirements.

## Relationships

```text
students (1) ────< enrolments >──── (1) courses
    id             student_id              id
                   course_id
                   grade
```

- One student can have many enrolments: **students → enrolments is one-to-many**.
- One course can have many enrolments: **courses → enrolments is one-to-many**.
- A student can take several courses, and a course can have several students: **students ↔ courses is many-to-many**.
- The join table stores one row per student–course pair. The grade belongs to that pair, not to a student or course alone. This avoids comma-separated course lists and repeated student/course details.

Foreign keys prevent enrolments referring to missing students or courses. This design uses SQLite's default deletion behaviour: a referenced student or course cannot be deleted while its enrolments remain. It does not silently delete grade records. `PRAGMA foreign_keys = ON` enables enforcement in the exercise.

The required name-based query identifies Amina in this sample data. Student names are not constrained to be unique; a real application should use the student's ID when names are ambiguous.

## Index

I would add this index, which is also included in `school.sql`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

The composite primary key starts with `student_id`. A separate index starting with `course_id` helps find enrolments for a particular course, including the students-on-a-course query. It costs storage and extra maintenance on writes, so I would not index every column automatically.

## SQL or NoSQL?

I would choose **SQL** for this system because students, courses and enrolments have a clear, structured relationship. Foreign keys, a unique email constraint and the composite primary key enforce consistency in the database, while JOINs and GROUP BY support the required reports without duplicating student or course information. A document database could also be used, but embedding or duplicating enrolments would make these relationships and grades harder to keep consistent here. SQLite suits this exercise; a production database choice would also consider concurrency, deployment and operational needs.
