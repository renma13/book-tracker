const STORAGE_KEY = "chapter-garden-books";
const STATUS_STORAGE_KEY = "chapter-garden-statuses";
const SYNC_CONFIG_KEY = "chapter-garden-sync-config";

const defaultStatuses = [
  { id: "want", label: "Want to read", color: "#c8bed9", builtIn: true },
  { id: "reading", label: "Reading", color: "#b6c9d8", builtIn: true },
  { id: "finished", label: "Finished", color: "#a8bca4", builtIn: true },
  { id: "paused", label: "Paused", color: "#dfb7ad", builtIn: true },
  { id: "dnf", label: "DNF", color: "#cfa6a0", builtIn: true },
];

let statuses = loadStatuses();

function loadStatuses() {
  const stored = localStorage.getItem(STATUS_STORAGE_KEY);
  if (!stored) return defaultStatuses.map((status) => ({ ...status }));

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.length) return defaultStatuses.map((status) => ({ ...status }));
    return backfillMissingDefaultStatuses(parsed);
  } catch {
    return defaultStatuses.map((status) => ({ ...status }));
  }
}

// Adds any new built-in statuses (like DNF) introduced after a user already had a
// saved statuses list, so older libraries pick them up without losing customizations.
function backfillMissingDefaultStatuses(savedStatuses) {
  const missing = defaultStatuses.filter(
    (defaultStatus) => !savedStatuses.some((status) => status.id === defaultStatus.id)
  );
  if (!missing.length) return savedStatuses;

  const merged = [...savedStatuses, ...missing.map((status) => ({ ...status }))];
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

function saveStatuses() {
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
  queueCloudPush();
}

function statusLabel(id) {
  return statuses.find((status) => status.id === id)?.label || "Unsorted";
}

function statusColor(id) {
  return statuses.find((status) => status.id === id)?.color || "#cfc8bd";
}

function statusTextColor(hex) {
  const value = (hex || "#cfc8bd").replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#30323a" : "#fdfbf8";
}

function pillStyle(statusId) {
  const color = statusColor(statusId);
  return `background:${color}; color:${statusTextColor(color)}`;
}

function slugifyStatusName(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return `status-${Date.now()}`;

  let candidate = base;
  let suffix = 2;
  while (statuses.some((status) => status.id === candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

const sampleBooks = [
  {
    id: crypto.randomUUID(),
    title: "The Long Way to a Small, Angry Planet",
    author: "Becky Chambers",
    status: "reading",
    rating: "",
    startDate: new Date().toISOString().slice(0, 10),
    finishDate: "",
    year: "2014",
    pages: 443,
    cover: "https://covers.openlibrary.org/b/id/9255566-L.jpg",
    genres: "Science fiction, cozy, found family",
    tags: "comfort read, space",
    notes: "Warm, curious, and easy to come back to.",
  },
  {
    id: crypto.randomUUID(),
    title: "Braiding Sweetgrass",
    author: "Robin Wall Kimmerer",
    status: "finished",
    rating: "",
    startDate: "",
    finishDate: new Date().toISOString().slice(0, 10),
    year: "2013",
    pages: 390,
    cover: "https://covers.openlibrary.org/b/id/8228691-L.jpg",
    genres: "Essays, nature, memoir",
    tags: "nature, reflective",
    notes: "Recommended for slower weekend reading.",
  },
];

let books = loadBooks();
let currentView = "calendar";
let calendarDate = new Date();
let statsYear = String(new Date().getFullYear());

const $ = (selector) => document.querySelector(selector);

const elements = {
  navTabs: document.querySelectorAll(".nav-tab"),
  views: document.querySelectorAll(".view"),
  viewTitle: $("#viewTitle"),
  globalSearch: $("#globalSearch"),
  statusFilter: $("#statusFilter"),
  bookGrid: $("#bookGrid"),
  readingSpotlight: $("#readingSpotlight"),
  spotlightGrid: $("#spotlightGrid"),
  libraryDivider: $("#libraryDivider"),
  shelfBoard: $("#shelfBoard"),
  bookshelfStage: $("#bookshelfStage"),
  statsGrid: $("#statsGrid"),
  statsYearFilter: $("#statsYearFilter"),
  calendarGrid: $("#calendarGrid"),
  calendarMonth: $("#calendarMonth"),
  goToToday: $("#goToToday"),
  monthCount: $("#monthCount"),
  monthPages: $("#monthPages"),
  dialog: $("#bookDialog"),
  bookForm: $("#bookForm"),
  lookupResults: $("#lookupResults"),
  deleteBook: $("#deleteBook"),
  deleteConfirm: $("#deleteConfirm"),
  confirmDelete: $("#confirmDelete"),
  cancelDelete: $("#cancelDelete"),
  statusSelect: $("#status"),
  starRating: $("#starRating"),
  ratingInput: $("#rating"),
  manageStatusesDialog: $("#manageStatusesDialog"),
  statusList: $("#statusList"),
  newStatusForm: $("#newStatusForm"),
  newStatusName: $("#newStatusName"),
  newStatusColor: $("#newStatusColor"),
  dayBooksDialog: $("#dayBooksDialog"),
  dayBooksTitle: $("#dayBooksTitle"),
  dayBooksEyebrow: $("#dayBooksEyebrow"),
  dayBooksList: $("#dayBooksList"),
  importModeDialog: $("#importModeDialog"),
  importMergeChoice: $("#importMergeChoice"),
  importReplaceChoice: $("#importReplaceChoice"),
  importCancelChoice: $("#importCancelChoice"),
  importProgress: $("#importProgress"),
  importProgressText: $("#importProgressText"),
  syncDialog: $("#syncDialog"),
  syncConfigInput: $("#syncConfigInput"),
  syncCodeInput: $("#syncCodeInput"),
  syncStatusBanner: $("#syncStatusBanner"),
  syncDot: $("#syncDot"),
  syncButtonLabel: $("#syncButtonLabel"),
  disconnectSync: $("#disconnectSync"),
};

function loadBooks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return sampleBooks;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : sampleBooks;
  } catch {
    return sampleBooks;
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  queueCloudPush();
}

function filteredBooks() {
  const query = elements.globalSearch.value.trim().toLowerCase();

  return books.filter((book) => {
    const haystack = [book.title, book.author, book.genres, book.tags, stripHtml(book.notes)].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });
}

function render() {
  renderStatusOptions();
  renderCalendar();
  renderLibrary();
  renderShelves();
  renderBookshelf();
  renderStats();
  renderMonthSummary();
}

function renderStatusOptions() {
  const filterValue = elements.statusFilter.value;
  const formValue = elements.statusSelect.value;

  elements.statusFilter.innerHTML =
    '<option value="all">All books</option>' +
    statuses.map((status) => `<option value="${status.id}">${escapeHtml(status.label)}</option>`).join("");
  elements.statusSelect.innerHTML = statuses
    .map((status) => `<option value="${status.id}">${escapeHtml(status.label)}</option>`)
    .join("");

  if (statuses.some((status) => status.id === filterValue)) elements.statusFilter.value = filterValue;
  if (statuses.some((status) => status.id === formValue)) elements.statusSelect.value = formValue;
}

function setView(view) {
  currentView = view;
  elements.viewTitle.textContent = view[0].toUpperCase() + view.slice(1);
  document.body.dataset.view = view;

  elements.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  elements.views.forEach((section) => section.classList.toggle("active", section.id === `${view}View`));

  if (view === "bookshelf") renderBookshelf();
}

// A book occupies a day on the calendar if that day is its start date, its finish
// date, or falls strictly between the two (i.e. still being read that day). Returns
// "started" | "finished" | "in-progress" | null. If startDate and finishDate land on
// the same day, "finished" wins so the book doesn't show twice.
function dayStatusForBook(book, dateKey) {
  if (book.finishDate === dateKey) return "finished";
  if (book.startDate === dateKey) return "started";
  if (book.startDate && book.finishDate && book.startDate < dateKey && dateKey < book.finishDate) {
    return "in-progress";
  }
  return null;
}

function calendarCoverClass(status) {
  // In-progress days reuse the grey "finished" look, since the book isn't done yet
  // but isn't the vivid "just started" moment either.
  if (status === "finished" || status === "in-progress") return "finished-cover";
  return "started-cover";
}

function calendarStatusLabel(status) {
  if (status === "finished") return "Finished";
  if (status === "in-progress") return "Still reading";
  return "Started";
}

function calendarBadgeClass(status) {
  if (status === "finished") return "finished-badge";
  if (status === "in-progress") return "finished-badge";
  return "started-badge";
}

function renderCalendar() {
  const CALENDAR_DAY_PREVIEW_LIMIT = 2;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  elements.goToToday.hidden = isCurrentMonth;

  elements.calendarMonth.textContent = firstDay.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  elements.calendarGrid.innerHTML = "";

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - startOffset + 1;
    const cell = document.createElement("article");
    cell.className = "calendar-day";

    if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
      cell.classList.add("muted-day");
      elements.calendarGrid.append(cell);
      continue;
    }

    const date = new Date(year, month, dayNumber);
    const dateKey = toDateInput(date);
    const entries = books
      .filter((book) => dayStatusForBook(book, dateKey))
      .map((book) => ({ book, status: dayStatusForBook(book, dateKey) }));
    const isToday = dateKey === toDateInput(new Date());

    cell.innerHTML = `<div class="day-top"><span>${dayNumber}</span>${isToday ? "<b>Today</b>" : ""}</div>`;

    entries.slice(0, CALENDAR_DAY_PREVIEW_LIMIT).forEach(({ book, status }) => {
      const coverButton = document.createElement("button");
      coverButton.type = "button";
      coverButton.className = `calendar-cover ${calendarCoverClass(status)}`;
      coverButton.setAttribute("aria-label", `${calendarStatusLabel(status)} ${book.title}`);
      coverButton.innerHTML = coverMarkup(book);
      coverButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openBook(book.id);
      });
      cell.append(coverButton);
    });

    if (entries.length > CALENDAR_DAY_PREVIEW_LIMIT) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "more-count";
      more.textContent = `+${entries.length - CALENDAR_DAY_PREVIEW_LIMIT} more`;
      more.addEventListener("click", (event) => {
        event.stopPropagation();
        openDayBooks(dateKey, entries);
      });
      cell.append(more);
    }

    cell.addEventListener("click", () => openAddBook(dateKey));
    elements.calendarGrid.append(cell);
  }
}

