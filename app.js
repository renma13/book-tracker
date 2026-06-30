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
let libraryPage = 1;
let libraryFinishDateFilter = null;

const $ = (selector) => document.querySelector(selector);

const elements = {
  navTabs: document.querySelectorAll(".nav-tab"),
  views: document.querySelectorAll(".view"),
  viewTitle: $("#viewTitle"),
  globalSearch: $("#globalSearch"),
  statusFilter: $("#statusFilter"),
  bookGrid: $("#bookGrid"),
  libraryPagination: $("#libraryPagination"),
  paginationPages: $("#paginationPages"),
  paginationPrev: $("#paginationPrev"),
  paginationNext: $("#paginationNext"),
  paginationJumpInput: $("#paginationJumpInput"),
  readingSpotlight: $("#readingSpotlight"),
  spotlightGrid: $("#spotlightGrid"),
  spotlightCount: $("#spotlightCount"),
  libraryDivider: $("#libraryDivider"),
  shelfBoard: $("#shelfBoard"),
  bookshelfStage: $("#bookshelfStage"),
  statsYearFilter: $("#statsYearFilter"),
  statsHero: $("#statsHero"),
  rhythmChart: $("#rhythmChart"),
  rhythmSub: $("#rhythmSub"),
  genreDonutWrap: $("#genreDonutWrap"),
  ratingBars: $("#ratingBars"),
  streaksSummary: $("#streaksSummary"),
  streaksGrid: $("#streaksGrid"),
  paceChart: $("#paceChart"),
  paceSub: $("#paceSub"),
  insightsList: $("#insightsList"),
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
  libraryToolsDialog: $("#libraryToolsDialog"),
  findMissingCovers: $("#findMissingCovers"),
  toolsStatus: $("#toolsStatus"),
  syncDialog: $("#syncDialog"),
  syncConfigInput: $("#syncConfigInput"),
  syncCodeInput: $("#syncCodeInput"),
  syncStatusBanner: $("#syncStatusBanner"),
  syncDot: $("#syncDot"),
  syncButtonLabel: $("#syncButtonLabel"),
  disconnectSync: $("#disconnectSync"),
  bookDetailDialog: $("#bookDetailDialog"),
  bookDetailCover: $("#bookDetailCover"),
  bookDetailStatus: $("#bookDetailStatus"),
  bookDetailTitle: $("#bookDetailTitle"),
  bookDetailAuthor: $("#bookDetailAuthor"),
  bookDetailRating: $("#bookDetailRating"),
  bookDetailMeta: $("#bookDetailMeta"),
  bookDetailGenres: $("#bookDetailGenres"),
  bookDetailTags: $("#bookDetailTags"),
  bookDetailDates: $("#bookDetailDates"),
  bookDetailRecommend: $("#bookDetailRecommend"),
  bookDetailNotes: $("#bookDetailNotes"),
  editBookFromDetail: $("#editBookFromDetail"),
  recommendUnlock: $("#recommendUnlock"),
  recommendCondition: $("#recommendCondition"),
  logReread: $("#logReread"),
  bookDetailRereadsSection: $("#bookDetailRereadsSection"),
  rereadsCount: $("#rereadsCount"),
  rereadsList: $("#rereadsList"),
  rereadDialog: $("#rereadDialog"),
  rereadForm: $("#rereadForm"),
  rereadDialogTitle: $("#rereadDialogTitle"),
  rereadStarRating: $("#rereadStarRating"),
  rereadRatingInput: $("#rereadRating"),
  deleteReread: $("#deleteReread"),
  cancelReread: $("#cancelReread"),
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
  hydrateCoverThumbnailsStaggered(document.body);
}

// Resolves cover thumbnails in small batches across a few animation frames instead of
// kicking off every image load in the same tick. A full render() can touch the same
// book's cover in several places at once (calendar, library, shelves, bookshelf), so
// batching keeps the browser from being asked to start dozens of decodes simultaneously
// right after a view switch or search.
const COVER_HYDRATE_BATCH_SIZE = 12;

