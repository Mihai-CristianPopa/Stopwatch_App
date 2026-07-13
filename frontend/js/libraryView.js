import { getBackendOrigin } from './checkBackend.js';
import { getActiveTab, setActiveTab, getBooks, setBooks } from './libraryState.js';

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

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

// ── DOM refs (resolved once on first init) ────────────────────────────────────

let listEl;
let tabBtns;
let addBookBtn;
let formDialog;
let bookForm;
let bookIdInput;
let bookTitleInput;
let bookAuthorInput;
let bookImageUrlInput;
let bookSourceInput;
let bookReadFields;
let bookDateReadInput;
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
let detailEditBtn;
let confirmDialog;
let confirmYesBtn;
let confirmNoBtn;

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

  if (books.length === 0) {
    const li = document.createElement('li');
    li.className = 'loading';
    li.textContent = tab === 'wishlist' ? 'No books in your wishlist yet.' : 'No books in your read list yet.';
    listEl.appendChild(li);
    return;
  }

  books.forEach(book => {
    const li = document.createElement('li');
    li.className = 'book-row';

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
      dateReadEl.textContent = `Read: ${formatDate(book.date_read)}`;

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
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadBooks(tab) {
  setActiveTab(tab);
  listEl.innerHTML = '<li class="loading">Loading…</li>';

  try {
    const books = await fetchBooks(tab);
    setBooks(books);
    renderList(books, tab);
  } catch {
    listEl.innerHTML = '<li class="error">Could not load books.</li>';
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

function openAddForm() {
  bookFormTitle.textContent = 'Add book';
  bookIdInput.value = '';
  bookForm.reset();
  bookReadFields.hidden = true;
  clearFormError();
  formDialog.showModal();
}

function openEditForm(book) {
  bookFormTitle.textContent = 'Edit book';
  bookIdInput.value = book._id;
  bookTitleInput.value = book.title;
  bookAuthorInput.value = book.author;
  bookImageUrlInput.value = book.image_url || '';
  bookSourceInput.value = book.source || '';
  bookNotesInput.value = book.notes || '';

  if (book.status === 'read') {
    bookReadFields.hidden = false;
    bookDateReadInput.value = book.date_read || '';
    bookRatingSelect.value = book.rating != null ? String(book.rating) : '';
  } else {
    bookReadFields.hidden = true;
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

  if (isEdit) {
    const book = getBooks().find(b => b._id === id);
    if (book && book.status === 'read') {
      payload.date_read = bookDateReadInput.value || null;
      payload.rating = bookRatingSelect.value ? parseInt(bookRatingSelect.value, 10) : null;
    }
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
  // cover
  detailCover.innerHTML = '';
  detailCover.appendChild(buildCoverEl(book.image_url, true));

  detailTitle.textContent = book.title;
  detailAuthor.textContent = book.author;
  detailSource.textContent = book.source ? `Source: ${book.source}` : '';
  detailSource.hidden = !book.source;
  detailRating.innerHTML = book.status === 'read' ? renderStars(book.rating) : '';
  detailRating.hidden = book.status !== 'read';
  detailNotes.textContent = book.notes || '';
  detailNotes.hidden = !book.notes;

  detailEditBtn.onclick = () => {
    detailDialog.close();
    openEditForm(book);
  };

  detailDialog.showModal();
}

// ── Confirm mark-as-read dialog ───────────────────────────────────────────────

function openConfirmMarkRead(book) {
  confirmDialog.showModal();

  confirmYesBtn.onclick = async () => {
    confirmDialog.close();
    try {
      await updateBook(book._id, { status: 'read', date_read: todayStr() });
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
  tabBtns = document.querySelectorAll('.library-tab-btn');
  addBookBtn = document.getElementById('add-book-btn');
  formDialog = document.getElementById('book-form-dialog');
  bookForm = document.getElementById('book-form');
  bookIdInput = document.getElementById('book-id');
  bookTitleInput = document.getElementById('book-title');
  bookAuthorInput = document.getElementById('book-author');
  bookImageUrlInput = document.getElementById('book-image-url');
  bookSourceInput = document.getElementById('book-source');
  bookReadFields = document.getElementById('book-read-fields');
  bookDateReadInput = document.getElementById('book-date-read');
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
  detailEditBtn = document.getElementById('detail-edit-btn');
  confirmDialog = document.getElementById('mark-read-confirm-dialog');
  confirmYesBtn = document.getElementById('confirm-mark-read-yes');
  confirmNoBtn = document.getElementById('confirm-mark-read-no');

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

  // Form submit
  bookForm.addEventListener('submit', handleFormSubmit);

  // Form cancel
  document.getElementById('book-form-cancel').addEventListener('click', () => {
    formDialog.close();
  });

  // Detail close
  document.getElementById('detail-close-btn').addEventListener('click', () => {
    detailDialog.close();
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