function openDayBooks(dateKey, entries) {
  const dateLabel = new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  elements.dayBooksEyebrow.textContent = dateLabel;
  elements.dayBooksTitle.textContent = `${entries.length} ${entries.length === 1 ? "book" : "books"} logged`;
  elements.dayBooksList.innerHTML = "";

  entries.forEach(({ book, status }) => {
    const row = compactBook(book, {
      badgeText: calendarStatusLabel(status),
      badgeClass: calendarBadgeClass(status),
    });
    elements.dayBooksList.append(row);
  });

  elements.dayBooksList.addEventListener(
    "click",
    () => elements.dayBooksDialog.close(),
    { capture: true, once: true }
  );

  elements.dayBooksDialog.showModal();
}

function renderLibrary() {
  const statusValue = elements.statusFilter.value;
  const searchedBooks = filteredBooks();

  const readingBooks = searchedBooks.filter((book) => book.status === "reading");
  const showSpotlight = readingBooks.length > 0;

  elements.readingSpotlight.hidden = !showSpotlight;
  elements.spotlightGrid.innerHTML = "";
  if (showSpotlight) {
    readingBooks.forEach((book) => elements.spotlightGrid.append(bookCard(book, { featured: true })));
  }

  const restOfLibrary = searchedBooks.filter((book) => {
    if (book.status === "reading") return false;
    return statusValue === "all" || book.status === statusValue;
  });

  elements.libraryDivider.hidden = !showSpotlight;
  elements.bookGrid.innerHTML = "";

  if (!restOfLibrary.length) {
    elements.bookGrid.append(
      emptyState(
        statusValue === "reading"
          ? "Your currently-reading books are shown above."
          : undefined
      )
    );
    return;
  }

  restOfLibrary.forEach((book) => elements.bookGrid.append(bookCard(book)));
}

const SHELF_PREVIEW_LIMIT = 5;

function renderShelves() {
  elements.shelfBoard.innerHTML = "";

  statuses.forEach((status) => {
    const column = document.createElement("section");
    column.className = "shelf-column";
    const shelfBooks = filteredBooks().filter((book) => book.status === status.id);
    const previewBooks = shelfBooks.slice(0, SHELF_PREVIEW_LIMIT);

    column.innerHTML = `
      <div class="shelf-heading">
        <h4>${escapeHtml(status.label)}</h4>
        <span style="background:${status.color}; color:${statusTextColor(status.color)}">${shelfBooks.length}</span>
      </div>
    `;

    const list = document.createElement("div");
    list.className = "shelf-list";
    previewBooks.forEach((book) => list.append(compactBook(book)));
    if (!shelfBooks.length) list.append(emptyState("Nothing on this shelf yet."));
    column.append(list);

    if (shelfBooks.length > SHELF_PREVIEW_LIMIT) {
      const seeMore = document.createElement("button");
      seeMore.type = "button";
      seeMore.className = "ghost-button shelf-see-more";
      seeMore.textContent = `See all ${shelfBooks.length}`;
      seeMore.addEventListener("click", () => openShelfInLibrary(status.id));
      column.append(seeMore);
    }

    elements.shelfBoard.append(column);
  });
}

