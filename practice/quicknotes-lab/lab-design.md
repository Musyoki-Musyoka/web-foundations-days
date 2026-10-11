# QuickNotes Database Lab

The lab brief does not prescribe a file path. These files are kept separate from the two checked school assignment files. Names, addresses and timestamps below are illustrative practice data.

## Entities, columns and types

### users

| Column | SQLite type | Rules |
| --- | --- | --- |
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| created_at | TEXT | NOT NULL, defaults to CURRENT_TIMESTAMP |

### notes

| Column | SQLite type | Rules |
| --- | --- | --- |
| id | INTEGER | Primary key |
| user_id | INTEGER | NOT NULL, foreign key to users.id |
| text | TEXT | NOT NULL, maximum 200 characters |
| category | TEXT | NOT NULL, defaults to personal |
| created_at | TEXT | NOT NULL, defaults to CURRENT_TIMESTAMP |

### tags

| Column | SQLite type | Rules |
| --- | --- | --- |
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL, UNIQUE |

### note_tags

| Column | SQLite type | Rules |
| --- | --- | --- |
| note_id | INTEGER | NOT NULL, foreign key to notes.id, part of the primary key |
| tag_id | INTEGER | NOT NULL, foreign key to tags.id, part of the primary key |

The primary key is the pair `(note_id, tag_id)`, not two independent primary keys. It prevents attaching the same tag to the same note twice.

## Relationships

```text
users (1) ────< notes (1) ────< note_tags >──── (1) tags
    id           id               note_id              id
                 user_id          tag_id
```

- One user has many notes. Each note has one owner, recorded by `notes.user_id`.
- Notes and tags have a many-to-many relationship: a note can have several tags, and a tag can appear on several notes.
- `note_tags` turns that relationship into two one-to-many relationships, with one row for each attachment.
- The SQL follows the supplied cascade behaviour. Deleting a note removes its tag links; deleting a tag removes its links but not the notes. Deleting a user removes their notes and, in turn, those notes' tag links.
- SQLite requires `PRAGMA foreign_keys = ON` for these relationships to be enforced.

## Required queries

The three numbered queries in `quicknotes.sql`:

1. Select Amina's notes through `users → notes`, ordering by `created_at DESC`. The ID breaks date ties consistently.
2. Select urgent notes through `notes → note_tags → tags`, with the two required JOINs.
3. Count notes per user using LEFT JOIN and GROUP BY. `COUNT(notes.id)` gives zero, rather than one, for a user with no note.

The name-based query is for this sample. Names need not be unique in a real app, so an authenticated user's ID is the safer identifier.

## Index choices

- **`notes(user_id, created_at DESC)`** supports fetching one user's notes in newest-first order.
- **`note_tags(tag_id)`** supports the reverse lookup from a tag to its notes. The join table's composite primary key starts with `note_id`, so this additional index gives direct access by tag.
- Primary-key and UNIQUE indexes already cover note/user/tag identity, email uniqueness and tag-name lookup. No redundant indexes are added for those.

Indexes use space and must be maintained during writes. They are chosen for these frequent access patterns, not added to every column. A planner may choose a table scan for a small dataset; an index is not a promise that every query always uses it.
