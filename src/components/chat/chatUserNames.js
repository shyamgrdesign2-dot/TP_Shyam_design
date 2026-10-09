import { fetchUserNames } from "../../redux/chatSlice";

const inFlight = new Set();

export function loadUserNames(dispatch, umIds, cachedNames) {
  const ids = [...new Set(umIds.filter((id) => id != null))].filter(
    (id) => !cachedNames?.[id] && !inFlight.has(id)
  );
  if (!ids.length) return Promise.resolve();

  ids.forEach((id) => inFlight.add(id));
  return dispatch(fetchUserNames(ids))
    .unwrap()
    .catch(() => {})
    .finally(() => ids.forEach((id) => inFlight.delete(id)));
}