function openShelfInLibrary(statusId) {
  elements.globalSearch.value = "";
  elements.statusFilter.value = statusId;
  setView("library");
  render();
}

function renderBookshelf() {
  const currentYear = new Date().getFullYear();
  const finishedThisYear = filteredBooks()
    .filter((book) => {
      const finishedDate = book.finishDate ? new Date(`${book.finishDate}T00:00:00`) : null;
      return finishedDate && finishedDate.getFullYear() === currentYear;
    })
    .sort((a, b) => new Date(`${b.finishDate}T00:00:00`) - new Date(`${a.finishDate}T00:00:00`));

  elements.bookshelfStage.innerHTML = "";

  if (!finishedThisYear.length) {
    elements.bookshelfStage.append(emptyState("Finish a book this year and its spine will appear here."));
    return;
  }

  const rows = bucketSpinesIntoRows(finishedThisYear, availableShelfWidth());

  rows.forEach((rowBooks) => {
    const shelf = document.createElement("div");
    shelf.className = "book-spine-shelf";
    rowBooks.forEach(({ book, index }) => shelf.append(bookSpine(book, index)));
    elements.bookshelfStage.append(shelf);
  });
}

function availableShelfWidth() {
  const stage = elements.bookshelfStage;
  const stylePadding = parseFloat(getComputedStyle(stage).paddingLeft || "0") +
    parseFloat(getComputedStyle(stage).paddingRight || "0");
  const measured = stage.clientWidth - stylePadding - 4;
  return measured > 0 ? measured : 900;
}

const SPINE_GAP = 7;

function bucketSpinesIntoRows(orderedBooks, maxRowWidth) {
  const rows = [];
  let currentRow = [];
  let currentWidth = 0;

  orderedBooks.forEach((book, index) => {
    const width = spineWidth(book);
    const additional = currentRow.length ? width + SPINE_GAP : width;

    if (currentRow.length && currentWidth + additional > maxRowWidth) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }

    currentRow.push({ book, index });
    currentWidth += currentRow.length === 1 ? width : width + SPINE_GAP;
  });

  if (currentRow.length) rows.push(currentRow);
  return rows;
}

function booksTouchYear(book, year) {
  const startYear = book.startDate ? Number(book.startDate.slice(0, 4)) : null;
  const finishYear = book.finishDate ? Number(book.finishDate.slice(0, 4)) : null;
  return startYear === year || finishYear === year;
}

function availableStatsYears() {
  const years = new Set();
  books.forEach((book) => {
    if (book.startDate) years.add(Number(book.startDate.slice(0, 4)));
    if (book.finishDate) years.add(Number(book.finishDate.slice(0, 4)));
  });
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}

function renderStatsYearOptions() {
  const previousValue = elements.statsYearFilter.value || statsYear;
  const years = availableStatsYears();

  elements.statsYearFilter.innerHTML =
    `<option value="all">All time</option>` +
    years.map((year) => `<option value="${year}">${year}</option>`).join("");

  const validValue = previousValue === "all" || years.some((year) => String(year) === previousValue)
    ? previousValue
    : String(new Date().getFullYear());

  elements.statsYearFilter.value = validValue;
  statsYear = validValue;
}

function renderStats() {
  renderStatsYearOptions();

  const isAllTime = statsYear === "all";
  const year = Number(statsYear);

  const scopedBooks = isAllTime ? books : books.filter((book) => booksTouchYear(book, year));
  const finished = scopedBooks.filter((book) => {
    if (book.status !== "finished") return false;
    if (isAllTime) return true;
    return book.finishDate && Number(book.finishDate.slice(0, 4)) === year;
  });
  const pages = finished.reduce((sum, book) => sum + Number(book.pages || 0), 0);
  const rated = finished.filter((book) => book.rating);
  const averageRating = rated.length
    ? (rated.reduce((sum, book) => sum + Number(book.rating), 0) / rated.length).toFixed(1)
    : "No ratings";
  const genreCounts = finished
    .flatMap((book) => String(book.genres || "").split(","))
    .map((genre) => genre.trim())
    .filter(Boolean)
    .reduce((counts, genre) => ({ ...counts, [genre]: (counts[genre] || 0) + 1 }), {});
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Add genres";

  const currentlyReading = books.filter((book) => {
    if (book.status !== "reading") return false;
    if (isAllTime) return true;
    if (!book.startDate) return false;
    return Number(book.startDate.slice(0, 4)) === year;
  });

  const cards = [
    ["Total books", scopedBooks.length],
    ["Finished", finished.length],
    ["Pages read", pages.toLocaleString()],
    ["Average rating", averageRating],
    ["Favorite genre", topGenre],
    ["Currently reading", currentlyReading.length],
  ];

  elements.statsGrid.innerHTML = "";
  cards.forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    elements.statsGrid.append(card);
  });
}

function renderMonthSummary() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthlyBooks = books.filter((book) => {
    const finishedDate = book.finishDate ? new Date(`${book.finishDate}T00:00:00`) : null;
    return finishedDate && finishedDate.getFullYear() === year && finishedDate.getMonth() === month;
  });
  const pages = monthlyBooks.reduce((sum, book) => sum + Number(book.pages || 0), 0);

  elements.monthCount.textContent = `${monthlyBooks.length} ${monthlyBooks.length === 1 ? "book" : "books"}`;
  elements.monthPages.textContent = `${pages.toLocaleString()} pages logged`;
}

function bookCard(book, { featured = false } = {}) {
  const card = document.createElement("article");
  const isReading = book.status === "reading";
  card.className = `book-card${isReading ? " status-reading" : ""}${featured ? " book-card-featured" : ""}`;
  card.innerHTML = `
    <div class="cover-wrap">${coverMarkup(book)}</div>
    <div class="book-card-body">
      <span class="status-pill" style="${pillStyle(book.status)}">${escapeHtml(statusLabel(book.status))}</span>
      <h4>${escapeHtml(book.title)}</h4>
      <p>${escapeHtml(book.author || "Unknown author")}</p>
      <div class="meta-line">
        <span>${book.year || "No year"}</span>
        <span>${book.pages ? `${book.pages} pages` : "No page count"}</span>
        <span>${book.rating ? `${book.rating} stars` : "Unrated"}</span>
      </div>
    </div>
  `;
  card.addEventListener("click", () => openBook(book.id));
  return card;
}

function compactBook(book, { badgeText = "", badgeClass = "" } = {}) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "compact-book";
  item.innerHTML = `
    ${coverMarkup(book)}
    <span>
      <strong>${escapeHtml(book.title)}</strong>
      <small>${escapeHtml(book.author || "Unknown author")}</small>
      ${badgeText ? `<small class="day-book-badge ${badgeClass}">${escapeHtml(badgeText)}</small>` : ""}
    </span>
  `;
  item.addEventListener("click", () => openBook(book.id));
  return item;
}

