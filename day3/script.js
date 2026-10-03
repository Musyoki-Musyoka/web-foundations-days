// Starting data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// Return notes containing the search word, without case sensitivity.
function searchNotes(word) {
  const searchWord = word.trim().toLowerCase();

  return notes.filter((note) =>
    note.text.toLowerCase().includes(searchWord)
  );
}

// Return the longest note, or null when there are no notes.
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

// Return the number of notes in each supported category.
function countByCategory() {
  const counts = {
    personal: 0,
    work: 0,
    study: 0,
  };

  for (const note of notes) {
    if (note.category === "personal") {
      counts.personal++;
    } else if (note.category === "work") {
      counts.work++;
    } else if (note.category === "study") {
      counts.study++;
    }
  }

  return counts;
}

// Return a summary sentence, using "note" only when there is one note.
function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${noteWord}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

// Check whether the same note text already exists.
// Comparison ignores case and spaces at the beginning or end.
function isDuplicate(text) {
  const cleanedText = text.trim().toLowerCase();

  return notes.some(
    (note) => note.text.trim().toLowerCase() === cleanedText
  );
}

// Add a note only if its text and category are valid and it is not a duplicate.
function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Not added: note text must be a string."); // Prints the reason for rejection.
    return false;
  }

  const cleanedText = text.trim();

  if (cleanedText.length < 1 || cleanedText.length > 200) {
    console.log("Not added: note text must be 1–200 characters."); // Prints the reason for rejection.
    return false;
  }

  if (isDuplicate(cleanedText)) {
    console.log("Not added: a note with that text already exists."); // Prints the reason for rejection.
    return false;
  }

  const validCategories = ["personal", "work", "study"];

  if (!validCategories.includes(category)) {
    console.log("Not added: category must be personal, work, or study."); // Prints the reason for rejection.
    return false;
  }

  const nextId =
    notes.reduce((highestId, note) => Math.max(highestId, note.id), 0) + 1;

  const newNote = {
    id: nextId,
    text: cleanedText,
    category: category,
  };

  notes.push(newNote);
  console.log(`Added note: "${newNote.text}" (${newNote.category}).`); // Prints a success message.

  return true;
}

// Test searchNotes: normal result and no-result edge case.
console.log("searchNotes('DAY 3'):", searchNotes("DAY 3"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log("searchNotes('dragon'):", searchNotes("dragon"));
// Expected: []

// Test longestNote: normal result.
console.log("longestNote():", longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

// Temporarily test the functions that need an empty notes array.
const savedNotes = notes;
notes = [];

console.log("longestNote() with no notes:", longestNote());
// Expected: null

console.log("countByCategory() with no notes:", countByCategory());
// Expected: { personal: 0, work: 0, study: 0 }

console.log("getSummary() with no notes:", getSummary());
// Expected: "0 notes: 0 personal, 0 work, 0 study."

// Test the one-note singular case.
notes = [savedNotes[0]];

console.log("countByCategory() with one note:", countByCategory());
// Expected: { personal: 1, work: 0, study: 0 }

console.log("getSummary() with one note:", getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

// Restore the original five notes before the remaining tests.
notes = savedNotes;

// Test isDuplicate: matching text despite case and extra outside spaces, and no match.
console.log("isDuplicate('  BUY MILK AND BREAD  '):", isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true

console.log("isDuplicate('Read a novel'):", isDuplicate("Read a novel"));
// Expected: false

// Test addNote: one valid note and several rejected notes.
console.log("addNote valid:", addNote("Plan weekly meals", "personal"));
// Expected: true (and an "Added note" message)

console.log("addNote duplicate:", addNote("  PLAN WEEKLY MEALS  ", "work"));
// Expected: false (and a duplicate-rejection message)

console.log("addNote blank:", addNote("   ", "personal"));
// Expected: false (and a length-rejection message)

console.log("addNote too long:", addNote("x".repeat(201), "work"));
// Expected: false (and a length-rejection message)

console.log("addNote invalid category:", addNote("Review notes", "other"));
// Expected: false (and a category-rejection message)