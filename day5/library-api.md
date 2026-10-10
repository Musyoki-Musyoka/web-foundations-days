# Library Books REST API

This is a design for a library's books resource, not a running API. Paths are relative to the API's base URL. The sample book and author below are illustrative data.

## Resource and JSON rules

- Use the plural resource name `/books`; use the HTTP method to describe the action.
- A book has a server-assigned numeric `id`, plus `title`, `author`, `publicationYear` and `available`.
- `title` and `author` must be non-empty strings, `publicationYear` must be a positive integer and `available` must be a boolean.
- In this design, creating or fully replacing a book requires all four writable fields. Clients do not set or change `id`.
- Requests with a JSON body use `Content-Type: application/json`. Responses containing JSON use that content type too.

Example book representation:

```json
{
  "id": 42,
  "title": "River Stories",
  "author": "Mary Wanjiku",
  "publicationYear": 2024,
  "available": true
}
```

## Endpoints

### 1. List all books

- **Method:** `GET`
- **Path:** `/books`
- **Description:** Return an array of all books in the library.
- **Request body:** None.
- **Success:** `200 OK`, with a JSON array of books; an empty library returns `[]`.

### 2. Get one book

- **Method:** `GET`
- **Path:** `/books/42`
- **Description:** Return the book whose ID is `42`.
- **Request body:** None.
- **Success:** `200 OK`, with that book as a JSON object.

### 3. Create a book

- **Method:** `POST`
- **Path:** `/books`
- **Description:** Create a new book and let the server assign its ID.
- **Success:** `201 Created`, with the created book as JSON and a `Location` header identifying its path, such as `/books/42`.
- **Example request body:**

```json
{
  "title": "River Stories",
  "author": "Mary Wanjiku",
  "publicationYear": 2024,
  "available": true
}
```

### 4. Replace a book completely

- **Method:** `PUT`
- **Path:** `/books/42`
- **Description:** Replace all writable fields of the existing book with ID `42`.
- **Success:** `200 OK`, with the complete updated book as JSON.
- **Example request body:**

```json
{
  "title": "River Stories: Revised Edition",
  "author": "Mary Wanjiku",
  "publicationYear": 2026,
  "available": false
}
```

- In this API design, `PUT` updates existing books only. A missing ID returns `404`; `POST /books` is used to create books.

### 5. Update part of a book

- **Method:** `PATCH`
- **Path:** `/books/42`
- **Description:** Update only the supplied fields of book `42`, leaving its other fields unchanged.
- **Success:** `200 OK`, with the complete updated book as JSON.
- **Example request body:**

```json
{
  "available": false
}
```

- The body must contain at least one supported writable field; any supplied value must follow the resource's validation rules.

### 6. Delete a book

- **Method:** `DELETE`
- **Path:** `/books/42`
- **Description:** Remove the existing book whose ID is `42`.
- **Request body:** None.
- **Success:** `204 No Content`, with no response body.

### 7. List books by an author

- **Method:** `GET`
- **Path:** `/books?author=Mary%20Wanjiku`
- **Description:** Return books whose author matches the `author` query parameter, ignoring letter case.
- **Request body:** None.
- **Success:** `200 OK`, with a JSON array of matching books.

- The space in the author's name is URL-encoded as `%20`.
- An author with no matching books returns `200 OK` with `[]`, not `404`, because the collection endpoint exists.

## Error responses

### 400 Bad Request

- The request reaches a valid endpoint but has invalid JSON, missing required fields or an invalid field value.
- **Example:** `POST /books` with this body is rejected because `title` is empty:

```json
{
  "title": "",
  "author": "Mary Wanjiku",
  "publicationYear": 2024,
  "available": true
}
```

- Example response, with status `400`:

```json
{
  "error": "Bad Request",
  "message": "The title field must not be empty."
}
```

### 404 Not Found

- The requested book does not exist, or the requested endpoint path does not exist.
- **Example:** `GET /books/9999` returns `404` if there is no book with ID `9999`. Updating or deleting that missing book also returns `404`.
- Example response, with status `404`:

```json
{
  "error": "Not Found",
  "message": "Book 9999 was not found."
}
```