function bookSpine(book, index) {
  const spine = document.createElement("button");
  spine.type = "button";
  spine.className = "book-spine";
  spine.style.setProperty("--spine-height", `${spineHeight(book)}px`);
  spine.style.setProperty("--spine-width", `${spineWidth(book)}px`);
  spine.style.setProperty("--spine-color", fallbackSpineColor(book, index));
  spine.style.setProperty("--spine-shade", shadeColor(fallbackSpineColor(book, index), -22));
  spine.innerHTML = `
    <span class="spine-title">${escapeHtml(book.title)}</span>
    <span class="spine-author">${escapeHtml(book.author || "Unknown")}</span>
  `;
  applyCoverColor(book, spine);
  spine.addEventListener("click", () => openBook(book.id));
  return spine;
}

function spineHeight(book) {
  const pageBaseline = 150 + Math.min(Number(book.pages || 220), 620) / 9;
  const jitter = hashString(`height:${book.id || book.title}`) % 95;
  return Math.round(pageBaseline + jitter);
}

function coverMarkup(book) {
  if (book.cover) {
    return `<img src="${escapeAttribute(book.cover)}" alt="Cover of ${escapeAttribute(book.title)}" loading="lazy" />`;
  }

  return `<div class="cover-placeholder" aria-hidden="true">${escapeHtml((book.title || "?").slice(0, 1))}</div>`;
}

function emptyState(message = "Add a book manually or search Open Library to pre-fill the details.") {
  const template = $("#emptyStateTemplate").content.cloneNode(true);
  template.querySelector("p").textContent = message;
  return template;
}

function openAddBook(date = "") {
  elements.bookForm.reset();
  $("#bookId").value = "";
  $("#notes").innerHTML = "";
  $("#startDate").value = date;
  $("#status").value = date ? "reading" : "want";
  setStarRatingFromValue("");
  $("#dialogTitle").textContent = "Add a book";
  elements.deleteBook.hidden = true;
  elements.deleteConfirm.hidden = true;
  elements.lookupResults.innerHTML = "";
  elements.dialog.showModal();
}

function openBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;

  $("#bookId").value = book.id;
  $("#title").value = book.title || "";
  $("#author").value = book.author || "";
  $("#status").value = book.status || "want";
  setStarRatingFromValue(book.rating);
  $("#startDate").value = book.startDate || "";
  $("#finishDate").value = book.finishDate || "";
  $("#year").value = book.year || "";
  $("#pages").value = book.pages || "";
  $("#cover").value = book.cover || "";
  $("#genres").value = book.genres || "";
  $("#tags").value = book.tags || "";
  $("#notes").innerHTML = notesToEditableHtml(book.notes);
  $("#dialogTitle").textContent = "Edit book";
  elements.deleteBook.hidden = false;
  elements.deleteConfirm.hidden = true;
  elements.lookupResults.innerHTML = "";
  elements.dialog.showModal();
}

function collectFormBook() {
  return {
    id: $("#bookId").value || crypto.randomUUID(),
    title: $("#title").value.trim(),
    author: $("#author").value.trim(),
    status: $("#status").value,
    rating: $("#rating").value,
    startDate: $("#startDate").value,
    finishDate: $("#finishDate").value,
    year: $("#year").value.trim(),
    pages: Number($("#pages").value || 0),
    cover: $("#cover").value.trim(),
    genres: $("#genres").value.trim(),
    tags: $("#tags").value.trim(),
    notes: collectNotesHtml(),
  };
}

async function searchBooks() {
  const query = $("#bookLookup").value.trim();
  if (!query) return;

  elements.lookupResults.innerHTML = '<p class="lookup-message">Searching...</p>';

  try {
    const fields = "key,title,author_name,first_publish_year,number_of_pages_median,subject,cover_i";
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=${fields}`
    );
    if (!response.ok) throw new Error("Search failed");
    const data = await response.json();
    renderLookupResults(data.docs || []);
  } catch {
    elements.lookupResults.innerHTML = '<p class="lookup-message">Search is unavailable right now. You can still add the book manually.</p>';
  }
}

function renderLookupResults(results) {
  elements.lookupResults.innerHTML = "";

  if (!results.length) {
    elements.lookupResults.innerHTML = '<p class="lookup-message">No matches found. Manual entry is ready below.</p>';
    return;
  }

  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lookup-result";
    const cover = result.cover_i ? `https://covers.openlibrary.org/b/id/${result.cover_i}-M.jpg` : "";
    button.innerHTML = `
      ${cover ? `<img src="${cover}" alt="" />` : '<div class="mini-cover"></div>'}
      <span>
        <strong>${escapeHtml(result.title || "Untitled")}</strong>
        <small>${escapeHtml(result.author_name?.slice(0, 2).join(", ") || "Unknown author")}</small>
      </span>
    `;
    button.addEventListener("click", () => fillFromLookup(result));
    elements.lookupResults.append(button);
  });
}

function fillFromLookup(result) {
  $("#title").value = result.title || "";
  $("#author").value = result.author_name?.slice(0, 3).join(", ") || "";
  $("#year").value = result.first_publish_year || "";
  $("#pages").value = result.number_of_pages_median || "";
  $("#genres").value = result.subject?.slice(0, 5).join(", ") || "";
  $("#cover").value = result.cover_i ? `https://covers.openlibrary.org/b/id/${result.cover_i}-L.jpg` : "";
}

function exportData() {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chapter-garden-${toDateInput(new Date())}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const isCsv = /\.csv$/i.test(file.name);

  try {
    if (isCsv) {
      await importGoodreadsCsv(file);
    } else {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported)) throw new Error("Invalid file");
      const mode = books.length ? await promptImportMode() : "replace";
      if (mode === "cancel") return;
      const incoming = imported.map((book) => ({ ...book, id: book.id || crypto.randomUUID() }));
      books = mode === "merge" ? mergeBooks(books, incoming) : incoming;
      saveBooks();
      render();
    }
  } catch (error) {
    if (error?.message !== "cancelled") {
      alert(
        isCsv
          ? "That file does not look like a Goodreads export CSV."
          : "That file does not look like a Chapter Garden export."
      );
    }
  } finally {
    event.target.value = "";
  }
}

// ---------- CSV parsing (RFC 4180 aware: handles quoted fields with commas/newlines) ----------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

function csvRowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] || "").trim();
    });
    return record;
  });
}

// ---------- Goodreads mapping ----------

const goodreadsShelfMap = {
  read: "finished",
  "currently-reading": "reading",
  "to-read": "want",
  "on-hold": "paused",
  "did-not-finish": "dnf",
};

function goodreadsDateToIso(value) {
  if (!value) return "";
  const match = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : toDateInput(parsed);
}

function cleanGoodreadsNumber(value) {
  const num = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : "";
}

