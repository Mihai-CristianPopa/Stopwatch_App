let _activeTab = 'wishlist';
let _books = [];
let _currentPage = 1;
let _pageSize = 5;

export function getActiveTab() { return _activeTab; }
export function setActiveTab(tab) { _activeTab = tab; }
export function getBooks() { return _books; }
export function setBooks(books) { _books = books; }
export function getPage() { return _currentPage; }
export function setPage(n) { _currentPage = n; }
export function getPageSize() { return _pageSize; }
export function setPageSize(n) { _pageSize = n; }
