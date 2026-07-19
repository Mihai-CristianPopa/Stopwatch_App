import { getBackendOrigin } from './checkBackend.js';
import {
  getActiveTab, setActiveTab, getBooks, setBooks,
  getPage, setPage, getPageSize, setPageSize,
} from './libraryState.js';

const PAGE_SIZE = 1; // default; runtime value lives in libraryState._pageSize

// ── API client ────────────────────────────────────────────────────────────────

async function fetchBooks(status) {
  const res = await fetch(`${getBackendOrigin()}/books?status=${status}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to fetch books (${res.status})`);
  return res.json();
}

async function createBook(payload) {
  const res = await fetch(`${getBackendOrigin()}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create book');
  return data;
}

async function updateBook(id, patch) {
  const res = await fetch(`${getBackendOrigin()}/books/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update book');
  return data;
}

async function reorderBooks(status, ids) {
  const res = await fetch(`${getBackendOrigin()}/books/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reorder books');
  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function renderStars(rating) {
  if (!rating) return '';
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star${i <= rating ? ' filled' : ''}">${i <= rating ? '★' : '☆'}</span>`;
  }
  return html;
}

function formatDate(dateStr, precision) {
  if (!dateStr) return '—';
  const effectivePrecision = precision || inferPrecisionFromStr(dateStr);
  if (effectivePrecision === 'year') return dateStr.slice(0, 4);
  if (effectivePrecision === 'month') {
    const [y, m] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', timeZone: 'UTC',
    });
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function inferPrecisionFromStr(dateStr) {
  if (!dateStr) return 'day';
  if (/^\d{4}$/.test(dateStr)) return 'year';
  if (/^\d{4}-\d{2}$/.test(dateStr)) return 'month';
  return 'day';
}

// ── DOM refs (resolved once on first init) ────────────────────────────────────

let listEl;
let paginationEl;
let pagePrevBtn;
let pageNextBtn;
let pageIndicator;
let pageSizeSelect;
let tabBtns;
let addBookBtn;
let formDialog;
let bookForm;
let bookIdInput;
let bookStatusToggle;
let bookStatusBtns;
let bookTitleInput;
let bookAuthorInput;
let bookImageUrlInput;
let bookSourceInput;
let bookReadFields;
let bookDatePrecisionSelect;
let bookDateReadLabel;
let bookDateReadInput;
let bookDateReadMonthLabel;
let bookDateReadMonthInput;
let bookDateReadYearLabel;
let bookDateReadYearInput;
let bookRatingSelect;
let bookNotesInput;
let bookFormError;
let bookFormTitle;
let detailDialog;
let detailCover;
let detailTitle;
let detailAuthor;
let detailSource;
let detailRating;
let detailNotes;
let detailNotesToggle;
let detailEditBtn;
let confirmDialog;
let confirmYesBtn;
let confirmNoBtn;
let confirmBookTitle;
let confirmRatingSelect;
let confirmNotesInput;

// ── Rendering ─────────────────────────────────────────────────────────────────

function buildCoverEl(imageUrl, large = false) {
  if (imageUrl) {
    const img = document.createElement('img');
    img.className = large ? 'book-cover-large' : 'book-cover';
    img.alt = '';
    img.src = imageUrl;
    img.onerror = () => {
      const placeholder = document.createElement('div');
      placeholder.className = large ? 'book-cover-large book-cover-placeholder' : 'book-cover book-cover-placeholder';
      img.replaceWith(placeholder);
    };
    return img;
  }
  const placeholder = document.createElement('div');
  placeholder.className = large ? 'book-cover-large book-cover-placeholder' : 'book-cover book-cover-placeholder';
  return placeholder;
}

function renderList(books, tab) {
  listEl.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(books.length / getPageSize()));
  const currentPage = Math.min(getPage(), totalPages);
  setPage(currentPage);
  const start = (currentPage - 1) * getPageSize();
  const visible = books.slice(start, start + getPageSize());

  if (books.length === 0) {
    const li = document.createElement('li');
    li.className = 'loading';
    li.textContent = tab === 'wishlist' ? 'No books in your wishlist yet.' : 'No books in your read list yet.';
    listEl.appendChild(li);
    paginationEl.hidden = true;
    return;
  }

  visible.forEach((book, idx) => {
    const absoluteIdx = start + idx;
    const li = document.createElement('li');
    li.className = 'book-row';

    // reorder controls
    const reorder = document.createElement('div');
    reorder.className = 'book-reorder';

    const upBtn = document.createElement('button');
    upBtn.className = 'reorder-btn';
    upBtn.textContent = '▲';
    upBtn.title = 'Move up';
    upBtn.disabled = absoluteIdx === 0;
    upBtn.addEventListener('click', e => {
      e.stopPropagation();
      moveBook(absoluteIdx, absoluteIdx - 1, tab);
    });

    const downBtn = document.createElement('button');
    downBtn.className = 'reorder-btn';
    downBtn.textContent = '▼';
    downBtn.title = 'Move down';
    downBtn.disabled = absoluteIdx === books.length - 1;
    downBtn.addEventListener('click', e => {
      e.stopPropagation();
      moveBook(absoluteIdx, absoluteIdx + 1, tab);
    });

    reorder.appendChild(upBtn);
    reorder.appendChild(downBtn);
    li.appendChild(reorder);

    // cover
    li.appendChild(buildCoverEl(book.image_url));

    // main info
    const info = document.createElement('div');
    info.className = 'book-info';

    const titleEl = document.createElement('span');
    titleEl.className = 'book-title';
    titleEl.textContent = book.title;

    const authorEl = document.createElement('span');
    authorEl.className = 'book-author';
    authorEl.textContent = book.author;

    const metaEl = document.createElement('span');
    metaEl.className = 'book-meta';

    if (tab === 'read') {
      const starsEl = document.createElement('span');
      starsEl.className = 'star-rating';
      starsEl.innerHTML = renderStars(book.rating);

      const dateReadEl = document.createElement('span');
      dateReadEl.textContent = `Read: ${formatDate(book.date_read, book.date_read_precision)}`;

      metaEl.appendChild(starsEl);
      metaEl.appendChild(dateReadEl);
    } else {
      metaEl.textContent = `Added: ${formatDate(book.date_added)}`;
    }

    info.appendChild(titleEl);
    info.appendChild(authorEl);
    info.appendChild(metaEl);
    li.appendChild(info);

    // actions
    const actions = document.createElement('div');
    actions.className = 'book-row-actions';

    if (tab === 'wishlist') {
      const markBtn = document.createElement('button');
      markBtn.className = 'btn-secondary';
      markBtn.textContent = 'Mark as Read';
      markBtn.addEventListener('click', e => {
        e.stopPropagation();
        openConfirmMarkRead(book);
      });
      actions.appendChild(markBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      openEditForm(book);
    });
    actions.appendChild(editBtn);

    li.appendChild(actions);

    // row click → detail
    li.addEventListener('click', () => openDetailDialog(book));

    listEl.appendChild(li);
  });

  paginationEl.hidden = false;
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  pagePrevBtn.disabled = currentPage === 1;
  pageNextBtn.disabled = currentPage === totalPages;
}