function hydrateCoverThumbnailsStaggered(container) {
  const images = [...container.querySelectorAll("img[data-cover-src]")];
  if (!images.length) return;

  let index = 0;
  const processBatch = () => {
    const batch = images.slice(index, index + COVER_HYDRATE_BATCH_SIZE);
    batch.forEach((image) => {
      const url = image.dataset.coverSrc;
      getCoverThumbnail(url, (dataUrl) => {
        image.src = dataUrl;
      });
    });
    index += COVER_HYDRATE_BATCH_SIZE;
    if (index < images.length) requestAnimationFrame(processBatch);
  };

  requestAnimationFrame(processBatch);
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

// ---------- Re-reads: flattening a book's multiple read-throughs into events ----------
//
// Each book keeps its existing top-level startDate/finishDate/rating as its "primary"
// read-through (zero migration needed for books that predate this feature). Additional
// read-throughs live in book.rereads, an array of { id, startDate, finishDate, rating,
// notes }. readEventsFor() flattens both into a single ordered list of "read events" so
// Calendar, Stats, and Pace can treat every read-through the same way, while Book
// Details can still tell them apart (isReread) to render history and route edits.

function readEventsFor(book) {
  const events = [];

  if (book.startDate || book.finishDate) {
    events.push({
      book,
      eventId: "",
      title: book.title,
      id: book.id,
      pages: book.pages,
      genres: book.genres,
      startDate: book.startDate || "",
      finishDate: book.finishDate || "",
      rating: book.rating || "",
      notes: book.notes || "",
      isReread: false,
    });
  }

  (book.rereads || []).forEach((reread) => {
    if (!reread.startDate && !reread.finishDate) return;
    events.push({
      book,
      eventId: reread.id,
      title: book.title,
      id: book.id,
      pages: book.pages,
      genres: book.genres,
      startDate: reread.startDate || "",
      finishDate: reread.finishDate || "",
      rating: reread.rating || "",
      notes: reread.notes || "",
      isReread: true,
    });
  });

  return events;
}

// Every read event across the whole library, flattened. Used anywhere stats need to
// count/measure each read-through rather than each book.
function allReadEvents() {
  return books.flatMap((book) => readEventsFor(book));
}

function rereadCount(book) {
  return (book.rereads || []).length;
}

// A read event (the primary read, or any logged re-read) occupies a day on the
// calendar if that day is its start date, its finish date, or falls strictly between
// the two (i.e. still being read that day). Returns "started" | "finished" |
// "in-progress" | null. If startDate and finishDate land on the same day, "finished"
// wins so the event doesn't show twice.
function dayStatusForEvent(event, dateKey) {
  if (event.finishDate === dateKey) return "finished";
  if (event.startDate === dateKey) return "started";
  if (event.startDate && event.finishDate && event.startDate < dateKey && dateKey < event.finishDate) {
    return "in-progress";
  }
  return null;
}

// Every read event (across every book, including re-reads) that touches a given
// calendar day, each tagged with its day status. A book with several read-throughs
// can appear more than once on the same day's list if, say, a re-read's start date
// happens to land on the same day as the primary read's finish date — rare, but
// correct to show both.
function eventsForDay(dateKey) {
  return allReadEvents()
    .map((event) => ({ event, status: dayStatusForEvent(event, dateKey) }))
    .filter(({ status }) => status);
}

function calendarCoverClass(status) {
  // The cover stays grey from the day reading starts through every in-progress day.
  // It returns to full color only on the day the book is finished.
  if (status === "finished") return "finished-cover";
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
    const entries = eventsForDay(dateKey);
    const isToday = dateKey === toDateInput(new Date());

    cell.innerHTML = `<div class="day-top"><span>${dayNumber}</span>${isToday ? "<b>Today</b>" : ""}</div>`;

    entries.slice(0, CALENDAR_DAY_PREVIEW_LIMIT).forEach(({ event: readEvent, status }) => {
      const book = readEvent.book;
      const coverButton = document.createElement("button");
      coverButton.type = "button";
      coverButton.className = `calendar-cover ${calendarCoverClass(status)}`;
      coverButton.setAttribute(
        "aria-label",
        `${calendarStatusLabel(status)} ${book.title}${readEvent.isReread ? " (re-read)" : ""}`
      );
      coverButton.innerHTML = coverMarkup(book);
      if (readEvent.isReread) {
        coverButton.insertAdjacentHTML("beforeend", '<span class="reread-mark" aria-hidden="true">↻</span>');
      }
      coverButton.addEventListener("click", (domEvent) => {
        domEvent.stopPropagation();
        openBook(book.id);
      });
      cell.append(coverButton);
    });

    if (entries.length > CALENDAR_DAY_PREVIEW_LIMIT) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "more-count";
      more.textContent = `+${entries.length - CALENDAR_DAY_PREVIEW_LIMIT} more`;
      more.addEventListener("click", (domEvent) => {
        domEvent.stopPropagation();
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

  entries.forEach(({ event: readEvent, status }) => {
    const badgeText = calendarStatusLabel(status) + (readEvent.isReread ? " · re-read" : "");
    const row = compactBook(readEvent.book, {
      badgeText,
      badgeClass: calendarBadgeClass(status),
    });
    elements.dayBooksList.append(row);
  });

  hydrateCoverThumbnailsStaggered(elements.dayBooksList);

  // Keep this dialog open beneath Book Details. Native modal dialogs are stacked,
  // so closing the selected book naturally returns to this day's full list.
  // This also keeps mouse and keyboard activation of a book consistent.
  elements.dayBooksDialog.showModal();
}

const LIBRARY_PAGE_SIZE = 12;

function renderLibrary() {
  const statusValue = elements.statusFilter.value;
  const searchedBooks = filteredBooks();

  // Stats drill-downs are based on read events, not a book's current shelf. This
  // matters for re-reads and for books that have since been moved back to Reading.
  const matchingFinishByBookId = new Map();
  if (libraryFinishDateFilter) {
    allReadEvents().forEach((event) => {
      if (!event.finishDate || !libraryFinishDateFilter.matches(event.finishDate)) return;
      const previous = matchingFinishByBookId.get(event.book.id);
      if (!previous || event.finishDate > previous) matchingFinishByBookId.set(event.book.id, event.finishDate);
    });
  }

  const readingBooks = libraryFinishDateFilter
    ? []
    : searchedBooks.filter((book) => book.status === "reading");
  const showSpotlight = readingBooks.length > 0;

  elements.readingSpotlight.hidden = !showSpotlight;
  elements.spotlightGrid.innerHTML = "";
  if (showSpotlight) {
    readingBooks.forEach((book) => elements.spotlightGrid.append(readingCard(book)));
    hydrateCoverThumbnailsStaggered(elements.spotlightGrid);
  }

  const restOfLibrary = libraryFinishDateFilter
    ? searchedBooks
        .filter((book) => matchingFinishByBookId.has(book.id))
        .sort((a, b) => matchingFinishByBookId.get(b.id).localeCompare(matchingFinishByBookId.get(a.id)))
    : searchedBooks.filter((book) => {
        if (book.status === "reading") return false;
        return statusValue === "all" || book.status === statusValue;
      });

  elements.libraryDivider.hidden = !showSpotlight && !libraryFinishDateFilter;
  const dividerLabel = document.getElementById("libraryDividerLabel");
  if (dividerLabel) {
    if (libraryFinishDateFilter) {
      dividerLabel.textContent = libraryFinishDateFilter.label;
    } else if (statusValue !== "all" && statusValue !== "reading") {
      dividerLabel.textContent = statusLabel(statusValue);
    } else {
      dividerLabel.textContent = "Rest of library";
    }
  }

  elements.bookGrid.innerHTML = "";

  if (!restOfLibrary.length) {
    elements.bookGrid.append(
      emptyState(
        statusValue === "reading"
          ? "Your currently-reading books are shown above."
          : undefined
      )
    );
    renderPagination(0, 1);
    return;
  }

  const pageCount = Math.max(1, Math.ceil(restOfLibrary.length / LIBRARY_PAGE_SIZE));
  // Clamp in case the previous page no longer exists (e.g. a filter/search just
  // shrank the result set, or a book was deleted off the last page).
  if (libraryPage > pageCount) libraryPage = pageCount;
  if (libraryPage < 1) libraryPage = 1;

  const startIndex = (libraryPage - 1) * LIBRARY_PAGE_SIZE;
  const pageBooks = restOfLibrary.slice(startIndex, startIndex + LIBRARY_PAGE_SIZE);

  pageBooks.forEach((book) => elements.bookGrid.append(bookRow(book)));
  hydrateCoverThumbnailsStaggered(elements.bookGrid);

  renderPagination(restOfLibrary.length, pageCount);
}

// ---------- Library pagination ----------
//
// A page-number strip (‹ 1 2 3 › plus a "jump to page" number input) replaces what
// used to be an unbounded list. Always shows page 1, the last page, and a small
// window around the current page, collapsing the gaps with an ellipsis — so the
// strip stays a fixed, scannable width even with hundreds of pages.

function renderPagination(totalBooks, pageCount) {
  if (!elements.libraryPagination) return;

  if (!totalBooks || pageCount <= 1) {
    elements.libraryPagination.hidden = true;
    return;
  }

  elements.libraryPagination.hidden = false;

  elements.paginationPrev.disabled = libraryPage <= 1;
  elements.paginationNext.disabled = libraryPage >= pageCount;

  elements.paginationJumpInput.max = String(pageCount);
  elements.paginationJumpInput.placeholder = `/ ${pageCount}`;
  if (document.activeElement !== elements.paginationJumpInput) {
    elements.paginationJumpInput.value = "";
  }

  elements.paginationPages.innerHTML = "";

  paginationPageList(libraryPage, pageCount).forEach((entry) => {
    if (entry === "ellipsis") {
      const span = document.createElement("span");
      span.className = "pagination-ellipsis";
      span.textContent = "…";
      span.setAttribute("aria-hidden", "true");
      elements.paginationPages.append(span);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `pagination-page${entry === libraryPage ? " active" : ""}`;
    button.textContent = String(entry);
    button.setAttribute("aria-label", `Page ${entry}`);
    if (entry === libraryPage) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => goToLibraryPage(entry));
    elements.paginationPages.append(button);
  });
}

// Builds the list of page numbers/ellipses to display: page 1, the last page, the
// current page, and one neighbor on each side of the current page, always.
function paginationPageList(current, pageCount) {
  const pagesToShow = new Set([1, pageCount, current, current - 1, current + 1]);
  const sorted = [...pagesToShow].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);

  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

function goToLibraryPage(page) {
  libraryPage = page;
  renderLibrary();
  elements.bookGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

const SHELF_PREVIEW_LIMIT = 10;

function renderShelves() {
  elements.shelfBoard.innerHTML = "";

  statuses.forEach((status) => {
    const row = document.createElement("section");
    row.className = "shelf-row";
    row.style.setProperty("--row-accent", status.color);

    const shelfBooks = filteredBooks().filter((book) => book.status === status.id);
    const previewBooks = shelfBooks.slice(0, SHELF_PREVIEW_LIMIT);

    const head = document.createElement("div");
    head.className = "shelf-row-head";
    head.innerHTML = `
      <div class="shelf-row-heading">
        <span class="shelf-row-dot" aria-hidden="true"></span>
        <h4>${escapeHtml(status.label)}</h4>
        <span class="shelf-row-count">${shelfBooks.length} ${shelfBooks.length === 1 ? "book" : "books"}</span>
      </div>
    `;

    if (shelfBooks.length > SHELF_PREVIEW_LIMIT) {
      const seeAll = document.createElement("button");
      seeAll.type = "button";
      seeAll.className = "shelf-row-seeall";
      seeAll.innerHTML = `See all <span aria-hidden="true">&rarr;</span>`;
      seeAll.addEventListener("click", () => openShelfInLibrary(status.id));
      head.append(seeAll);
    }

    row.append(head);

    if (!shelfBooks.length) {
      const empty = document.createElement("p");
      empty.className = "shelf-row-empty";
      empty.textContent = "No books here yet.";
      row.append(empty);
    } else {
      const scroll = document.createElement("div");
      scroll.className = "shelf-row-scroll";
      previewBooks.forEach((book) => scroll.append(shelfCoverCard(book)));
      row.append(scroll);
    }

    elements.shelfBoard.append(row);
  });
}

// A flat, face-out cover card used in the Shelves rows: cover, a thin accent
// line in the shelf's status color, title, author. No tilt or skeuomorphism —
// just a clean cover-forward list a person can scan quickly.
function shelfCoverCard(book) {
  const card = document.createElement("article");
  card.className = "shelf-cover-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open ${book.title}`);

  card.innerHTML = `
    <div class="shelf-cover">${coverMarkup(book)}</div>
    <span class="shelf-cover-accent" aria-hidden="true"></span>
    <h5 class="shelf-cover-title">${escapeHtml(book.title)}</h5>
    <p class="shelf-cover-author">${escapeHtml(book.author || "Unknown author")}</p>
  `;

  const open = () => openBook(book.id);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });

  return card;
}

function openShelfInLibrary(statusId) {
  clearLibraryFinishDateFilter();
  elements.globalSearch.value = "";
  elements.statusFilter.value = statusId;
  libraryPage = 1;
  setView("library");
  render();
}

// The bookshelf shows one spine per book (re-reading a book doesn't grow a second
// spine for it), but a book should appear if ANY of its read-throughs — the primary
// read or a re-read — finished this year, using whichever finish is most recent for
// sorting. This way re-reading an old favorite this year brings it back onto the
// shelf, the same as finishing it for the first time would.
function mostRecentFinishThisYear(book, currentYear) {
  const finishesThisYear = readEventsFor(book)
    .map((event) => event.finishDate)
    .filter((finishDate) => finishDate && new Date(`${finishDate}T00:00:00`).getFullYear() === currentYear);
  if (!finishesThisYear.length) return null;
  return finishesThisYear.sort().at(-1);
}

function renderBookshelf() {
  const currentYear = new Date().getFullYear();
  const finishedThisYear = filteredBooks()
    .map((book) => ({ book, latestFinish: mostRecentFinishThisYear(book, currentYear) }))
    .filter((entry) => entry.latestFinish)
    .sort((a, b) => new Date(`${b.latestFinish}T00:00:00`) - new Date(`${a.latestFinish}T00:00:00`))
    .map((entry) => entry.book);

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

// True if any read-through of this book (primary or re-read) touches the given year,
// by start or finish date.
function bookTouchesYear(book, year) {
  return readEventsFor(book).some((event) => {
    const startYear = event.startDate ? Number(event.startDate.slice(0, 4)) : null;
    const finishYear = event.finishDate ? Number(event.finishDate.slice(0, 4)) : null;
    return startYear === year || finishYear === year;
  });
}

function availableStatsYears() {
  const years = new Set();
  allReadEvents().forEach((event) => {
    if (event.startDate) years.add(Number(event.startDate.slice(0, 4)));
    if (event.finishDate) years.add(Number(event.finishDate.slice(0, 4)));
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

  const scopedBooks = isAllTime ? books : books.filter((book) => bookTouchesYear(book, year));

  // Every finished read-through (the primary read, plus any logged re-read) counts on
  // its own — re-reading a favorite book this year shows up as another finish, not a
  // repeat of the same one. A read-through "finished" purely by having a finishDate in
  // scope; it no longer depends on the book's *current* status, since a book can be
  // back on the "reading" shelf for a fresh re-read while its earlier finishes remain
  // historical fact.
  const finished = allReadEvents().filter((event) => {
    if (!event.finishDate) return false;
    if (isAllTime) return true;
    return Number(event.finishDate.slice(0, 4)) === year;
  });
  const finishedWithDates = finished;
  const rereadFinishes = finished.filter((event) => event.isReread);
  const pages = finished.reduce((sum, event) => sum + Number(event.pages || 0), 0);
  const rated = finished.filter((event) => event.rating);
  const averageRating = rated.length
    ? rated.reduce((sum, event) => sum + Number(event.rating), 0) / rated.length
    : null;
  const genreCounts = genreCountsFor(finished);
  const topGenreEntry = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];

  const currentlyReading = books.filter((book) => {
    if (book.status !== "reading") return false;
    if (isAllTime) return true;
    if (!book.startDate) return false;
    return Number(book.startDate.slice(0, 4)) === year;
  });

  renderStatsHero({ scopedBooks, finished, pages, averageRating, topGenreEntry, currentlyReading, rereadFinishes });
  renderRhythmChart(finishedWithDates, { isAllTime, year });
  renderGenreDonut(genreCounts);
  renderRatingBars(rated);
  renderReadingStreaks({ isAllTime, year });
  renderPaceOverTime(finishedWithDates, { isAllTime, year });
  renderInsights({ finished, finishedWithDates, pages, averageRating, genreCounts, rated, isAllTime, year, scopedBooks, rereadFinishes });
}

function genreCountsFor(bookList) {
  return bookList
    .flatMap((book) => String(book.genres || "").split(","))
    .map((genre) => genre.trim())
    .filter(Boolean)
    .reduce((counts, genre) => ({ ...counts, [genre]: (counts[genre] || 0) + 1 }), {});
}

const HERO_ACCENTS = ["var(--sage)", "var(--rose)", "var(--blue)"];

function renderStatsHero({ scopedBooks, finished, pages, averageRating, topGenreEntry, currentlyReading, rereadFinishes }) {
  const avgPages = finished.length ? Math.round(pages / finished.length) : 0;
  const ratingDisplay = averageRating ? averageRating.toFixed(1) : "—";
  const topGenre = topGenreEntry?.[0] || "Add some genres";
  const rereadCount = rereadFinishes?.length || 0;

  const finishedNote = rereadCount
    ? `Includes ${rereadCount} re-read${rereadCount === 1 ? "" : "s"}`
    : avgPages
      ? `Averaging ${avgPages.toLocaleString()} pages per book`
      : "No finished books yet";

  const cards = [
    {
      label: "Books finished",
      value: finished.length,
      note: finishedNote,
    },
    {
      label: "Pages read",
      value: pages.toLocaleString(),
      note: currentlyReading.length
        ? `${currentlyReading.length} more ${currentlyReading.length === 1 ? "book" : "books"} in progress`
        : "Nothing in progress right now",
    },
    {
      label: "Average rating",
      value: ratingDisplay,
      unit: averageRating ? "/ 5" : "",
      note: topGenreEntry ? `Reaching for ${escapeHtml(topGenre)} most often` : "Add genres to see your favorite",
    },
  ];

  elements.statsHero.innerHTML = "";
  cards.forEach((card, index) => {
    const tile = document.createElement("article");
    tile.className = "hero-stat";
    tile.style.setProperty("--hero-accent", HERO_ACCENTS[index % HERO_ACCENTS.length]);
    tile.innerHTML = `
      <span class="hero-stat-label">${card.label}</span>
      <div class="hero-stat-value">${card.value}${card.unit ? `<span class="hero-stat-unit">${card.unit}</span>` : ""}</div>
      <span class="hero-stat-note">${card.note}</span>
    `;
    elements.statsHero.append(tile);
  });
}

// ---------- Reading rhythm: books finished per month, as a small bar chart ----------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderRhythmChart(finishedWithDates, { isAllTime, year }) {
  elements.rhythmChart.innerHTML = "";

  const counts = new Array(12).fill(0);
  finishedWithDates.forEach((readEvent) => {
    const date = new Date(`${readEvent.finishDate}T00:00:00`);
    if (isAllTime || date.getFullYear() === year) counts[date.getMonth()] += 1;
  });

  elements.rhythmSub.textContent = isAllTime
    ? "Books finished each month, across every year you've logged."
    : `Books finished each month in ${year}.`;

  const max = Math.max(...counts, 1);
  const now = new Date();
  const isCurrentYearView = !isAllTime && year === now.getFullYear();

  MONTH_LABELS.forEach((label, monthIndex) => {
    const count = counts[monthIndex];
    const column = document.createElement("div");
    column.className = "rhythm-col";

    const track = document.createElement("div");
    track.className = "rhythm-bar-track";

    const countLabel = document.createElement("span");
    countLabel.className = "rhythm-count";
    countLabel.textContent = count;

    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = `rhythm-bar${count === 0 ? " is-empty" : ""}${
      isCurrentYearView && monthIndex === now.getMonth() ? " is-current" : ""
    }`;
    const heightPercent = count === 0 ? 3 : Math.max(6, (count / max) * 100);
    bar.style.height = `${heightPercent}%`;
    bar.setAttribute(
      "aria-label",
      `${count} ${count === 1 ? "book" : "books"} finished in ${label}${isAllTime ? "" : ` ${year}`}`
    );
    if (count > 0) {
      bar.addEventListener("click", () => openMonthInLibrary(monthIndex, isAllTime ? null : year));
    } else {
      bar.disabled = true;
    }

    track.append(bar);
    column.append(countLabel, track);

    const monthLabel = document.createElement("span");
    monthLabel.className = "rhythm-col-label";
    monthLabel.textContent = label;
    column.append(monthLabel);

    elements.rhythmChart.append(column);
  });
}

function openMonthInLibrary(monthIndex, year) {
  elements.globalSearch.value = "";
  elements.statusFilter.value = "finished";
  const monthName = new Date(year || new Date().getFullYear(), monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
  });
  libraryFinishDateFilter = {
    label: `Finished in ${monthName}${year ? ` ${year}` : " (all years)"}`,
    matches: (finishDate) => {
      const date = new Date(`${finishDate}T00:00:00`);
      return date.getMonth() === monthIndex && (year === null || date.getFullYear() === year);
    },
  };
  libraryPage = 1;
  setView("library");
  render();
  elements.globalSearch.placeholder = `Showing books finished in ${monthName}${year ? ` ${year}` : ""}`;
}

function clearLibraryFinishDateFilter() {
  libraryFinishDateFilter = null;
  elements.globalSearch.placeholder = "Filter your books";
}

// ---------- Genre donut ----------

const DONUT_COLORS = ["#a8bca4", "#b6c9d8", "#dfb7ad", "#c8bed9", "#ead9a9", "#9bb0c2", "#c79f93", "#8fa68b"];
const DONUT_PREVIEW_LIMIT = 7;

function renderGenreDonut(genreCounts) {
  const wrap = elements.genreDonutWrap;
  wrap.innerHTML = "";

  const entries = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    wrap.innerHTML = '<p class="genre-empty">Add genres to your finished books to see a breakdown here.</p>';
    return;
  }

  const top = entries.slice(0, DONUT_PREVIEW_LIMIT);
  const rest = entries.slice(DONUT_PREVIEW_LIMIT);
  const restTotal = rest.reduce((sum, [, count]) => sum + count, 0);
  const slices = restTotal ? [...top, ["Other", restTotal]] : top;
  const total = slices.reduce((sum, [, count]) => sum + count, 0);

  const size = 168;
  const radius = 70;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "genre-donut");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Genre breakdown of finished books");

  let offset = 0;
  slices.forEach(([genre, count], index) => {
    const fraction = count / total;
    const dash = fraction * circumference;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", DONUT_COLORS[index % DONUT_COLORS.length]);
    circle.setAttribute("stroke-width", 26);
    circle.setAttribute("stroke-dasharray", `${dash} ${circumference - dash}`);
    circle.setAttribute("stroke-dashoffset", -offset);
    circle.setAttribute("transform", `rotate(-90 ${center} ${center})`);
    circle.setAttribute("tabindex", "0");
    circle.classList.add("genre-slice");
    const percent = Math.round(fraction * 100);
    circle.setAttribute("aria-label", `${genre}: ${count} ${count === 1 ? "book" : "books"}, ${percent}%`);
    if (genre !== "Other") {
      circle.style.cursor = "pointer";
      circle.addEventListener("click", () => openGenreInLibrary(genre));
    }
    svg.append(circle);
    offset += dash;
  });

  const centerLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerLabel.setAttribute("x", center);
  centerLabel.setAttribute("y", center - 4);
  centerLabel.setAttribute("text-anchor", "middle");
  centerLabel.setAttribute("class", "genre-donut-center");
  centerLabel.innerHTML = `<tspan x="${center}" dy="0" font-size="22" font-weight="700" fill="var(--ink)">${total}</tspan><tspan x="${center}" dy="16" font-size="10" fill="var(--muted)">finished</tspan>`;
  svg.append(centerLabel);

  const donutFigure = document.createElement("div");
  donutFigure.append(svg);
  wrap.append(donutFigure);

  const legend = document.createElement("div");
  legend.className = "genre-legend";
  slices.forEach(([genre, count], index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "genre-legend-item";
    item.innerHTML = `
      <span class="legend-swatch" style="background:${DONUT_COLORS[index % DONUT_COLORS.length]}"></span>
      <span class="legend-label">${escapeHtml(genre)}</span>
      <span class="legend-count">${count}</span>
    `;
    if (genre !== "Other") item.addEventListener("click", () => openGenreInLibrary(genre));
    else item.disabled = true;
    legend.append(item);
  });
  wrap.append(legend);
}

