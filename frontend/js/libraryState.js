let _activeTab = 'wishlist';
let _books = [];
let _renderedCount = 20;

export function getActiveTab() { return _activeTab; }
export function setActiveTab(tab) { _activeTab = tab; }
export function getBooks() { return _books; }
export function setBooks(books) { _books = books; }
export function getRenderedCount() { return _renderedCount; }
export function setRenderedCount(n) { _renderedCount = n; }
