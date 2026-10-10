const USERS_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];
let hasLoaded = false;
let isLoading = false;

function setStatus(message, state = "") {
  statusText.textContent = message;
  statusText.className = state;
}

function makeDetail(label, value) {
  const line = document.createElement("p");
  const caption = document.createElement("strong");
  const content = document.createElement("span");

  caption.textContent = `${label}: `;
  content.textContent = value;
  line.appendChild(caption);
  line.appendChild(content);
  return line;
}

function renderUsers(list) {
  usersList.replaceChildren();

  list.forEach((user) => {
    const card = document.createElement("li");
    card.classList.add("user-card");

    const name = document.createElement("h3");
    name.textContent = user.name;

    card.appendChild(name);
    card.appendChild(makeDetail("Email", user.email));
    card.appendChild(makeDetail("City", user.address.city));
    card.appendChild(makeDetail("Company", user.company.name));
    usersList.appendChild(card);
  });
}

function applyFilter() {
  const search = filterInput.value.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search)
  );
  renderUsers(filteredUsers);

  if (filteredUsers.length === 0 && search !== "") {
    setStatus("No users match your filter.", "success");
  } else if (users.length === 0) {
    setStatus("Loaded 0 users. No users found.", "success");
  } else if (search === "") {
    const userWord = users.length === 1 ? "user" : "users";
    setStatus(`Loaded ${users.length} ${userWord}.`, "success");
  } else {
    const userWord = users.length === 1 ? "user" : "users";
    setStatus(`Showing ${filteredUsers.length} of ${users.length} ${userWord}.`, "success");
  }
}

async function loadUsers() {
  if (isLoading) return;

  isLoading = true;
  hasLoaded = false;
  loadButton.disabled = true;
  filterInput.disabled = true;
  usersList.setAttribute("aria-busy", "true");
  users = [];
  renderUsers(users);
  setStatus("Loading users...", "loading");

  try {
    const response = await fetch(USERS_URL);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const loadedUsers = await response.json();
    // Check the fields used below so an unexpected response shows an error.
    if (
      !Array.isArray(loadedUsers) ||
      !loadedUsers.every((user) =>
        typeof user?.name === "string" &&
        typeof user?.email === "string" &&
        typeof user?.address?.city === "string" &&
        typeof user?.company?.name === "string"
      )
    ) {
      throw new Error("The server returned an unexpected user list.");
    }

    users = loadedUsers;
    hasLoaded = true;
    applyFilter();
  } catch (error) {
    users = [];
    hasLoaded = false;
    renderUsers(users);
    setStatus("Could not load users. Please try again.", "error");
    console.error("Could not load users:", error.message);
  } finally {
    isLoading = false;
    loadButton.disabled = false;
    filterInput.disabled = false;
    usersList.setAttribute("aria-busy", "false");
  }
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  if (hasLoaded && !isLoading) {
    applyFilter();
  }
});