function openGenreInLibrary(genre) {
  elements.globalSearch.value = genre;
  elements.statusFilter.value = "all";
  libraryPage = 1;
  setView("library");
  render();
}

// ---------- Rating distribution ----------

function renderRatingBars(rated) {
  elements.ratingBars.innerHTML = "";

  if (!rated.length) {
    elements.ratingBars.innerHTML = '<p class="rating-empty">Rate a finished book and your distribution will show up here.</p>';
    return;
  }

  const buckets = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
  const counts = buckets.map((value) => rated.filter((book) => Number(book.rating) === value).length);
  const max = Math.max(...counts, 1);

  buckets.forEach((value, index) => {
    const count = counts[index];
    const row = document.createElement("div");
    row.className = "rating-row";
    row.innerHTML = `
      <span class="rating-row-label">${starGlyphs(value)}</span>
      <span class="rating-row-track"><span class="rating-row-fill" style="width:${count ? Math.max(4, (count / max) * 100) : 0}%"></span></span>
      <span class="rating-row-count">${count}</span>
    `;
    elements.ratingBars.append(row);
  });
}

function starGlyphs(value) {
  const full = Math.floor(value);
  const half = value % 1 !== 0;
  return "★".repeat(full) + (half ? "½" : "");
}

// Like starGlyphs, but pads out to 5 stars total using an outline glyph for the
// remaining (unfilled) slots — used on the book detail page where the rating
// should always read as "X filled out of 5", not just the filled count.
function starGlyphsOutOfFive(value) {
  const full = Math.floor(value);
  const half = value % 1 !== 0;
  const empty = Math.max(0, 5 - full - (half ? 1 : 0));
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

// ---------- Pace: days spent reading vs. page count, as a scatter ----------

// ---------- Reading streaks: weekly heatmap + current/longest/active counts ----------
//
// A "streak week" is any ISO week (Monday–Sunday) containing at least one finish event
// (primary read or re-read), across the whole library — streaks are a continuity idea,
// so they intentionally ignore the Stats year filter rather than getting cut off at a
// year boundary. weekKey() always returns the Monday date (as YYYY-MM-DD) for whatever
// date is passed in, so any date within a week maps to the same key.

function startOfIsoWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay(); // 0 = Sunday … 6 = Saturday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + mondayOffset);
  return result;
}

function weekKey(date) {
  return toDateInput(startOfIsoWeek(date));
}