function goodreadsBookshelvesToTags(record) {
  const exclusiveShelf = (record["Exclusive Shelf"] || "").trim().toLowerCase();
  const raw = record["Bookshelves"] || "";

  return raw
    .split(",")
    .map((shelfName) => shelfName.trim())
    .filter((shelfName) => shelfName && shelfName.toLowerCase() !== exclusiveShelf)
    .join(", ");
}

function mapGoodreadsRow(record) {
  const shelf = (record["Exclusive Shelf"] || "").trim().toLowerCase();
  const status = goodreadsShelfMap[shelf] || "want";
  const rating = Number(record["My Rating"] || 0);
  const isbn13 = (record["ISBN13"] || "").replace(/[="]/g, "").trim();
  const isbn = (record["ISBN"] || "").replace(/[="]/g, "").trim();

  return {
    id: crypto.randomUUID(),
    title: record["Title"] || "",
    author: record["Author"] || record["Author l-f"] || "",
    status,
    rating: rating > 0 ? String(rating) : "",
    // Goodreads exports don't track a real "date started" — "Date Added" is just
    // when the book was added to a shelf, which would mislabel the calendar.
    // Leave startDate blank; finishDate is the only date we can trust from Goodreads.
    startDate: "",
    finishDate: goodreadsDateToIso(record["Date Read"]),
    year: record["Original Publication Year"] || record["Year Published"] || "",
    pages: cleanGoodreadsNumber(record["Number of Pages"]),
    cover: "",
    genres: "",
    tags: goodreadsBookshelvesToTags(record),
    notes: record["My Review"] || "",
    _isbn: isbn13 || isbn || "",
  };
}

function stripIsbn(book) {
  const { _isbn, ...rest } = book;
  return rest;
}

// ---------- Open Library enrichment (cover + genres by ISBN) ----------

async function enrichBookFromOpenLibrary(book) {
  if (!book._isbn) return book;

  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${book._isbn}&jscmd=data&format=json`
    );
    if (!response.ok) return book;
    const data = await response.json();
    const details = data[`ISBN:${book._isbn}`];
    if (!details) return book;

    const cover = details.cover?.large || details.cover?.medium || "";
    const genres = (details.subjects || []).slice(0, 5).map((subject) => subject.name).join(", ");

    return {
      ...book,
      cover: cover || book.cover,
      genres: genres || book.genres,
    };
  } catch {
    return book;
  }
}

async function enrichBooksFromOpenLibrary(mappedBooks, onProgress) {
  const enriched = [];
  for (let index = 0; index < mappedBooks.length; index += 1) {
    const book = mappedBooks[index];
    enriched.push(await enrichBookFromOpenLibrary(book));
    onProgress?.(index + 1, mappedBooks.length);
  }
  return enriched;
}

// ---------- Import mode prompt (merge / replace / cancel) ----------

function promptImportMode(copy = {}) {
  const {
    eyebrow = "Import books",
    title = "You already have books saved",
    body = "Add the imported books to your existing library, or replace your library with the imported file?",
  } = copy;

  $("#importModeEyebrow").textContent = eyebrow;
  $("#importModeTitle").textContent = title;
  $("#importModeBody").textContent = body;

  return new Promise((resolve) => {
    const dialog = elements.importModeDialog;
    const handleChoice = (mode) => {
      dialog.close();
      cleanup();
      resolve(mode);
    };

    const mergeHandler = () => handleChoice("merge");
    const replaceHandler = () => handleChoice("replace");
    const cancelHandler = () => handleChoice("cancel");

    function cleanup() {
      elements.importMergeChoice.removeEventListener("click", mergeHandler);
      elements.importReplaceChoice.removeEventListener("click", replaceHandler);
      elements.importCancelChoice.removeEventListener("click", cancelHandler);
      dialog.removeEventListener("cancel", onDialogCancel);
    }

    function onDialogCancel() {
      cleanup();
      resolve("cancel");
    }

    elements.importMergeChoice.addEventListener("click", mergeHandler);
    elements.importReplaceChoice.addEventListener("click", replaceHandler);
    elements.importCancelChoice.addEventListener("click", cancelHandler);
    dialog.addEventListener("cancel", onDialogCancel);

    dialog.showModal();
  });
}

function mergeBooks(existing, incoming) {
  const key = (book) => `${(book.title || "").trim().toLowerCase()}::${(book.author || "").trim().toLowerCase()}`;
  const existingKeys = new Set(existing.map(key));
  const newOnes = incoming.filter((book) => !existingKeys.has(key(book)));
  return [...existing, ...newOnes];
}

// ---------- Goodreads CSV import flow ----------

async function importGoodreadsCsv(file) {
  const text = await file.text();
  const rows = csvRowsToObjects(parseCsv(text));
  if (!rows.length || !("Title" in rows[0])) throw new Error("Invalid Goodreads CSV");

  const mapped = rows.map(mapGoodreadsRow).filter((book) => book.title);
  if (!mapped.length) throw new Error("No books found in CSV");

  const mode = books.length ? await promptImportMode() : "replace";
  if (mode === "cancel") return;

  showImportProgress(0, mapped.length);
  const enriched = await enrichBooksFromOpenLibrary(mapped, (done, total) => showImportProgress(done, total));
  hideImportProgress();

  const finalBooks = enriched.map(stripIsbn);
  books = mode === "merge" ? mergeBooks(books, finalBooks) : finalBooks;
  saveBooks();
  render();
}

function showImportProgress(done, total) {
  elements.importProgress.hidden = false;
  elements.importProgressText.textContent = `Fetching covers and genres… ${done} of ${total}`;
}

function hideImportProgress() {
  elements.importProgress.hidden = true;
}

// ---------- Cloud sync (optional, lets the same library appear on multiple devices) ----------
//
// localStorage only lives inside one browser on one device, so by default nothing here
// crosses devices. If the person connects a Firebase project, we mirror `books` and
// `statuses` to a single Firestore document (keyed by a private "library code" they choose)
// and listen for changes so every connected device converges on the same data.
//
// This is intentionally simple last-write-wins sync, not real-time conflict resolution:
// if two devices edit while both offline, whichever saves last "wins" once both reconnect.

const syncState = {
  docRef: null,
  unsubscribe: null,
};

let cloudPushHandle = null;

function isSyncConnected() {
  return Boolean(syncState.docRef);
}

function loadSyncConfig() {
  const stored = localStorage.getItem(SYNC_CONFIG_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveSyncConfig(value) {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(value));
}

function clearSyncConfig() {
  localStorage.removeItem(SYNC_CONFIG_KEY);
}

function generateSyncCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((value) => value.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 14);
}

// Firebase config copied from the console is often a JS object literal (unquoted keys,
// a leading "const firebaseConfig = ", a trailing semicolon) rather than strict JSON.
// Accept either.
function parseFirebaseConfigInput(raw) {
  let text = raw.trim();
  text = text.replace(/^[^{]*?=\s*/, "");
  text = text.replace(/;\s*$/, "");

  try {
    return JSON.parse(text);
  } catch {
    const quoted = text.replace(/([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)/g, '$1"$2"$3');
    return JSON.parse(quoted);
  }
}

function setSyncStatus(state, message = "") {
  const messages = {
    idle: "Not connected — books are saved only on this device.",
    connecting: "Connecting…",
    synced: "Synced — this device is connected.",
    error: message ? `Sync error: ${message}` : "Sync error. Check your config and library code.",
  };

  if (elements.syncStatusBanner) {
    elements.syncStatusBanner.textContent = messages[state] || messages.idle;
    elements.syncStatusBanner.className = `sync-status${state === "synced" ? " is-connected" : ""}${
      state === "error" ? " is-error" : ""
    }`;
  }

  if (elements.syncDot) {
    elements.syncDot.classList.toggle("is-connected", state === "synced");
    elements.syncDot.classList.toggle("is-pending", state === "connecting");
  }

  if (elements.syncButtonLabel) {
    elements.syncButtonLabel.textContent = state === "synced" ? "Synced" : "Sync devices";
  }

  if (elements.disconnectSync) {
    elements.disconnectSync.hidden = state === "idle";
  }
}

async function connectSync(configObj, code, { isReconnect = false } = {}) {
  setSyncStatus("connecting");

  const app = window.firebase.apps.length ? window.firebase.apps[0] : window.firebase.initializeApp(configObj);
  await window.firebase.auth().signInAnonymously();
  const db = window.firebase.firestore();
  const docRef = db.collection("libraries").doc(code);
  const snapshot = await docRef.get();

  let mode = "replace";

  if (snapshot.exists) {
    const cloud = snapshot.data() || {};
    const cloudBooks = Array.isArray(cloud.books) ? cloud.books : [];

    if (!isReconnect && books.length && cloudBooks.length) {
      mode = await promptImportMode({
        eyebrow: "Cloud sync",
        title: "This library code already has books saved",
        body: "Add the books already on this device to the synced library, or replace them with what's already saved in the cloud?",
      });
      if (mode === "cancel") {
        setSyncStatus("idle");
        return;
      }
    }

    books = mode === "merge" ? mergeBooks(books, cloudBooks) : cloudBooks;
    if (Array.isArray(cloud.statuses) && cloud.statuses.length) statuses = cloud.statuses;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
    render();
  }

  syncState.unsubscribe?.();
  syncState.docRef = docRef;
  syncState.unsubscribe = docRef.onSnapshot(handleRemoteSnapshot, handleSyncError);
  saveSyncConfig({ config: configObj, code });

  if (!snapshot.exists || mode === "merge") await pushCloudState();

  setSyncStatus("synced");
}

function disconnectSync() {
  syncState.unsubscribe?.();
  syncState.docRef = null;
  syncState.unsubscribe = null;
  clearSyncConfig();
  setSyncStatus("idle");
}

function handleRemoteSnapshot(snapshot) {
  if (snapshot.metadata.hasPendingWrites) return;
  const data = snapshot.data();
  if (!data) return;

  books = Array.isArray(data.books) ? data.books : books;
  if (Array.isArray(data.statuses) && data.statuses.length) statuses = data.statuses;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
  render();
  setSyncStatus("synced");
}

function handleSyncError(error) {
  setSyncStatus("error", error.message);
}

function queueCloudPush() {
  if (!isSyncConnected()) return;
  if (cloudPushHandle) clearTimeout(cloudPushHandle);
  cloudPushHandle = setTimeout(pushCloudState, 350);
}

async function pushCloudState() {
  if (!syncState.docRef) return;
  try {
    await syncState.docRef.set({
      books,
      statuses,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    setSyncStatus("error", error.message);
  }
}

function openSyncDialog() {
  const stored = loadSyncConfig();
  if (stored) {
    elements.syncConfigInput.value = JSON.stringify(stored.config, null, 2);
    elements.syncCodeInput.value = stored.code;
  }
  elements.syncDialog.showModal();
}

async function handleConnectSyncClick() {
  const raw = elements.syncConfigInput.value.trim();
  const code = elements.syncCodeInput.value.trim();

  if (!raw || !code) {
    setSyncStatus("error", "Paste your Firebase config and enter a library code first.");
    return;
  }

  if (typeof window.firebase === "undefined") {
    setSyncStatus("error", "Sync libraries did not load. Check your connection and try again.");
    return;
  }

  let configObj;
  try {
    configObj = parseFirebaseConfigInput(raw);
  } catch {
    setSyncStatus("error", "That doesn't look like valid Firebase config. Paste the object from your Firebase project settings.");
    return;
  }

  try {
    await connectSync(configObj, code, { isReconnect: false });
    if (isSyncConnected()) elements.syncDialog.close();
  } catch (error) {
    setSyncStatus("error", error.message);
  }
}

function handleDisconnectSyncClick() {
  const confirmed = confirm(
    "Disconnect this device from cloud sync? Books already here stay on this device, but new changes won't reach your other devices until you reconnect."
  );
  if (!confirmed) return;
  disconnectSync();
  elements.syncConfigInput.value = "";
  elements.syncCodeInput.value = "";
}

async function initSyncFromStoredConfig() {
  const stored = loadSyncConfig();
  if (!stored || typeof window.firebase === "undefined") {
    setSyncStatus("idle");
    return;
  }

  try {
    await connectSync(stored.config, stored.code, { isReconnect: true });
  } catch (error) {
    setSyncStatus("error", error.message);
  }
}

function toDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function spineWidth(book) {
  const pageCount = Number(book.pages || 0);
  if (pageCount > 0) return Math.round(32 + Math.min(pageCount, 900) / 18);

  return 38 + (hashString(book.id || book.title) % 38);
}

function fallbackSpineColor(book, index = 0) {
  const colors = ["#61745f", "#8a9a73", "#9f8170", "#6f7f68", "#b19a6b", "#7b6f58"];
  return colors[(hashString(book.cover || book.title || String(index)) + index) % colors.length];
}

function applyCoverColor(book, spine) {
  if (!book.cover) return;

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    try {
      const color = dominantImageColor(image);
      spine.style.setProperty("--spine-color", color);
      spine.style.setProperty("--spine-shade", shadeColor(color, -24));
    } catch {
      // Fallback colors stay in place when a cover cannot be sampled.
    }
  };
  image.src = book.cover;
}

function dominantImageColor(image) {
  const canvas = document.createElement("canvas");
  const size = 24;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;
  const buckets = new Map();

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 180) continue;

    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    if (r + g + b > 720 || r + g + b < 70) continue;

    const key = `${Math.round(r / 24) * 24},${Math.round(g / 24) * 24},${Math.round(b / 24) * 24}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const dominant = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return dominant ? `rgb(${dominant})` : "#61745f";
}

function shadeColor(color, percent) {
  let r;
  let g;
  let b;

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    const match = color.match(/\d+/g);
    if (!match) return color;
    [r, g, b] = match.map(Number);
  }

  const adjust = (value) => Math.max(0, Math.min(255, Math.round(value + (percent / 100) * 255)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

function hashString(value) {
  return String(value).split("").reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

// ---------- Rich text notes editor ----------

// Tags the notes editor is allowed to save. Anything else (scripts, styles,
// spans with inline styles, etc.) gets unwrapped so only its text remains.
const ALLOWED_NOTE_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "BR", "P", "DIV", "A"]);

function sanitizeHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const toUnwrap = [];
  let node = walker.nextNode();

  while (node) {
    if (ALLOWED_NOTE_TAGS.has(node.tagName)) {
      [...node.attributes].forEach((attribute) => {
        if (node.tagName === "A" && attribute.name === "href") {
          if (/^\s*javascript:/i.test(attribute.value)) node.removeAttribute("href");
        } else {
          node.removeAttribute(attribute.name);
        }
      });
    } else {
      toUnwrap.push(node);
    }
    node = walker.nextNode();
  }

  toUnwrap.forEach((element) => element.replaceWith(...element.childNodes));
  return template.innerHTML;
}

// Notes saved before the rich text editor existed (or imported from CSV) are
// plain text. Detect that case and escape + linebreak it instead of letting
// raw text be parsed as HTML.
function notesToEditableHtml(notes) {
  const value = notes || "";
  if (/<[a-z][\s\S]*>/i.test(value)) return sanitizeHtml(value);
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function collectNotesHtml() {
  const editor = $("#notes");
  const isEmpty = !editor.textContent.trim() && !editor.querySelector("ul, ol, img");
  return isEmpty ? "" : sanitizeHtml(editor.innerHTML);
}

function stripHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = value || "";
  return template.content.textContent || "";
}

function setupNotesEditor() {
  const editor = $("#notes");
  const toolbar = document.querySelector(".rte-toolbar");
  if (!editor || !toolbar || editor.dataset.rteBound) return;
  editor.dataset.rteBound = "true";

  const updateToolbarState = () => {
    toolbar.querySelectorAll(".rte-btn[data-command]").forEach((button) => {
      const command = button.dataset.command;
      if (command === "removeFormat") return;
      try {
        button.classList.toggle("is-active", document.queryCommandState(command));
      } catch {
        // queryCommandState can throw for unsupported commands; ignore.
      }
    });
  };

  toolbar.querySelectorAll(".rte-btn").forEach((button) => {
    // Prevent the editor from losing focus/selection before the command runs.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      editor.focus();
      document.execCommand(button.dataset.command, false, null);
      updateToolbarState();
    });
  });

  editor.addEventListener("keyup", updateToolbarState);
  editor.addEventListener("mouseup", updateToolbarState);
  editor.addEventListener("focus", updateToolbarState);
}

// ---------- Star rating widget (supports half-star precision) ----------

const STAR_PATH =
  "M12 2.4l2.74 6.49 7.02.59-5.34 4.63 1.63 6.86L12 17.27l-6.05 3.7 1.63-6.86L2.24 9.48l7.02-.59z";

function buildStarRating() {
  const container = elements.starRating;
  if (!container || container.dataset.built) return;
  container.dataset.built = "true";
  container.dataset.value = "";

  for (let index = 0; index < 5; index += 1) {
    const starButton = document.createElement("button");
    starButton.type = "button";
    starButton.className = "star-button";
    starButton.dataset.starIndex = String(index);
    starButton.setAttribute("aria-label", `Rate ${index + 1} stars, or half star`);
    starButton.innerHTML = `
      <svg viewBox="0 0 24 24" class="star-icon star-icon-back" aria-hidden="true">
        <path d="${STAR_PATH}"></path>
      </svg>
      <svg viewBox="0 0 24 24" class="star-icon star-icon-fill" aria-hidden="true">
        <defs>
          <clipPath id="starClip${index}">
            <rect x="0" y="0" width="0" height="24"></rect>
          </clipPath>
        </defs>
        <path d="${STAR_PATH}" clip-path="url(#starClip${index})"></path>
      </svg>
      <span class="star-half-zone star-half-left" data-half="0.5"></span>
      <span class="star-half-zone star-half-right" data-half="1"></span>
    `;

    starButton.addEventListener("mousemove", (event) => {
      const value = starHoverValue(starButton, index, event.clientX);
      paintStars(container, value);
    });

    starButton.addEventListener("mouseleave", () => {
      paintStars(container, Number(container.dataset.value || 0));
    });

    starButton.addEventListener("click", (event) => {
      const value = starHoverValue(starButton, index, event.clientX);
      setStarRating(value);
    });

    container.append(starButton);
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "star-clear";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => setStarRating(0));
  container.append(clearButton);

  paintStars(container, 0);

  container.addEventListener("mouseleave", () => {
    paintStars(container, Number(container.dataset.value || 0));
  });

  container.addEventListener("keydown", (event) => {
    const current = Number(container.dataset.value || 0);
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setStarRating(Math.min(5, current + 0.5));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setStarRating(Math.max(0, current - 0.5));
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setStarRating(0);
    }
  });
}

function starHoverValue(starButton, index, clientX) {
  const bounds = starButton.getBoundingClientRect();
  const isLeftHalf = clientX - bounds.left < bounds.width / 2;
  return index + (isLeftHalf ? 0.5 : 1);
}

function paintStars(container, value) {
  container.querySelectorAll(".star-button").forEach((starButton) => {
    const index = Number(starButton.dataset.starIndex);
    const fillSvg = starButton.querySelector(".star-icon-fill");
    const fillAmount = Math.max(0, Math.min(1, value - index));
    fillSvg.querySelector("clipPath rect").setAttribute("width", String(fillAmount * 24));
    starButton.classList.toggle("is-half", fillAmount > 0 && fillAmount < 1);
    starButton.classList.toggle("is-filled", fillAmount >= 1);
    starButton.classList.toggle("is-empty", fillAmount === 0);
  });
}

function setStarRating(value) {
  const container = elements.starRating;
  const clamped = Math.max(0, Math.min(5, value));
  container.dataset.value = clamped ? String(clamped) : "";
  elements.ratingInput.value = clamped ? String(clamped) : "";
  container.setAttribute("aria-valuenow", String(clamped));
  container.setAttribute("aria-valuetext", clamped ? `${clamped} out of 5 stars` : "Not rated");
  paintStars(container, clamped);
}

function setStarRatingFromValue(rawValue) {
  const numeric = Number(rawValue || 0);
  setStarRating(Number.isFinite(numeric) ? numeric : 0);
}

function openManageStatuses() {
  renderStatusList();
  elements.newStatusForm.reset();
  elements.newStatusColor.value = "#b6c9d8";
  elements.manageStatusesDialog.showModal();
}

function renderStatusList() {
  elements.statusList.innerHTML = "";

  statuses.forEach((status) => {
    const count = books.filter((book) => book.status === status.id).length;
    const row = document.createElement("div");
    row.className = "status-row";
    row.innerHTML = `
      <input
        type="color"
        class="status-row-color"
        value="${status.color}"
        aria-label="Color for ${escapeAttribute(status.label)}"
      />
      <input
        type="text"
        class="status-row-name"
        value="${escapeAttribute(status.label)}"
        aria-label="Name for ${escapeAttribute(status.label)}"
      />
      <span class="status-row-count">${count} ${count === 1 ? "book" : "books"}</span>
      ${status.builtIn ? '<span class="status-row-builtin">Built-in</span>' : ""}
      ${!status.builtIn ? '<button type="button" class="ghost-button status-row-delete">Remove</button>' : ""}
    `;

    const colorInput = row.querySelector(".status-row-color");
    const nameInput = row.querySelector(".status-row-name");

    colorInput.addEventListener("change", () => updateStatus(status.id, { color: colorInput.value }));
    nameInput.addEventListener("change", () => updateStatus(status.id, { label: nameInput.value }));

    if (!status.builtIn) {
      row.querySelector(".status-row-delete").addEventListener("click", () => startRemoveStatus(row, status, count));
    }

    elements.statusList.append(row);
  });
}

function addStatus(name, color) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const id = slugifyStatusName(trimmedName);
  statuses.push({ id, label: trimmedName, color, builtIn: false });
  saveStatuses();
  renderStatusList();
  render();
}

