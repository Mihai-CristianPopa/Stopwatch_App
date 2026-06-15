let _totalMs = 0;

export function setTodayTotalMs(ms) { _totalMs = ms; }
export function addTodayTotalMs(ms) { _totalMs += ms; }
export function getTodayTotalMs() { return _totalMs; }
