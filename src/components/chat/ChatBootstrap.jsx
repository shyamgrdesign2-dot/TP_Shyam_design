import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTokenData } from "../../utils/utils";
import { fetchChatToken, appendLiveMessage, hydrateUnreadCounts } from "../../redux/chatSlice";
import { initPubnub, subscribeToChannels, addMessageListener, fetchUnreadCounts, fetchHistory } from "../../utils/pubnubClient";
import { getLastReadTimetokens } from "../../utils/chatReadState";
import { loadChannelPreviews } from "./chatPreview";
import { useCmsCareteam } from "./useCmsCareteam";

const TOKEN_REFRESH_INTERVAL_MS = 60_000;
const HYDRATION_HISTORY_COUNT = 25;

export default function ChatBootstrap() {
  const isCmsCareteamEnabled = useCmsCareteam();
  const dispatch = useDispatch();
  const channels = useSelector((state) => state.chat.channels);
  const previewByChannel = useSelector((state) => state.chat.previewByChannel);
  const token = useSelector((state) => state.chat.token);
  const subscribeKey = useSelector((state) => state.chat.subscribeKey);
  const publishKey = useSelector((state) => state.chat.publishKey);
  const subscribedChannelNames = useRef(new Set());
  const hydratedChannelNames = useRef(new Set());
  const clientInstanceRef = useRef(null);
  const listenerCleanupRef = useRef(null);

  useEffect(() => {
    if (!isCmsCareteamEnabled) return;
    const tokenData = getTokenData();
    if (!tokenData?.user_id) return;

    dispatch(fetchChatToken());
    const interval = setInterval(() => dispatch(fetchChatToken()), TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [dispatch, isCmsCareteamEnabled]);

  useEffect(() => {
    if (!isCmsCareteamEnabled) return;
    if (!token || !subscribeKey) return;
    const tokenData = getTokenData();
    if (!tokenData?.user_id) return;

    const client = initPubnub({ umId: tokenData.user_id, token, subscribeKey, publishKey });

    if (client !== clientInstanceRef.current) {
      clientInstanceRef.current = client;
      listenerCleanupRef.current?.();
      listenerCleanupRef.current = addMessageListener({
        message: (evt) => {
          dispatch(appendLiveMessage({ channel: evt.channel, message: evt.message, myUmId: tokenData.user_id }));
        },
      });
      subscribedChannelNames.current = new Set();
    }
  }, [token, subscribeKey, publishKey, dispatch, isCmsCareteamEnabled]);

  useEffect(() => {
    return () => listenerCleanupRef.current?.();
  }, []);

  useEffect(() => {
    if (!isCmsCareteamEnabled) return;
    const newChannels = channels
      .map((c) => c.channel_name)
      .filter((name) => !subscribedChannelNames.current.has(name));
    if (newChannels.length === 0) return;
    subscribeToChannels(newChannels);
    newChannels.forEach((name) => subscribedChannelNames.current.add(name));
  }, [channels, isCmsCareteamEnabled]);

  useEffect(() => {
    if (!isCmsCareteamEnabled) return;
    const tokenData = getTokenData();
    if (!tokenData?.user_id) return;

    const newChannels = channels
      .map((c) => c.channel_name)
      .filter((name) => !hydratedChannelNames.current.has(name));
    if (newChannels.length === 0) return;
    newChannels.forEach((name) => hydratedChannelNames.current.add(name));

    loadChannelPreviews(dispatch, newChannels, previewByChannel);

    const channelTimetokens = getLastReadTimetokens(tokenData.user_id, newChannels);
    if (Object.keys(channelTimetokens).length === 0) return;

    fetchUnreadCounts(channelTimetokens)
      .then(async (counts) => {
        const channelsWithUnread = Object.entries(counts)
          .filter(([, count]) => typeof count === "number" && count > 0)
          .map(([name]) => name);
        if (channelsWithUnread.length === 0) return;

        let historyByChannel = {};
        try {
          historyByChannel = await fetchHistory(channelsWithUnread, HYDRATION_HISTORY_COUNT);
        } catch {
        }

        const payload = {};
        channelsWithUnread.forEach((name) => {
          const count = counts[name];
          const entries = historyByChannel[name] || [];
          const unreadEntries = entries.slice(-Math.min(count, entries.length));
          const alertEntry = [...unreadEntries].reverse().find((e) => e.message?.messageType === "alert");
          const lastUnseenMessage = (alertEntry || unreadEntries[unreadEntries.length - 1])?.message || null;
          payload[name] = { count, lastUnseenMessage };
        });
        dispatch(hydrateUnreadCounts(payload));
      })
      .catch(() => {
      });
  }, [channels, isCmsCareteamEnabled, dispatch, previewByChannel]);

  if (!isCmsCareteamEnabled) return null;

  return null;
}