function updateStatus(id, updates) {
  const status = statuses.find((item) => item.id === id);
  if (!status) return;

  if (typeof updates.label === "string") {
    const trimmedLabel = updates.label.trim();
    if (!trimmedLabel) {
      renderStatusList();
      return;
    }
    status.label = trimmedLabel;
  }

  if (updates.color) status.color = updates.color;

  saveStatuses();
  renderStatusList();
  render();
}

function startRemoveStatus(row, status, count) {
  if (count === 0) {
    if (!confirm(`Remove the "${status.label}" shelf?`)) return;
    finishRemoveStatus(status.id);
    return;
  }

  if (row.querySelector(".status-reassign")) return;

  const otherStatuses = statuses.filter((item) => item.id !== status.id);
  if (!otherStatuses.length) {
    alert("Add another shelf first so these books have somewhere to go.");
    return;
  }

  const panel = document.createElement("div");
  panel.className = "status-reassign";
  panel.innerHTML = `
    <span>Move ${count} ${count === 1 ? "book" : "books"} to</span>
    <select class="status-reassign-select" aria-label="Move books to shelf">
      ${otherStatuses.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}
    </select>
    <button type="button" class="danger-button status-reassign-confirm">Move &amp; remove</button>
    <button type="button" class="ghost-button status-reassign-cancel">Cancel</button>
  `;

  panel.querySelector(".status-reassign-confirm").addEventListener("click", () => {
    const destinationId = panel.querySelector(".status-reassign-select").value;
    books = books.map((book) => (book.status === status.id ? { ...book, status: destinationId } : book));
    saveBooks();
    finishRemoveStatus(status.id);
  });

  panel.querySelector(".status-reassign-cancel").addEventListener("click", () => panel.remove());

  row.append(panel);
}

