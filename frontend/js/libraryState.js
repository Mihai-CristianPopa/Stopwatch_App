let _activeTab = 'wishlist';
let _books = [];

export function getActiveTab() { return _activeTab; }
export function setActiveTab(tab) { _activeTab = tab; }
export function getBooks() { return _books; }
export function setBooks(books) { _books = books; }
