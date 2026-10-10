const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const list = document.querySelector("#notes-list");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const sendBtn = document.querySelector('#note-form button[type="submit"]');

function showNote(note) {
  const li = document.createElement("li");
  li.textContent = `#${note.id}: ${note.title}`;
  list.appendChild(li);
}

function setBusy(busy) {
  // Keep GET and POST from overlapping and changing the same status message.
  loadBtn.disabled = busy;
  sendBtn.disabled = busy;
  titleInput.disabled = busy;
}

loadBtn.addEventListener("click", async () => {
  if (loadBtn.disabled) return;

  statusText.textContent = "Loading notes...";
  setBusy(true);
  list.innerHTML = ""; // clearing is safe; user text is only set with textContent

  try {
    const response = await fetch(`${API_URL}?_limit=5`);
    if (!response.ok) throw new Error(`Status ${response.status}`);

    const notes = await response.json();
    notes.forEach(showNote);
    statusText.textContent = `Loaded ${notes.length} notes.`;
  } catch (error) {
    statusText.textContent = "Could not load notes. Please try again.";
    console.error("Could not load notes:", error.message);
  } finally {
    setBusy(false);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sendBtn.disabled) return;

  const title = titleInput.value.trim();
  if (!title) return;

  statusText.textContent = "Sending note...";
  setBusy(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: "", userId: 1 }),
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);

    const created = await response.json();
    showNote(created);
    statusText.textContent =
      `Created note #${created.id} (status ${response.status}).`;
    titleInput.value = "";
  } catch (error) {
    statusText.textContent = "Could not create the note.";
    console.error("Could not create the note:", error.message);
  } finally {
    setBusy(false);
    titleInput.focus();
  }
});