function finishRemoveStatus(id) {
  statuses = statuses.filter((status) => status.id !== id);
  saveStatuses();
  renderStatusList();
  render();
}

elements.navTabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
elements.globalSearch.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.statsYearFilter.addEventListener("change", () => {
  statsYear = elements.statsYearFilter.value;
  renderStats();
});

$("#manageStatuses").addEventListener("click", openManageStatuses);
$("#closeManageStatuses").addEventListener("click", () => elements.manageStatusesDialog.close());
elements.manageStatusesDialog.addEventListener("click", (event) => {
  if (event.target === elements.manageStatusesDialog) elements.manageStatusesDialog.close();
});
elements.newStatusForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addStatus(elements.newStatusName.value, elements.newStatusColor.value);
  elements.newStatusForm.reset();
  elements.newStatusColor.value = "#b6c9d8";
});

$("#closeDayBooks").addEventListener("click", () => elements.dayBooksDialog.close());
elements.dayBooksDialog.addEventListener("click", (event) => {
  if (event.target === elements.dayBooksDialog) elements.dayBooksDialog.close();
});

$("#openAddBook").addEventListener("click", () => openAddBook());
$("#closeDialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialog.addEventListener("close", () => {
  elements.deleteConfirm.hidden = true;
});
$("#clearForm").addEventListener("click", () => {
  elements.bookForm.reset();
  $("#bookId").value = "";
  $("#notes").innerHTML = "";
  setStarRatingFromValue("");
});
$("#lookupButton").addEventListener("click", searchBooks);
$("#bookLookup").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchBooks();
  }
});
$("#prevMonth").addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  render();
});
$("#nextMonth").addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  render();
});
elements.goToToday.addEventListener("click", () => {
  calendarDate = new Date();
  render();
});
$("#exportData").addEventListener("click", exportData);
$("#importData").addEventListener("change", importData);