function weeksFinishedMap() {
  const counts = new Map();
  allReadEvents().forEach((event) => {
    if (!event.finishDate) return;
    const key = weekKey(new Date(`${event.finishDate}T00:00:00`));
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function computeReadingStreaks() {
  const counts = weeksFinishedMap();
  const { currentStreak, longestStreak } = computeStreakStats(counts);
  const currentYear = new Date().getFullYear();
  const activeThisYear = [...counts.keys()].filter(
    (key) => new Date(`${key}T00:00:00`).getFullYear() === currentYear
  ).length;
  return { counts, currentStreak, longestStreak, activeThisYear };
}

const STREAKS_DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function renderReadingStreaks({ isAllTime = true, year = 0 } = {}) {
  if (!elements.streaksSummary || !elements.streaksGrid) return;

  // Build a week→count map scoped to the selected filter.
  // For a specific year, only count finishes in that year.
  // For all-time, count everything.
  const allCounts = weeksFinishedMap();
  const scopedCounts = new Map();
  allCounts.forEach((count, key) => {
    if (isAllTime) {
      scopedCounts.set(key, count);
    } else {
      // Re-count only the events that fall in the selected year
      const yearCount = allReadEvents().filter((event) => {
        if (!event.finishDate) return false;
        if (Number(event.finishDate.slice(0, 4)) !== year) return false;
        return weekKey(new Date(`${event.finishDate}T00:00:00`)) === key;
      }).length;
      if (yearCount > 0) scopedCounts.set(key, yearCount);
    }
  });

  // Summary stats scoped to the filter
  const allKeys = [...scopedCounts.keys()].sort();
  const scopedYear = isAllTime ? new Date().getFullYear() : year;

  // Current streak — always computed from the full all-time map (streaks span years)
  // but the "active this period" count uses the scoped map.
  const { currentStreak, longestStreak } = computeStreakStats(allCounts);
  const activePeriod = allKeys.filter((key) => {
    const keyYear = new Date(`${key}T00:00:00`).getFullYear();
    return isAllTime ? true : keyYear === year;
  }).length;

  const periodLabel = isAllTime ? "all time" : String(year);
  const activeLabel = isAllTime ? "active (all time)" : `active in ${year}`;

  elements.streaksSummary.innerHTML = `
    <div class="streak-stat">
      <strong>${currentStreak}</strong>
      <span>${currentStreak === 1 ? "week" : "weeks"}</span>
      <small>current streak</small>
    </div>
    <div class="streak-stat">
      <strong>${longestStreak}</strong>
      <span>${longestStreak === 1 ? "week" : "weeks"}</span>
      <small>longest streak</small>
    </div>
    <div class="streak-stat">
      <strong>${activePeriod}</strong>
      <span>${activePeriod === 1 ? "week" : "weeks"}</span>
      <small>${activeLabel}</small>
    </div>
  `;

  elements.streaksGrid.innerHTML = "";

  if (!scopedCounts.size) {
    elements.streaksGrid.innerHTML = '<p class="streaks-empty">No finished books in this period yet.</p>';
    return;
  }

  const todayWeekStart = startOfIsoWeek(new Date());
  const todayKey = weekKey(todayWeekStart);
  const maxCount = Math.max(...scopedCounts.values(), 1);

  // Determine the window of weeks to show.
  // For a specific year: Jan 1 of that year through Dec 31 (or today if it's the current year).
  // For all-time: earliest finish week through today.
  let windowStart;
  let windowEnd;
  if (isAllTime) {
    const earliestKey = allKeys[0];
    windowStart = startOfIsoWeek(new Date(`${earliestKey}T00:00:00`));
    windowEnd = new Date(todayWeekStart);
  } else {
    windowStart = startOfIsoWeek(new Date(year, 0, 1));
    const yearEnd = new Date(year, 11, 31);
    windowEnd = startOfIsoWeek(year === new Date().getFullYear() ? new Date() : yearEnd);
  }

  // Build the ordered list of weeks in the window
  const weeks = [];
  const cursor = new Date(windowStart);
  while (cursor <= windowEnd) {
    const key = weekKey(cursor);
    weeks.push({ key, count: scopedCounts.get(key) || 0, weekStart: new Date(cursor) });
    cursor.setDate(cursor.getDate() + 7);
  }

  // Month label row — show year alongside month when all-time (multiple years visible)
  const monthRow = document.createElement("div");
  monthRow.className = "streaks-month-row";
  const monthSpacer = document.createElement("span");
  monthSpacer.className = "streaks-day-spacer";
  monthRow.append(monthSpacer);
  let lastMonthKey = "";
  weeks.forEach((week) => {
    const m = week.weekStart.getMonth();
    const y = week.weekStart.getFullYear();
    const monthKey = `${y}-${m}`;
    const cell = document.createElement("span");
    cell.className = "streaks-month-label-cell";
    if (monthKey !== lastMonthKey) {
      // For all-time view, show "Jan '23" style; for single year just "Jan"
      cell.textContent = isAllTime
        ? week.weekStart.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
        : week.weekStart.toLocaleDateString(undefined, { month: "short" });
      lastMonthKey = monthKey;
    }
    monthRow.append(cell);
  });
  elements.streaksGrid.append(monthRow);

  // Body: day-label column + one column per week
  const bodyRow = document.createElement("div");
  bodyRow.className = "streaks-body-row";

  const dayCol = document.createElement("div");
  dayCol.className = "streaks-day-col";
  STREAKS_DAY_LABELS.forEach((label) => {
    const span = document.createElement("span");
    span.className = "streaks-day-label";
    span.textContent = label;
    dayCol.append(span);
  });
  bodyRow.append(dayCol);

  weeks.forEach(({ key, count, weekStart }) => {
    const isThisWeek = key === todayKey;
    const col = document.createElement("div");
    col.className = `streaks-week-col${isThisWeek ? " is-current-week" : ""}`;
    const level = streakLevel(count, maxCount);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const rangeLabel = `${formatDisplayDate(toDateInput(weekStart))} – ${formatDisplayDate(toDateInput(weekEnd))}`;
    const tipText = count
      ? `${count} ${count === 1 ? "book" : "books"} finished — week of ${rangeLabel}`
      : `No finishes — week of ${rangeLabel}`;

    for (let day = 0; day < 7; day += 1) {
      const cell = document.createElement("span");
      cell.className = `streaks-cell streaks-level-${level}`;
      cell.title = tipText;
      col.append(cell);
    }
    bodyRow.append(col);
  });

  elements.streaksGrid.append(bodyRow);
}

// Extracted from computeReadingStreaks so it can be called with any counts map.
// Returns current and longest streaks based on the provided full all-time map.
function computeStreakStats(counts) {
  const todayWeekStart = startOfIsoWeek(new Date());

  let currentStreak = 0;
  let cursor = new Date(todayWeekStart);
  if (counts.has(weekKey(cursor))) {
    while (counts.has(weekKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
  } else {
    cursor.setDate(cursor.getDate() - 7);
    while (counts.has(weekKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
    if (currentStreak > 0 && !counts.has(weekKey(todayWeekStart))) {
      currentStreak = 0;
    }
  }

  const allKeys = [...counts.keys()].sort();
  let longestStreak = 0;
  if (allKeys.length) {
    let runLength = 0;
    let walker = startOfIsoWeek(new Date(`${allKeys[0]}T00:00:00`));
    const end = todayWeekStart;
    while (walker <= end) {
      if (counts.has(weekKey(walker))) {
        runLength += 1;
        longestStreak = Math.max(longestStreak, runLength);
      } else {
        runLength = 0;
      }
      walker.setDate(walker.getDate() + 7);
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

// 5-step bucket (0–4) matching the legend swatches: 0 is always "no finishes", and
// 1–4 scale relative to this library's own busiest week rather than fixed counts, so
// the heatmap stays meaningful whether someone finishes 1 book a week or 5.
function streakLevel(count, maxCount) {
  if (count <= 0) return 0;
  const fraction = count / maxCount;
  if (fraction >= 0.99) return 4;
  if (fraction >= 0.66) return 3;
  if (fraction >= 0.33) return 2;
  return 1;
}

function openWeekInLibrary(weekStart, weekEnd) {
  elements.globalSearch.value = "";
  elements.statusFilter.value = "finished";
  const startKey = toDateInput(weekStart);
  const endKey = toDateInput(weekEnd);
  const startLabel = formatDisplayDate(startKey);
  const endLabel = formatDisplayDate(endKey);
  libraryFinishDateFilter = {
    label: `Finished ${startLabel} – ${endLabel}`,
    matches: (finishDate) => finishDate >= startKey && finishDate <= endKey,
  };
  libraryPage = 1;
  setView("library");
  render();
  elements.globalSearch.placeholder = `Showing books finished ${startLabel} – ${endLabel}`;
}

// ---------- Pace over time: average days-to-finish per month, as a line chart ----------

function renderPaceOverTime(finishedEvents, { isAllTime, year }) {
  const container = elements.paceChart;
  container.innerHTML = "";

  if (elements.paceSub) {
    elements.paceSub.textContent = isAllTime
      ? "Average days per book, by month, across every year you've logged."
      : `Average days per book, by month, in ${year}.`;
  }

  const timed = finishedEvents.filter(
    (readEvent) => readEvent.startDate && readEvent.finishDate && readEvent.startDate <= readEvent.finishDate
  );

  // Build the list of year-month points to plot.
  // For a single year: 12 fixed month slots (Jan–Dec).
  // For all-time: every month from the earliest finish through the current month.
  let points;
  if (!isAllTime) {
    const monthBuckets = new Array(12).fill(null).map(() => []);
    timed.forEach((readEvent) => {
      const date = new Date(`${readEvent.finishDate}T00:00:00`);
      if (date.getFullYear() !== year) return;
      monthBuckets[date.getMonth()].push(Math.max(1, daysBetween(readEvent.startDate, readEvent.finishDate)));
    });
    points = monthBuckets.map((days, monthIndex) => ({
      label: MONTH_LABELS[monthIndex],
      avg: days.length ? Math.round(days.reduce((s, v) => s + v, 0) / days.length) : null,
      count: days.length,
      monthIndex,
      pointYear: year,
    }));
  } else {
    // Build a map of "YYYY-MM" → [days]
    const buckets = new Map();
    timed.forEach((readEvent) => {
      const date = new Date(`${readEvent.finishDate}T00:00:00`);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(Math.max(1, daysBetween(readEvent.startDate, readEvent.finishDate)));
    });

    if (!buckets.size) {
      container.innerHTML = '<p class="pace-empty">Log a start and finish date on a couple more books to see your pace over time here.</p>';
      return;
    }

    const sortedKeys = [...buckets.keys()].sort();
    const firstKey = sortedKeys[0];
    const now = new Date();
    const lastKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

    // Walk every month from first finish to now
    const [firstYear, firstMonth] = firstKey.split("-").map(Number);
    const [lastYear, lastMonth] = lastKey.split("-").map(Number);
    points = [];
    let y = firstYear, m = firstMonth;
    while (y < lastYear || (y === lastYear && m <= lastMonth)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const days = buckets.get(key) || [];
      // Label: show year at Jan or first point
      const isJanOrFirst = m === 0 || (y === firstYear && m === firstMonth);
      const label = isJanOrFirst
        ? `${MONTH_LABELS[m]} '${String(y).slice(2)}`
        : MONTH_LABELS[m];
      points.push({
        label,
        avg: days.length ? Math.round(days.reduce((s, v) => s + v, 0) / days.length) : null,
        count: days.length,
        monthIndex: m,
        pointYear: y,
      });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
  }

  const withData = points.filter((p) => p.avg !== null);
  if (withData.length < 2) {
    container.innerHTML = '<p class="pace-empty">Log a start and finish date on a couple more books to see your pace over time here.</p>';
    return;
  }

  const viewWidth = 720;
  const viewHeight = 200;
  const padLeft = 40;
  const padBottom = 26;
  const padTop = 16;
  const padRight = 16;
  const plotWidth = viewWidth - padLeft - padRight;
  const plotHeight = viewHeight - padTop - padBottom;

  const maxDays = Math.max(...withData.map((p) => p.avg)) * 1.15;
  const niceMax = Math.ceil(maxDays / 4) * 4;

  const xForIndex = (i) => padLeft + (plotWidth * i) / (points.length - 1);
  const yForDays = (days) => padTop + plotHeight - (days / maxDays) * plotHeight;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
  svg.setAttribute("class", "pace-svg pace-line-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Line chart of average days spent per book, by month");
  svg.setAttribute("preserveAspectRatio", "none");

  // Gridlines
  [0, 0.25, 0.5, 0.75, 1].forEach((fraction) => {
    const y = padTop + plotHeight * (1 - fraction);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padLeft); line.setAttribute("x2", padLeft + plotWidth);
    line.setAttribute("y1", y); line.setAttribute("y2", y);
    line.setAttribute("class", "pace-gridline");
    svg.append(line);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", padLeft - 8); label.setAttribute("y", y + 3);
    label.setAttribute("text-anchor", "end"); label.setAttribute("class", "pace-axis-label");
    label.textContent = `${Math.round(niceMax * fraction)}d`;
    svg.append(label);
  });

  // X-axis labels — show a subset to avoid crowding (every ~3 months for single year, every 2–3 for all-time)
  const labelEvery = points.length <= 12 ? 1 : points.length <= 24 ? 2 : Math.ceil(points.length / 12);
  points.forEach((p, i) => {
    if (i % labelEvery !== 0 && i !== points.length - 1) return;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", xForIndex(i)); text.setAttribute("y", viewHeight - 6);
    text.setAttribute("text-anchor", "middle"); text.setAttribute("class", "pace-axis-label");
    text.textContent = p.label;
    svg.append(text);
  });

  // Line path (gaps where avg is null)
  let pathData = "";
  let drawing = false;
  points.forEach((p, i) => {
    if (p.avg === null) { drawing = false; return; }
    const x = xForIndex(i);
    const y = yForDays(p.avg);
    pathData += `${drawing ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
    drawing = true;
  });
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData.trim());
  path.setAttribute("class", "pace-line-path");
  path.setAttribute("fill", "none");
  svg.append(path);

  const tooltip = document.createElement("div");
  tooltip.className = "pace-tooltip";
  container.append(tooltip);

  // Dots for points with data
  points.forEach((p, i) => {
    if (p.avg === null) return;
    const x = xForIndex(i);
    const y = yForDays(p.avg);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 4.5);
    dot.setAttribute("class", "pace-line-dot"); dot.setAttribute("tabindex", "0");
    dot.setAttribute("aria-label",
      `${p.label}${!isAllTime ? ` ${year}` : ""}: averaged ${p.avg} ${p.avg === 1 ? "day" : "days"} per book across ${p.count} ${p.count === 1 ? "book" : "books"}`
    );
    const showTooltip = (domEvent) => {
      const rect = container.getBoundingClientRect();
      const point = domEvent.target.getBoundingClientRect();
      tooltip.textContent = `${p.label} — averaged ${p.avg} ${p.avg === 1 ? "day" : "days"} per book (${p.count} ${p.count === 1 ? "book" : "books"})`;
      tooltip.style.left = `${point.left - rect.left + point.width / 2}px`;
      tooltip.style.top = `${point.top - rect.top}px`;
      tooltip.classList.add("is-visible");
    };
    const hideTooltip = () => tooltip.classList.remove("is-visible");
    dot.addEventListener("mouseenter", showTooltip);
    dot.addEventListener("mousemove", showTooltip);
    dot.addEventListener("mouseleave", hideTooltip);
    dot.addEventListener("focus", showTooltip);
    dot.addEventListener("blur", hideTooltip);
    dot.addEventListener("click", () => openMonthInLibrary(p.monthIndex, isAllTime ? p.pointYear : year));
    svg.append(dot);
  });

  container.append(svg);

  const overallAvg = Math.round(withData.reduce((s, p) => s + p.avg, 0) / withData.length);
  const summary = document.createElement("p");
  summary.className = "pace-summary";
  summary.textContent = `Averaging ${overallAvg} ${overallAvg === 1 ? "day" : "days"} per book across the months you've logged.`;
  container.append(summary);
}

function daysBetween(startDate, finishDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const finish = new Date(`${finishDate}T00:00:00`);
  return Math.round((finish - start) / 86400000);
}

// ---------- Dynamic insights: a handful of plain-language observations ----------

function renderInsights({ finished, finishedWithDates, pages, averageRating, genreCounts, rated, isAllTime, year, scopedBooks, rereadFinishes }) {
  const insights = [];

  // Busiest month
  if (finishedWithDates.length) {
    const counts = new Map();
    finishedWithDates.forEach((readEvent) => {
      const date = new Date(`${readEvent.finishDate}T00:00:00`);
      if (!isAllTime && date.getFullYear() !== year) return;
      const key = isAllTime
        ? `${date.getFullYear()}-${date.getMonth()}`
        : String(date.getMonth());
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const busiest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (busiest && busiest[1] > 1) {
      const [key, count] = busiest;
      const label = isAllTime
        ? new Date(Number(key.split("-")[0]), Number(key.split("-")[1]), 1).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })
        : new Date(year, Number(key), 1).toLocaleDateString(undefined, { month: "long" });
      insights.push({
        glyph: "📚",
        html: `Your busiest stretch was <strong>${label}</strong>, with <strong>${count} books</strong> finished.`,
      });
    }
  }

  // Top genre
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  if (topGenres.length) {
    const [genre, count] = topGenres[0];
    const share = Math.round((count / finished.length) * 100);
    insights.push({
      glyph: "🌿",
      html: `<strong>${escapeHtml(genre)}</strong> made up about <strong>${share}%</strong> of what you finished.`,
    });
  }

  // Fastest read
  const timed = finishedWithDates
    .filter((readEvent) => readEvent.startDate && readEvent.finishDate && readEvent.startDate <= readEvent.finishDate && Number(readEvent.pages) > 0)
    .map((readEvent) => ({ readEvent, days: Math.max(1, daysBetween(readEvent.startDate, readEvent.finishDate)) }));
  if (timed.length) {
    const fastest = [...timed].sort((a, b) => a.days - b.days)[0];
    insights.push({
      glyph: "⚡",
      html: `<strong>${escapeHtml(fastest.readEvent.title)}</strong> was your fastest read this period, finished in <strong>${
        fastest.days
      } ${fastest.days === 1 ? "day" : "days"}</strong>.`,
    });
  }

  // Highest rated
  if (rated.length) {
    const top = [...rated].sort((a, b) => Number(b.rating) - Number(a.rating))[0];
    insights.push({
      glyph: "✨",
      html: `<strong>${escapeHtml(top.title)}</strong> is your highest-rated finish, at <strong>${
        top.rating
      } stars</strong>.`,
    });
  }

  // Longest book
  const withPages = finished.filter((readEvent) => Number(readEvent.pages) > 0);
  if (withPages.length) {
    const longest = [...withPages].sort((a, b) => Number(b.pages) - Number(a.pages))[0];
    insights.push({
      glyph: "📖",
      html: `The longest book you finished was <strong>${escapeHtml(longest.title)}</strong> at <strong>${Number(
        longest.pages
      ).toLocaleString()} pages</strong>.`,
    });
  }

  // Re-reads
  if (rereadFinishes?.length) {
    const mostReread = [...books]
      .filter((book) => rereadCount(book) > 0)
      .sort((a, b) => rereadCount(b) - rereadCount(a))[0];
    if (mostReread) {
      const count = rereadCount(mostReread);
      insights.push({
        glyph: "↻",
        html: `You've gone back to <strong>${escapeHtml(mostReread.title)}</strong> <strong>${count} ${
          count === 1 ? "time" : "times"
        }</strong>.`,
      });
    }
  }

  // Pace trend (compare first half vs second half of the scoped period, all-time only meaningful with enough data)
  if (timed.length >= 4) {
    const sorted = [...timed].sort(
      (a, b) => new Date(`${a.readEvent.finishDate}T00:00:00`) - new Date(`${b.readEvent.finishDate}T00:00:00`)
    );
    const midpoint = Math.floor(sorted.length / 2);
    const earlierAvg = average(sorted.slice(0, midpoint).map((entry) => entry.days));
    const laterAvg = average(sorted.slice(midpoint).map((entry) => entry.days));
    if (laterAvg < earlierAvg * 0.85) {
      insights.push({ glyph: "📈", html: `You've been reading <strong>faster lately</strong> than earlier in this period.` });
    } else if (laterAvg > earlierAvg * 1.15) {
      insights.push({ glyph: "📉", html: `Your pace has <strong>slowed a little</strong> compared to earlier in this period.` });
    }
  }

  // Fallback if nothing else qualified
  if (!insights.length) {
    insights.push({
      glyph: "🌱",
      html: scopedBooks.length
        ? "Finish a few more books to start seeing patterns in your reading."
        : "Add and finish some books to see insights appear here.",
    });
  }

  elements.insightsList.innerHTML = "";
  insights.slice(0, 6).forEach((insight) => {
    const item = document.createElement("li");
    item.className = "insight-card";
    item.innerHTML = `<span class="insight-glyph" aria-hidden="true">${insight.glyph}</span><p class="insight-text">${insight.html}</p>`;
    elements.insightsList.append(item);
  });
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

// ---------- Library list row (replaces the old card grid) ----------
//
// A compact three-column row: thumbnail on the left, title/author/genre tags in the
// middle, and status + rating + page count right-aligned. Scanning a long list is
// faster in this format than in a grid of equal-size cards.

function bookRow(book) {
  const row = document.createElement("article");
  row.className = "book-row";
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");
  row.setAttribute("aria-label", `Open ${book.title}`);

  const color = statusColor(book.status);
  const genreTags = splitTagList(book.genres).slice(0, 2)
    .map((g) => `<span class="book-row-tag">${escapeHtml(g)}</span>`)
    .join("");

  const ratingHtml = book.rating
    ? `<span class="book-row-rating" aria-label="${book.rating} out of 5 stars">${starGlyphs(Number(book.rating))}</span>`
    : "";

  row.innerHTML = `
    <div class="book-row-cover">${coverMarkup(book)}</div>
    <div class="book-row-body">
      <p class="book-row-title">${escapeHtml(book.title)}</p>
      <p class="book-row-author">${escapeHtml(book.author || "Unknown author")}</p>
      ${genreTags ? `<div class="book-row-tags">${genreTags}</div>` : ""}
    </div>
    <div class="book-row-right">
      <span class="book-row-status">
        <span class="book-row-dot" style="background:${color}"></span>
        ${escapeHtml(statusLabel(book.status))}
      </span>
      ${ratingHtml}
      ${book.pages ? `<span class="book-row-pages">${book.pages} pp</span>` : ""}
    </div>
  `;

  const open = () => openBook(book.id);
  row.addEventListener("click", open);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  return row;
}

// ---------- Currently-reading card (horizontal scroll row) ----------
//
// Wider than the old spotlight card and left-aligned so it reads as a proper
// detail preview: large cover on the left, badge + title + author + genre chips
// + day count on the right. The first card gets an accent left border.

function readingCard(book) {
  const card = document.createElement("article");
  card.className = "reading-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open ${book.title}`);

  const topGenre = splitTagList(book.genres)[0];
  const dayLabel = spotlightDayLabel(book);

  card.innerHTML = `
    <div class="reading-card-cover">${coverMarkup(book)}</div>
    <div class="reading-card-body">
      <span class="reading-card-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Reading
      </span>
      <h4 class="reading-card-title">${escapeHtml(book.title)}</h4>
      <p class="reading-card-author">${escapeHtml(book.author || "Unknown author")}</p>
      <div class="reading-card-meta">
        ${topGenre ? `<span class="reading-card-genre">${escapeHtml(topGenre)}</span>` : ""}
        <span class="reading-card-day">${escapeHtml(dayLabel)}</span>
        ${book.pages ? `<span class="reading-card-pages">${book.pages} pages</span>` : ""}
      </div>
    </div>
  `;

  const open = () => openBook(book.id);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  return card;
}

// ---------- Currently-reading spotlight card ----------
//
// A book "propped on the windowsill": a bigger cover with a soft ambient glow
// sampled from its own artwork, a status ribbon pulled from the same colors
// used everywhere else (Shelves, status pills), and a real day-count instead
// of a fabricated progress bar, since the app has no actual page-progress data
// to back one up.

function spotlightCard(book) {
  const card = document.createElement("article");
  card.className = "spotlight-card";
  card.style.setProperty("--tilt", `${spotlightTilt(book)}deg`);
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open ${book.title}`);

  const topGenre = splitTagList(book.genres)[0];
  const statusBg = statusColor(book.status);
  const statusFg = statusTextColor(statusBg);
  const dayLabel = spotlightDayLabel(book);

  card.innerHTML = `
    <div class="spotlight-glow" aria-hidden="true"></div>
    <div class="spotlight-cover-wrap">
      <span class="spotlight-ribbon" style="background:${statusBg}; color:${statusFg}">${escapeHtml(statusLabel(book.status))}</span>
      <div class="spotlight-cover">${coverMarkup(book)}</div>
    </div>
    <div class="spotlight-info">
      <h4>${escapeHtml(book.title)}</h4>
      <p class="spotlight-author">${escapeHtml(book.author || "Unknown author")}</p>
      ${topGenre ? `<span class="spotlight-genre">${escapeHtml(topGenre)}</span>` : ""}
      <div class="spotlight-meta">
        <span class="spotlight-day">${escapeHtml(dayLabel)}</span>
        ${book.pages ? `<span>${book.pages} pages</span>` : ""}
      </div>
    </div>
  `;

  const open = () => openBook(book.id);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });

  applySpotlightGlow(book, card);
  return card;
}

// A small, deterministic lean per book (same idea as the bookshelf spines) so
// the row reads as books set down by hand rather than printed in a line.
function spotlightTilt(book) {
  const raw = hashString(`spotlight:${book.id || book.title}`) % 100;
  const degrees = 1 + (raw % 10) / 5; // ~1-3deg
  return raw % 2 === 0 ? degrees : -degrees;
}

function spotlightDayLabel(book) {
  if (!book.startDate) return "Just picked up";
  const today = toDateInput(new Date());
  if (book.startDate > today) return "Starting soon";
  const days = daysBetween(book.startDate, today) + 1;
  return days <= 1 ? "Started today" : `Day ${days}`;
}

// Samples the cover's dominant color, reusing the same cached thumbnail and
// extraction logic the bookshelf spines use, and stores it as an rgb triple
// on the card so the ambient glow behind the cover is drawn from the actual
// artwork instead of one fixed color for every book.
function applySpotlightGlow(book, card) {
  if (!book.cover) return;
  getCoverThumbnail(book.cover, (dataUrl) => {
    const image = new Image();
    image.onload = () => {
      try {
        const [r, g, b] = colorToRgb(dominantImageColor(image));
        card.style.setProperty("--glow-color", `${r}, ${g}, ${b}`);
      } catch {
        // Keep the default glow color if sampling fails.
      }
    };
    image.src = dataUrl;
  });
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

  const fallback = fallbackSpineColor(book, index);
  spine.style.setProperty("--spine-height", `${spineHeight(book)}px`);
  spine.style.setProperty("--spine-width", `${spineWidth(book)}px`);
  spine.style.setProperty("--spine-color", fallback);
  spine.style.setProperty("--spine-edge", shadeColor(fallback, -32));
  spine.style.setProperty("--spine-ink", spineInkColor(fallback));
  spine.style.setProperty("--spine-grain", spineGrainImage(index));
  spine.style.setProperty("--spine-tilt", `${spineTilt(book)}deg`);

  const rating = Number(book.rating || 0);
  if (rating >= 4) {
    spine.style.setProperty("--spine-gilt-color", "#d9b96a");
    spine.style.setProperty("--spine-gilt-opacity", rating >= 4.5 ? "0.85" : "0.55");
  }

  spine.innerHTML = `
    <span class="spine-title">${escapeHtml(book.title)}</span>
    <span class="spine-gilt" aria-hidden="true"></span>
    <span class="spine-author">${escapeHtml(book.author || "Unknown")}</span>
    ${rereadCount(book) > 0 ? '<span class="spine-reread-mark" aria-hidden="true">↻</span>' : ""}
  `;
  applyCoverColor(book, spine);
  spine.addEventListener("click", () => openBook(book.id));
  return spine;
}

// A very small, deterministic lean (never more than a couple degrees) so the row
// reads as books that were placed by hand rather than printed in a perfect line.
function spineTilt(book) {
  const raw = hashString(`tilt:${book.id || book.title}`) % 100;
  if (raw < 70) return 0; // most books still sit straight
  const degrees = 0.6 + (raw % 14) / 10; // ~0.6–1.9deg
  return raw % 2 === 0 ? degrees : -degrees;
}

function spineHeight(book) {
  const pageBaseline = 150 + Math.min(Number(book.pages || 220), 620) / 9;
  const jitter = hashString(`height:${book.id || book.title}`) % 95;
  return Math.round(pageBaseline + jitter);
}


// ---------- Cover thumbnail cache ----------
//
// Cover URLs can point to images of any size — Open Library "-L" covers, or anything
// a person pastes in manually. Rendering them at full size into a 38–160px slot still
// costs a full download + decode of the original. Instead, the first time a cover URL
// is used anywhere in the app, we draw it once into a small canvas, cache the
// downscaled result (a data URL) in memory, and reuse that small version everywhere
// for the rest of the session — regardless of how large the source image actually is.
//
// Canvas pixel-reading requires the image's host to allow cross-origin reads (CORS).
// Most do, but some don't. When that happens we cannot legally read the pixels, so we
// fall back to just letting the browser display the original image directly — slower,
// but still correct and visible.

// 160x240 CSS px is the largest real slot (book detail cover). On a 2x retina screen
// that needs ~320x480 device pixels to render crisp — 480 (with a little headroom)
// keeps every view sharp on standard and high-DPI screens without caching full-size
// originals that are often 4-10x larger than anything ever displayed.
const COVER_THUMB_SIZE = 480;
const coverThumbCache = new Map(); // cover URL -> { status: "ready"|"unsupported", dataUrl? }
const coverThumbListeners = new Map(); // cover URL -> Set of callbacks waiting on it

function getCoverThumbnail(url, onReady) {
  const cached = coverThumbCache.get(url);
  if (cached) {
    if (cached.status === "ready") onReady(cached.dataUrl);
    return;
  }

  if (coverThumbListeners.has(url)) {
    coverThumbListeners.get(url).add(onReady);
    return;
  }

  coverThumbListeners.set(url, new Set([onReady]));

  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    let dataUrl = null;
    try {
      dataUrl = downscaleImageToDataUrl(image, COVER_THUMB_SIZE);
    } catch {
      // Cross-origin pixel read blocked by the image host (no CORS). Mark unsupported
      // so callers fall back to the original <img src> instead of retrying forever.
    }

    if (dataUrl) {
      coverThumbCache.set(url, { status: "ready", dataUrl });
      coverThumbListeners.get(url)?.forEach((callback) => callback(dataUrl));
    } else {
      coverThumbCache.set(url, { status: "unsupported" });
    }
    coverThumbListeners.delete(url);
  };

  image.onerror = () => {
    coverThumbCache.set(url, { status: "unsupported" });
    coverThumbListeners.delete(url);
  };

  image.src = url;
}

// Downscales to a max dimension while preserving aspect ratio, so portrait covers of
// any source size end up as a small, consistent JPEG suitable for thumbnails.
function downscaleImageToDataUrl(image, maxDimension) {
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxDimension / (longestSide || maxDimension));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  // toDataURL throws (security error) if the canvas got cross-origin pixels it
  // wasn't allowed to read; that throw is caught by the caller.
  return canvas.toDataURL("image/jpeg", 0.85);
}

function coverMarkup(book) {
  if (book.cover) {
    const escapedUrl = escapeAttribute(book.cover);
    const escapedAlt = `Cover of ${escapeAttribute(book.title)}`;
    // Render with the original URL immediately (so something shows right away), then
    // swap to the cached small thumbnail once it's ready via data-cover-src matching.
    return `<img src="${escapedUrl}" data-cover-src="${escapedUrl}" alt="${escapedAlt}" loading="lazy" decoding="async" />`;
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
  $("#recommendUnlock").value = "";
  $("#recommendCondition").value = "";
  $("#startDate").value = date;
  $("#status").value = date ? "reading" : "want";
  setStarRatingFromValue("");
  $("#dialogTitle").textContent = "Add a book";
  elements.deleteBook.hidden = true;
  elements.deleteConfirm.hidden = true;
  elements.lookupResults.innerHTML = "";
  elements.dialog.dataset.returnTo = "";
  elements.dialog.dataset.returnBookId = "";
  elements.dialog.showModal();
}

// Opens the read-only "book detail" page for a book. This is what every book
// click (library card, shelf row, bookshelf spine, calendar cover, pace dot)
// should lead to. Use openBookEdit() to jump straight into the editable form.
function openBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;

  renderBookDetail(book);
  elements.bookDetailDialog.showModal();
}

function renderBookDetail(book) {
  elements.bookDetailDialog.dataset.bookId = book.id;

  elements.bookDetailCover.innerHTML = coverMarkup(book);
  hydrateCoverThumbnailsStaggered(elements.bookDetailCover);

  elements.bookDetailStatus.textContent = statusLabel(book.status);
  elements.bookDetailStatus.setAttribute("style", pillStyle(book.status));

  elements.bookDetailTitle.textContent = book.title || "Untitled";
  elements.bookDetailAuthor.textContent = book.author || "Unknown author";

  elements.bookDetailRating.innerHTML = book.rating
    ? `<span aria-hidden="true">${starGlyphsOutOfFive(Number(book.rating))}</span><span class="rating-number">${book.rating} / 5</span>`
    : `<span class="rating-number">Not rated</span>`;

  elements.bookDetailMeta.innerHTML = `
    <span>${book.year || "No year"}</span>
    <span>${book.pages ? `${book.pages} pages` : "No page count"}</span>
  `;

  elements.bookDetailGenres.innerHTML = splitTagList(book.genres)
    .map((genre) => `<span class="detail-tag">${escapeHtml(genre)}</span>`)
    .join("");

  elements.bookDetailTags.innerHTML = splitTagList(book.tags)
    .map((tag) => `<span class="detail-tag is-personal">${escapeHtml(tag)}</span>`)
    .join("");

  elements.bookDetailDates.textContent = bookDetailDateSummary(book);
  renderBookDetailRecommend(book);
  elements.bookDetailNotes.innerHTML = notesToEditableHtml(book.notes);
  renderBookDetailRereads(book);
}

// Shows the "You'll [x] this if you [y]" line on the detail page only when at
// least one blank was actually filled in — an empty template would just be
// noise on books added before this field existed, or left blank on purpose.
function renderBookDetailRecommend(book) {
  const unlock = (book.recommendUnlock || "").trim();
  const condition = (book.recommendCondition || "").trim();

  if (!unlock && !condition) {
    elements.bookDetailRecommend.hidden = true;
    elements.bookDetailRecommend.innerHTML = "";
    return;
  }

  elements.bookDetailRecommend.hidden = false;
  elements.bookDetailRecommend.innerHTML = `You'll <strong>${escapeHtml(
    unlock || "…"
  )}</strong> this if you <strong>${escapeHtml(condition || "…")}</strong>`;
}

// ---------- Read history (re-reads) on the Book Details page ----------
//
// Shows every past read-through as a small reverse-chronological list — newest
// first, since that's most often what you'd want to glance at ("when did I last
// read this?"). The primary read-through is included alongside re-reads so the
// list reads as one continuous history rather than splitting "the real read" from
// "the re-reads" arbitrarily. Each row is clickable to edit that specific entry.
function renderBookDetailRereads(book) {
  const events = readEventsFor(book).sort((a, b) => {
    const aKey = a.finishDate || a.startDate || "";
    const bKey = b.finishDate || b.startDate || "";
    return bKey.localeCompare(aKey);
  });

  if (events.length < 2) {
    elements.bookDetailRereadsSection.hidden = true;
    elements.rereadsList.innerHTML = "";
    return;
  }

  elements.bookDetailRereadsSection.hidden = false;
  elements.rereadsCount.textContent = `${events.length} read-throughs`;
  elements.rereadsList.innerHTML = "";

  events.forEach((event) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "reread-row";

    const dateLabel = rereadRowDateLabel(event);
    const ratingLabel = event.rating ? `${starGlyphsOutOfFive(Number(event.rating))}` : "";

    row.innerHTML = `
      <span class="reread-row-icon" aria-hidden="true">${event.isReread ? "↻" : "●"}</span>
      <span class="reread-row-body">
        <strong>${event.isReread ? "Re-read" : "First read"}</strong>
        <span class="reread-row-date">${escapeHtml(dateLabel)}</span>
        ${event.notes ? `<span class="reread-row-notes">${notesToEditableHtml(event.notes)}</span>` : ""}
      </span>
      ${ratingLabel ? `<span class="reread-row-rating" aria-hidden="true">${ratingLabel}</span>` : ""}
    `;

    row.addEventListener("click", () => {
      if (event.isReread) {
        openRereadEdit(book.id, event.eventId);
      } else {
        elements.bookDetailDialog.close();
        openBookEdit(book.id, { returnTo: "detail" });
      }
    });

    elements.rereadsList.append(row);
  });
}

function rereadRowDateLabel(event) {
  const started = event.startDate ? formatDisplayDate(event.startDate) : "";
  const finished = event.finishDate ? formatDisplayDate(event.finishDate) : "";
  if (started && finished) return `${started} – ${finished}`;
  if (finished) return `Finished ${finished}`;
  if (started) return `Started ${started}`;
  return "No dates logged";
}

function splitTagList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function bookDetailDateSummary(book) {
  const started = book.startDate ? formatDisplayDate(book.startDate) : "";
  const finished = book.finishDate ? formatDisplayDate(book.finishDate) : "";
  const count = rereadCount(book);
  const rereadSuffix = count > 0 ? ` · Re-read ${count} ${count === 1 ? "time" : "times"}` : "";

  if (started && finished) return `Started ${started} · Finished ${finished}${rereadSuffix}`;
  if (finished) return `Finished ${finished}${rereadSuffix}`;
  if (started) return `Started ${started}${rereadSuffix}`;
  return (book.status === "want" ? "Not started yet" : "No dates logged") + rereadSuffix;
}

function formatDisplayDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Opens the existing editable form for a book (previously this was openBook()).
// When opened from the detail page, pass returnTo: "detail" so closing, saving,
// or canceling out of the form lands back on that book's detail page instead of
// just closing outright.
function openBookEdit(id, { returnTo = "" } = {}) {
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
  $("#recommendUnlock").value = book.recommendUnlock || "";
  $("#recommendCondition").value = book.recommendCondition || "";
  $("#dialogTitle").textContent = "Edit book";
  elements.deleteBook.hidden = false;
  elements.deleteConfirm.hidden = true;
  elements.lookupResults.innerHTML = "";
  elements.dialog.dataset.returnTo = returnTo;
  elements.dialog.dataset.returnBookId = returnTo ? book.id : "";
  elements.dialog.showModal();
}

function collectFormBook() {
  const finishDate = $("#finishDate").value;

  return {
    id: $("#bookId").value || crypto.randomUUID(),
    title: $("#title").value.trim(),
    author: $("#author").value.trim(),
    status: finishDate ? "finished" : $("#status").value,
    rating: $("#rating").value,
    startDate: $("#startDate").value,
    finishDate,
    year: $("#year").value.trim(),
    pages: Number($("#pages").value || 0),
    cover: $("#cover").value.trim(),
    genres: $("#genres").value.trim(),
    tags: $("#tags").value.trim(),
    notes: collectNotesHtml(),
    recommendUnlock: $("#recommendUnlock").value.trim(),
    recommendCondition: $("#recommendCondition").value.trim(),
  };
}

// ---------- Log a re-read dialog ----------
//
// A re-read is a separate, lightweight start/finish/rating/notes entry stored in
// book.rereads, never touching the book's own primary startDate/finishDate. This
// way logging a new read-through is purely additive — the original read stays
// exactly as it was, and the new one just joins the read history list.

function openRereadAdd(bookId) {
  const book = books.find((item) => item.id === bookId);
  if (!book) return;

  $("#rereadId").value = "";
  $("#rereadBookId").value = bookId;
  $("#rereadDialogTitle").textContent = "Log a re-read";
  $("#rereadStartDate").value = "";
  $("#rereadFinishDate").value = toDateInput(new Date());
  $("#rereadNotes").value = "";
  setStarRatingFromValue("", elements.rereadStarRating, elements.rereadRatingInput);
  elements.deleteReread.hidden = true;
  elements.rereadDialog.showModal();
}

function openRereadEdit(bookId, rereadId) {
  const book = books.find((item) => item.id === bookId);
  const reread = book?.rereads?.find((item) => item.id === rereadId);
  if (!book || !reread) return;

  $("#rereadId").value = reread.id;
  $("#rereadBookId").value = bookId;
  $("#rereadDialogTitle").textContent = "Edit re-read";
  $("#rereadStartDate").value = reread.startDate || "";
  $("#rereadFinishDate").value = reread.finishDate || "";
  $("#rereadNotes").value = reread.notes || "";
  setStarRatingFromValue(reread.rating, elements.rereadStarRating, elements.rereadRatingInput);
  elements.deleteReread.hidden = false;
  elements.rereadDialog.showModal();
}

function saveRereadFromForm() {
  const bookId = $("#rereadBookId").value;
  const book = books.find((item) => item.id === bookId);
  if (!book) return;

  const entry = {
    id: $("#rereadId").value || crypto.randomUUID(),
    startDate: $("#rereadStartDate").value,
    finishDate: $("#rereadFinishDate").value,
    rating: $("#rereadRating").value,
    notes: $("#rereadNotes").value.trim(),
  };

  if (!entry.startDate && !entry.finishDate) return;

  book.rereads = book.rereads || [];
  const existingIndex = book.rereads.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) book.rereads[existingIndex] = entry;
  else book.rereads.push(entry);

  saveBooks();
  render();
  elements.rereadDialog.close();
  if (elements.bookDetailDialog.open) renderBookDetail(book);
}

function deleteRereadFromForm() {
  const bookId = $("#rereadBookId").value;
  const rereadId = $("#rereadId").value;
  const book = books.find((item) => item.id === bookId);
  if (!book || !rereadId) return;

  book.rereads = (book.rereads || []).filter((item) => item.id !== rereadId);
  saveBooks();
  render();
  elements.rereadDialog.close();
  if (elements.bookDetailDialog.open) renderBookDetail(book);
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
      ${cover ? `<img src="${cover}" alt="" loading="lazy" decoding="async" />` : '<div class="mini-cover"></div>'}
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

// ---------- Find missing covers (title/author fallback search) ----------
//
// The ISBN lookup above only fires when a Goodreads row had an ISBN, and even then
// it can miss if that specific edition isn't in Open Library's cover database. This
// is a second-chance pass: for any book still missing a cover, search Open Library
// by title + author (the same endpoint and approach as the manual "Search Open
// Library" lookup in the Add Book dialog) and take the first match's cover, if any.
// Books that still can't be matched are left alone — no placeholder covers are
// invented.

async function findCoverByTitleAuthor(book) {
  const query = [book.title, book.author].filter(Boolean).join(" ");
  if (!query.trim()) return null;

  try {
    const fields = "title,author_name,cover_i";
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=${fields}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const match = data.docs?.[0];
    return match?.cover_i ? `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg` : null;
  } catch {
    return null;
  }
}

async function findMissingCovers({ onProgress } = {}) {
  const missing = books.filter((book) => !book.cover && (book.title || "").trim());
  if (!missing.length) return { checked: 0, found: 0 };

  let found = 0;
  for (let index = 0; index < missing.length; index += 1) {
    const book = missing[index];
    const cover = await findCoverByTitleAuthor(book);
    if (cover) {
      book.cover = cover;
      found += 1;
    }
    onProgress?.(index + 1, missing.length);
  }

  if (found) {
    saveBooks();
    render();
  }

  return { checked: missing.length, found };
}

function setToolsStatus(message, { busy = false } = {}) {
  if (!elements.toolsStatus) return;
  elements.toolsStatus.hidden = !message;
  elements.toolsStatus.textContent = message || "";
  elements.toolsStatus.classList.toggle("is-busy", busy);
}

async function handleFindMissingCoversClick() {
  const missingCount = books.filter((book) => !book.cover && (book.title || "").trim()).length;
  if (!missingCount) {
    setToolsStatus("Every book already has a cover.");
    return;
  }

  if (elements.findMissingCovers) elements.findMissingCovers.disabled = true;
  setToolsStatus(`Searching Open Library… 0 of ${missingCount}`, { busy: true });

  const { checked, found } = await findMissingCovers({
    onProgress: (done, total) => setToolsStatus(`Searching Open Library… ${done} of ${total}`, { busy: true }),
  });

  if (elements.findMissingCovers) elements.findMissingCovers.disabled = false;

  if (!checked) {
    setToolsStatus("Every book already has a cover.");
  } else if (found) {
    setToolsStatus(`Found ${found} of ${checked} missing ${checked === 1 ? "cover" : "covers"}.`);
  } else {
    setToolsStatus(`No matches found for the ${checked} book${checked === 1 ? "" : "s"} still missing a cover.`);
  }
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

  const stillMissing = enriched.filter((book) => !book.cover);
  if (stillMissing.length) {
    let doneCount = 0;
    for (const book of stillMissing) {
      elements.importProgressText.textContent = `Looking for missing covers… ${doneCount} of ${stillMissing.length}`;
      const cover = await findCoverByTitleAuthor(book);
      if (cover) book.cover = cover;
      doneCount += 1;
    }
    elements.importProgressText.textContent = `Looking for missing covers… ${doneCount} of ${stillMissing.length}`;
  }

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
    elements.syncButtonLabel.textContent = messages[state] || messages.idle;
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

// A small set of muted, slightly dusty cloth-binding colors — closer to what real
// hardcover bindings look like than saturated brand colors. Used as the spine's base
// whenever there's no cover to sample, or blended toward when there is one (see
// toClothColor below) so every spine, regardless of source, ends up feeling like
// fabric or leather rather than a flat poster swatch.
function fallbackSpineColor(book, index = 0) {
  const colors = ["#5b6b56", "#75665a", "#5e6470", "#7a5e52", "#646154", "#516159", "#6b5a63", "#5a5648"];
  return colors[(hashString(book.cover || book.title || String(index)) + index) % colors.length];
}

function applyCoverColor(book, spine) {
  if (!book.cover) return;

  // Reuses the small cached thumbnail (shared with every other view) instead of
  // issuing a second full-size network request just to sample a color. If the
  // thumbnail isn't cached yet, this triggers the one-time downscale, and any other
  // part of the app waiting on the same URL benefits from it too.
  getCoverThumbnail(book.cover, (dataUrl) => {
    const image = new Image();
    image.onload = () => {
      try {
        const sampled = dominantImageColor(image);
        const clothColor = toClothColor(sampled);
        spine.style.setProperty("--spine-color", clothColor);
        spine.style.setProperty("--spine-edge", shadeColor(clothColor, -32));
        spine.style.setProperty("--spine-ink", spineInkColor(clothColor));
      } catch {
        // Fallback colors stay in place when a cover cannot be sampled.
      }
    };
    image.src = dataUrl;
  });
}

// Takes a vivid color sampled straight off a cover and mutes it toward something that
// could plausibly be dyed cloth or leather: pulled most of the way toward a neutral
// grey-brown and slightly darkened, so a bright orange cover doesn't turn into a
// traffic-cone spine sitting next to muted neighbors.
function toClothColor(sampledColor) {
  const desaturated = mixColors(sampledColor, "#6b6358", 0.62);
  return shadeColor(desaturated, -8);
}

function mixColors(colorA, colorB, weightB) {
  const [r1, g1, b1] = colorToRgb(colorA);
  const [r2, g2, b2] = colorToRgb(colorB);
  const mix = (a, b) => Math.round(a * (1 - weightB) + b * weightB);
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}

function colorToRgb(color) {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const match = color.match(/\d+/g);
  return match ? match.slice(0, 3).map(Number) : [90, 80, 70];
}

// Picks readable vertical-text ink (warm cream or soft charcoal) based on how light
// or dark the spine's base color is, so text stays legible across the whole palette
// without needing a per-color lookup table.
function spineInkColor(baseColor) {
  const [r, g, b] = colorToRgb(baseColor);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#3a342c" : "#f2ecdf";
}

// A faint, single fixed grain pattern (not color-dependent) shared by every spine —
// real cloth and paper texture is mostly about subtle irregularity, not a pattern
// matched to each hue. Picking from two near-identical variants by index just keeps
// immediate neighbors from looking like they were stamped from one texture tile.
const SPINE_GRAIN_VARIANTS = [
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='5'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23000' fill-opacity='0.035'/%3E%3Ccircle cx='3.5' cy='3' r='0.4' fill='%23fff' fill-opacity='0.03'/%3E%3C/svg%3E")`,
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='5'%3E%3Ccircle cx='3' cy='1.5' r='0.45' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='1' cy='3.5' r='0.4' fill='%23fff' fill-opacity='0.035'/%3E%3C/svg%3E")`,
];

function spineGrainImage(index) {
  return SPINE_GRAIN_VARIANTS[index % SPINE_GRAIN_VARIANTS.length];
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
//
// Generalized to support more than one instance on the page (the main book
// form's rating, and the re-read dialog's rating use separate containers/
// inputs/clip-id namespaces so they don't collide).

const STAR_PATH =
  "M12 2.4l2.74 6.49 7.02.59-5.34 4.63 1.63 6.86L12 17.27l-6.05 3.7 1.63-6.86L2.24 9.48l7.02-.59z";

function buildStarRating(container = elements.starRating, hiddenInput = elements.ratingInput, namespace = "") {
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
          <clipPath id="starClip${namespace}${index}">
            <rect x="0" y="0" width="0" height="24"></rect>
          </clipPath>
        </defs>
        <path d="${STAR_PATH}" clip-path="url(#starClip${namespace}${index})"></path>
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
      setStarRating(value, container, hiddenInput);
    });

    container.append(starButton);
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "star-clear";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => setStarRating(0, container, hiddenInput));
  container.append(clearButton);

  paintStars(container, 0);

  container.addEventListener("mouseleave", () => {
    paintStars(container, Number(container.dataset.value || 0));
  });

  container.addEventListener("keydown", (event) => {
    const current = Number(container.dataset.value || 0);
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setStarRating(Math.min(5, current + 0.5), container, hiddenInput);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setStarRating(Math.max(0, current - 0.5), container, hiddenInput);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setStarRating(0, container, hiddenInput);
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

function setStarRating(value, container = elements.starRating, hiddenInput = elements.ratingInput) {
  const clamped = Math.max(0, Math.min(5, value));
  container.dataset.value = clamped ? String(clamped) : "";
  hiddenInput.value = clamped ? String(clamped) : "";
  container.setAttribute("aria-valuenow", String(clamped));
  container.setAttribute("aria-valuetext", clamped ? `${clamped} out of 5 stars` : "Not rated");
  paintStars(container, clamped);
}

function setStarRatingFromValue(rawValue, container = elements.starRating, hiddenInput = elements.ratingInput) {
  const numeric = Number(rawValue || 0);
  setStarRating(Number.isFinite(numeric) ? numeric : 0, container, hiddenInput);
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

elements.navTabs.forEach((tab) => tab.addEventListener("click", () => {
  clearLibraryFinishDateFilter();
  setView(tab.dataset.view);
  if (tab.dataset.view === "library") renderLibrary();
}));
elements.globalSearch?.addEventListener("input", () => {
  clearLibraryFinishDateFilter();
  libraryPage = 1;
  render();
});
elements.statusFilter?.addEventListener("change", () => {
  clearLibraryFinishDateFilter();
  libraryPage = 1;
  render();
});
elements.statsYearFilter?.addEventListener("change", () => {
  statsYear = elements.statsYearFilter.value;
  renderStats();
});

// Pill filter buttons in the library toolbar — sync to the hidden <select> so
// the rest of the app (renderLibrary, statusFilter.value) keeps working unchanged.
document.querySelectorAll(".filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    clearLibraryFinishDateFilter();
    document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    if (elements.statusFilter) {
      elements.statusFilter.value = pill.dataset.filter;
    }
    libraryPage = 1;
    renderLibrary();
  });
});

elements.paginationPrev?.addEventListener("click", () => {
  if (libraryPage > 1) goToLibraryPage(libraryPage - 1);
});
elements.paginationNext?.addEventListener("click", () => {
  goToLibraryPage(libraryPage + 1);
});
elements.paginationJumpInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const requested = Number(elements.paginationJumpInput.value);
  if (!Number.isFinite(requested) || requested < 1) return;
  const pageCount = Number(elements.paginationJumpInput.max || 1);
  goToLibraryPage(Math.min(requested, pageCount));
});
elements.paginationJumpInput?.addEventListener("blur", () => {
  elements.paginationJumpInput.value = "";
});

// Settings dialog (Export / Import / Find missing covers / Sync) is wired up first and
// independently of every other dialog below, so a missing/renamed id anywhere else in
// this file can never prevent the Settings button itself from working.
if (elements.libraryToolsDialog) {
  $("#openLibraryTools")?.addEventListener("click", () => {
    setToolsStatus("");
    elements.libraryToolsDialog.showModal();
  });
  $("#closeLibraryTools")?.addEventListener("click", () => elements.libraryToolsDialog.close());
  elements.libraryToolsDialog.addEventListener("click", (event) => {
    if (event.target === elements.libraryToolsDialog) elements.libraryToolsDialog.close();
  });
}
$("#exportData")?.addEventListener("click", exportData);
$("#importData")?.addEventListener("change", importData);
elements.findMissingCovers?.addEventListener("click", handleFindMissingCoversClick);
$("#openSync")?.addEventListener("click", () => {
  elements.libraryToolsDialog?.close();
  openSyncDialog();
});
$("#closeSyncDialog")?.addEventListener("click", () => elements.syncDialog?.close());
elements.syncDialog?.addEventListener("click", (event) => {
  if (event.target === elements.syncDialog) elements.syncDialog.close();
});
$("#generateSyncCode")?.addEventListener("click", () => {
  elements.syncCodeInput.value = generateSyncCode();
});
$("#connectSync")?.addEventListener("click", handleConnectSyncClick);
elements.disconnectSync?.addEventListener("click", handleDisconnectSyncClick);

$("#manageStatuses")?.addEventListener("click", openManageStatuses);
$("#closeManageStatuses")?.addEventListener("click", () => elements.manageStatusesDialog.close());
elements.manageStatusesDialog?.addEventListener("click", (event) => {
  if (event.target === elements.manageStatusesDialog) elements.manageStatusesDialog.close();
});
elements.newStatusForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  addStatus(elements.newStatusName.value, elements.newStatusColor.value);
  elements.newStatusForm.reset();
  elements.newStatusColor.value = "#b6c9d8";
});

$("#closeDayBooks")?.addEventListener("click", () => elements.dayBooksDialog.close());
elements.dayBooksDialog?.addEventListener("click", (event) => {
  if (event.target === elements.dayBooksDialog) elements.dayBooksDialog.close();
});

$("#closeBookDetail")?.addEventListener("click", () => elements.bookDetailDialog.close());
elements.bookDetailDialog?.addEventListener("click", (event) => {
  if (event.target === elements.bookDetailDialog) elements.bookDetailDialog.close();
});
elements.editBookFromDetail?.addEventListener("click", () => {
  const id = elements.bookDetailDialog.dataset.bookId;
  elements.bookDetailDialog.close();
  if (id) openBookEdit(id, { returnTo: "detail" });
});
elements.logReread?.addEventListener("click", () => {
  const id = elements.bookDetailDialog.dataset.bookId;
  if (id) openRereadAdd(id);
});

elements.rereadDialog?.addEventListener("click", (event) => {
  if (event.target === elements.rereadDialog) elements.rereadDialog.close();
});
$("#closeRereadDialog")?.addEventListener("click", () => elements.rereadDialog.close());
elements.cancelReread?.addEventListener("click", () => elements.rereadDialog.close());
elements.rereadForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveRereadFromForm();
});
elements.deleteReread?.addEventListener("click", () => {
  if (confirm("Remove this read-through from the history?")) deleteRereadFromForm();
});

$("#openAddBook")?.addEventListener("click", () => openAddBook());
$("#closeDialog")?.addEventListener("click", () => elements.dialog.close());
elements.dialog?.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialog?.addEventListener("close", () => {
  elements.deleteConfirm.hidden = true;

  const returnTo = elements.dialog.dataset.returnTo;
  const returnId = elements.dialog.dataset.returnBookId || $("#bookId").value;
  elements.dialog.dataset.returnTo = "";
  elements.dialog.dataset.returnBookId = "";

  if (returnTo === "detail" && returnId && books.some((book) => book.id === returnId)) {
    openBook(returnId);
  }
});
$("#clearForm")?.addEventListener("click", () => {
  elements.bookForm.reset();
  $("#bookId").value = "";
  $("#notes").innerHTML = "";
  $("#recommendUnlock").value = "";
  $("#recommendCondition").value = "";
  setStarRatingFromValue("");
});
$("#lookupButton")?.addEventListener("click", searchBooks);
$("#bookLookup")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchBooks();
  }
});
$("#prevMonth")?.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  render();
});
$("#nextMonth")?.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  render();
});
elements.goToToday?.addEventListener("click", () => {
  calendarDate = new Date();
  render();
});

elements.bookForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const book = collectFormBook();
  const existingIndex = books.findIndex((item) => item.id === book.id);

  if (existingIndex >= 0) books[existingIndex] = book;
  else books.unshift(book);

  saveBooks();
  render();
  elements.dialog.close();
});

// Finishing a book is definitive: as soon as a finish date is entered, keep the
// status field (and the value saved below) in sync with it.
$("#finishDate")?.addEventListener("input", (event) => {
  if (event.currentTarget.value) elements.statusSelect.value = "finished";
});

elements.deleteBook?.addEventListener("click", () => {
  const id = $("#bookId").value;
  if (!id) return;
  elements.deleteConfirm.hidden = false;
});

elements.cancelDelete?.addEventListener("click", () => {
  elements.deleteConfirm.hidden = true;
});

elements.confirmDelete?.addEventListener("click", () => {
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
buildStarRating(elements.rereadStarRating, elements.rereadRatingInput, "reread");
setupNotesEditor();
render();
initSyncFromStoredConfig();
