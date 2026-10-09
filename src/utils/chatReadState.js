const STORAGE_KEY_PREFIX = "pm_chat_last_read_";

function readMap(umId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + umId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(umId, map) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + umId, JSON.stringify(map));
  } catch {
  }
}

export function getLastReadTimetokens(umId, channels) {
  const map = readMap(umId);
  const result = {};
  channels.forEach((channel) => {
    if (map[channel] != null) result[channel] = map[channel];
  });
  return result;
}

export function setLastReadTimetoken(umId, channel, timetoken) {
  const map = readMap(umId);
  map[channel] = timetoken;
  writeMap(umId, map);
}

export function approximateNowTimetoken() {
  return String(Date.now() * 10000);
}
