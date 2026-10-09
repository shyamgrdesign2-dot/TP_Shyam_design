import { fetchHistory } from "../../utils/pubnubClient";
import { setChannelPreviews } from "../../redux/chatSlice";

const inFlight = new Set();

export function loadChannelPreviews(dispatch, channelNames, cachedPreviews) {
  const names = [...new Set(channelNames.filter(Boolean))].filter(
    (name) => !(name in (cachedPreviews || {})) && !inFlight.has(name)
  );
  if (!names.length) return Promise.resolve();

  names.forEach((name) => inFlight.add(name));
  return fetchHistory(names, 1)
    .then((result) => {
      const updates = names.map((name) => {
        const entries = result[name];
        return { channel: name, message: entries?.length ? entries[entries.length - 1].message : null };
      });
      dispatch(setChannelPreviews(updates));
    })
    .catch(() => {})
    .finally(() => names.forEach((name) => inFlight.delete(name)));
}