// ── Reorder ───────────────────────────────────────────────────────────────────

async function moveBook(fromIdx, toIdx, tab) {
  const books = getBooks();
  if (toIdx < 0 || toIdx >= books.length) return;

  // Swap in memory
  const updated = [...books];
  [updated[fromIdx], updated[toIdx]] = [updated[toIdx], updated[fromIdx]];
  setBooks(updated);
  renderList(updated, tab);

  try {
    await reorderBooks(tab, updated.map(b => b._id));
  } catch {
    // Revert on error
    await loadBooks(tab);
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadBooks(tab) {
  setActiveTab(tab);
  setPage(1);
  listEl.innerHTML = '<li class="loading">Loading…</li>';
  paginationEl.hidden = true;

  try {
    const books = await fetchBooks(tab);
    setBooks(books);
    renderList(books, tab);
  } catch {
    listEl.innerHTML = '<li class="error">Could not load books.</li>';
    paginationEl.hidden = true;
  }
}

// ── Form dialog ───────────────────────────────────────────────────────────────

function clearFormError() {
  bookFormError.textContent = '';
  bookFormError.hidden = true;
}

function showFormError(msg) {
  bookFormError.textContent = msg;
  bookFormError.hidden = false;
}

function setPrecisionUI(precision) {
  const p = precision || 'day';
  bookDatePrecisionSelect.value = p;
  bookDateReadLabel.hidden = p !== 'day';
  bookDateReadMonthLabel.hidden = p !== 'month';
  bookDateReadYearLabel.hidden = p !== 'year';
}

function setAddFormStatus(status) {
  bookStatusBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.status === status));
  if (status === 'read') {
    bookReadFields.hidden = false;
    setPrecisionUI('day');
    bookDateReadInput.value = todayStr();
  } else {
    bookReadFields.hidden = true;
  }
}

