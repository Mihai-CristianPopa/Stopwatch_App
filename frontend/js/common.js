export function setActiveTabBtn(tabBtns, tab) {
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
}