$("#openSync").addEventListener("click", openSyncDialog);
$("#closeSyncDialog").addEventListener("click", () => elements.syncDialog.close());
elements.syncDialog.addEventListener("click", (event) => {
  if (event.target === elements.syncDialog) elements.syncDialog.close();
});
$("#generateSyncCode").addEventListener("click", () => {
  elements.syncCodeInput.value = generateSyncCode();
});
$("#connectSync").addEventListener("click", handleConnectSyncClick);
elements.disconnectSync.addEventListener("click", handleDisconnectSyncClick);

elements.bookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const book = collectFormBook();
  const existingIndex = books.findIndex((item) => item.id === book.id);

  if (existingIndex >= 0) books[existingIndex] = book;
  else books.unshift(book);

  saveBooks();
  render();
  elements.dialog.close();
});

elements.deleteBook.addEventListener("click", () => {
  const id = $("#bookId").value;
  if (!id) return;
  elements.deleteConfirm.hidden = false;
});

elements.cancelDelete.addEventListener("click", () => {
  elements.deleteConfirm.hidden = true;
});

elements.confirmDelete.addEventListener("click", () => {
  const id = $("#bookId").value;
  if (!id) return;
  books = books.filter((book) => book.id !== id);
  saveBooks();
  render();
  elements.deleteConfirm.hidden = true;
  elements.dialog.close();
});

let resizeRenderHandle = null;
window.addEventListener("resize", () => {
  if (resizeRenderHandle) clearTimeout(resizeRenderHandle);
  resizeRenderHandle = setTimeout(() => {
    if (currentView === "bookshelf") renderBookshelf();
  }, 120);
});

setView(currentView);
buildStarRating();
setupNotesEditor();
render();
initSyncFromStoredConfig();