function openAddForm() {
  const tab = getActiveTab();
  bookFormTitle.textContent = 'Add book';
  bookIdInput.value = '';
  bookForm.reset();
  bookStatusToggle.hidden = false;
  clearFormError();
  setAddFormStatus(tab);
  formDialog.showModal();
}

function openEditForm(book) {
  bookFormTitle.textContent = `Edit ${book.status === 'read' ? 'Read' : 'Wishlist'} book`;
  bookIdInput.value = book._id;
  bookStatusToggle.hidden = true;
  bookTitleInput.value = book.title;
  bookAuthorInput.value = book.author;
  bookImageUrlInput.value = book.image_url || '';
  bookSourceInput.value = book.source || '';
  bookNotesInput.value = book.notes || '';

  if (book.status === 'read') {
    bookReadFields.hidden = false;
    const precision = book.date_read_precision || inferPrecisionFromStr(book.date_read);
    setPrecisionUI(precision);
    if (precision === 'day') {
      bookDateReadInput.value = book.date_read || '';
    } else if (precision === 'month') {
      bookDateReadMonthInput.value = book.date_read || '';
    } else {
      bookDateReadYearInput.value = book.date_read ? book.date_read.slice(0, 4) : '';
    }
    bookRatingSelect.value = book.rating != null ? String(book.rating) : '';
  } else {
    bookReadFields.hidden = true;
    setPrecisionUI('day');
    bookDateReadInput.value = '';
    bookRatingSelect.value = '';
  }

  clearFormError();
  formDialog.showModal();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  clearFormError();

  const id = bookIdInput.value;
  const isEdit = !!id;

  const title = bookTitleInput.value.trim();
  const author = bookAuthorInput.value.trim();

  if (!title) { showFormError('Title is required.'); return; }
  if (!author) { showFormError('Author is required.'); return; }

  const payload = {
    title,
    author,
    image_url: bookImageUrlInput.value.trim() || null,
    source: bookSourceInput.value.trim() || null,
    notes: bookNotesInput.value.trim() || null,
  };

  // Determine whether this is a read book (edit always uses book.status; add uses the toggle)
  const isReadBook = isEdit
    ? (getBooks().find(b => b._id === id)?.status === 'read')
    : (bookStatusBtns && [...bookStatusBtns].find(b => b.classList.contains('active'))?.dataset.status === 'read');

  if (!isEdit) {
    payload.status = isReadBook ? 'read' : 'wishlist';
  }

  if (isReadBook) {
    const precision = bookDatePrecisionSelect.value;
    let dateReadVal = null;
    if (precision === 'day') {
      dateReadVal = bookDateReadInput.value || null;
    } else if (precision === 'month') {
      dateReadVal = bookDateReadMonthInput.value || null;
    } else {
      dateReadVal = bookDateReadYearInput.value ? String(bookDateReadYearInput.value) : null;
    }
    payload.date_read = dateReadVal;
    payload.date_read_precision = dateReadVal ? precision : null;
    payload.rating = bookRatingSelect.value ? parseInt(bookRatingSelect.value, 10) : null;
  }

  try {
    if (isEdit) {
      await updateBook(id, payload);
    } else {
      await createBook(payload);
    }
    formDialog.close();
    await loadBooks(getActiveTab());
  } catch (err) {
    showFormError(err.message || 'Something went wrong.');
  }
}

// ── Detail dialog ─────────────────────────────────────────────────────────────

function openDetailDialog(book) {
  detailCover.innerHTML = '';
  detailCover.appendChild(buildCoverEl(book.image_url, true));

  detailTitle.textContent = book.title;
  detailAuthor.textContent = book.author;
  detailSource.textContent = book.source ? `Source: ${book.source}` : '';
  detailSource.hidden = !book.source;
  detailRating.innerHTML = book.status === 'read' ? renderStars(book.rating) : '';
  detailRating.hidden = book.status !== 'read';

  // Notes with show-more
  detailNotes.textContent = book.notes || '';
  detailNotes.hidden = !book.notes;
  detailNotes.classList.remove('clamped');
  detailNotesToggle.hidden = true;
  detailNotesToggle.textContent = 'Show more';

  if (book.notes) {
    // Apply clamp first, then check if it actually overflows
    detailNotes.classList.add('clamped');
    // Use a length heuristic (180 chars ≈ 3 lines) since layout may not be computed yet
    if (book.notes.length > 180) {
      detailNotesToggle.hidden = false;
    } else {
      detailNotes.classList.remove('clamped');
    }
  }

  detailEditBtn.onclick = () => {
    detailDialog.close();
    openEditForm(book);
  };

  detailDialog.showModal();

  // After showModal, check actual overflow to correct the heuristic
  if (book.notes) {
    if (detailNotes.scrollHeight > detailNotes.clientHeight) {
      detailNotesToggle.hidden = false;
    } else {
      detailNotes.classList.remove('clamped');
      detailNotesToggle.hidden = true;
    }
  }
}

// ── Confirm mark-as-read dialog ───────────────────────────────────────────────

function openConfirmMarkRead(book) {
  confirmBookTitle.textContent = book.title;
  confirmRatingSelect.value = '';
  confirmNotesInput.value = '';
  confirmDialog.showModal();

  confirmYesBtn.onclick = async () => {
    confirmDialog.close();
    const patch = { status: 'read', date_read: todayStr(), date_read_precision: 'day' };
    if (confirmRatingSelect.value) patch.rating = parseInt(confirmRatingSelect.value, 10);
    if (confirmNotesInput.value.trim()) patch.notes = confirmNotesInput.value.trim();
    try {
      await updateBook(book._id, patch);
      await loadBooks('wishlist');
    } catch {
      // silent — list unchanged if error
    }
  };

  confirmNoBtn.onclick = () => {
    confirmDialog.close();
  };
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function setActiveTabBtn(tab) {
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initLibrary() {
  listEl = document.getElementById('book-list');
  paginationEl = document.getElementById('book-pagination');
  pagePrevBtn = document.getElementById('page-prev-btn');
  pageNextBtn = document.getElementById('page-next-btn');
  pageIndicator = document.getElementById('page-indicator');
  pageSizeSelect = document.getElementById('page-size-select');
  pageSizeSelect.value = String(getPageSize());
  tabBtns = document.querySelectorAll('.library-tab-btn');
  addBookBtn = document.getElementById('add-book-btn');
  formDialog = document.getElementById('book-form-dialog');
  bookForm = document.getElementById('book-form');
  bookIdInput = document.getElementById('book-id');
  bookStatusToggle = document.getElementById('book-status-toggle');
  bookStatusBtns = document.querySelectorAll('.book-status-btn');
  bookTitleInput = document.getElementById('book-title');
  bookAuthorInput = document.getElementById('book-author');
  bookImageUrlInput = document.getElementById('book-image-url');
  bookSourceInput = document.getElementById('book-source');
  bookReadFields = document.getElementById('book-read-fields');
  bookDatePrecisionSelect = document.getElementById('book-date-precision');
  bookDateReadLabel = document.getElementById('book-date-read-label');
  bookDateReadInput = document.getElementById('book-date-read');
  bookDateReadMonthLabel = document.getElementById('book-date-read-month-label');
  bookDateReadMonthInput = document.getElementById('book-date-read-month');
  bookDateReadYearLabel = document.getElementById('book-date-read-year-label');
  bookDateReadYearInput = document.getElementById('book-date-read-year');
  bookRatingSelect = document.getElementById('book-rating');
  bookNotesInput = document.getElementById('book-notes');
  bookFormError = document.getElementById('book-form-error');
  bookFormTitle = document.getElementById('book-form-title');
  detailDialog = document.getElementById('book-detail-dialog');
  detailCover = document.getElementById('detail-cover');
  detailTitle = document.getElementById('detail-title');
  detailAuthor = document.getElementById('detail-author');
  detailSource = document.getElementById('detail-source');
  detailRating = document.getElementById('detail-rating');
  detailNotes = document.getElementById('detail-notes');
  detailNotesToggle = document.getElementById('detail-notes-toggle');
  detailEditBtn = document.getElementById('detail-edit-btn');
  confirmDialog = document.getElementById('mark-read-confirm-dialog');
  confirmYesBtn = document.getElementById('confirm-mark-read-yes');
  confirmNoBtn = document.getElementById('confirm-mark-read-no');
  confirmBookTitle = document.getElementById('mark-read-book-title');
  confirmRatingSelect = document.getElementById('confirm-rating');
  confirmNotesInput = document.getElementById('confirm-notes');

  // Tab segmented control
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      setActiveTabBtn(tab);
      loadBooks(tab);
    });
  });

  // Add book button
  addBookBtn.addEventListener('click', openAddForm);

  // Status toggle (add form only)
  bookStatusBtns.forEach(btn => {
    btn.addEventListener('click', () => setAddFormStatus(btn.dataset.status));
  });

  // Form submit
  bookForm.addEventListener('submit', handleFormSubmit);

  // Form cancel
  document.getElementById('book-form-cancel').addEventListener('click', () => {
    formDialog.close();
  });

  // Date precision toggle
  bookDatePrecisionSelect.addEventListener('change', () => {
    setPrecisionUI(bookDatePrecisionSelect.value);
  });

  // Detail close
  document.getElementById('detail-close-btn').addEventListener('click', () => {
    detailDialog.close();
  });

  // Notes show-more toggle
  detailNotesToggle.addEventListener('click', () => {
    const isExpanded = !detailNotes.classList.contains('clamped');
    if (isExpanded) {
      detailNotes.classList.add('clamped');
      detailNotesToggle.textContent = 'Show more';
    } else {
      detailNotes.classList.remove('clamped');
      detailNotesToggle.textContent = 'Show less';
    }
  });

  // Pagination
  pagePrevBtn.addEventListener('click', () => {
    setPage(getPage() - 1);
    renderList(getBooks(), getActiveTab());
  });
  pageNextBtn.addEventListener('click', () => {
    setPage(getPage() + 1);
    renderList(getBooks(), getActiveTab());
  });
  pageSizeSelect.addEventListener('change', () => {
    setPageSize(parseInt(pageSizeSelect.value, 10));
    setPage(1);
    renderList(getBooks(), getActiveTab());
  });

  // Close dialogs on backdrop click
  formDialog.addEventListener('click', e => { if (e.target === formDialog) formDialog.close(); });
  detailDialog.addEventListener('click', e => { if (e.target === detailDialog) detailDialog.close(); });
  confirmDialog.addEventListener('click', e => { if (e.target === confirmDialog) confirmDialog.close(); });
}

export function showLibrary() {
  setActiveTabBtn(getActiveTab());
  loadBooks(getActiveTab());
}
