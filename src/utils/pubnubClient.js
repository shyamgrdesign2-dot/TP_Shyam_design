import PubNub from 'pubnub';
let client = null;
let clientUuid = null;

export function initPubnub({ umId, token, subscribeKey, publishKey }) {
  const uuid = `um-${umId}`;
  if (client && clientUuid === uuid) {
    client.setToken(token);
    return client;
  }
  disconnectPubnub();
  client = new PubNub({
    subscribeKey,
    publishKey,
    uuid,
  });
  client.setToken(token);
  clientUuid = uuid;
  return client;
}

export function getPubnub() {
  return client;
}

export function subscribeToChannels(channels) {
  if (!client || !channels?.length) return;
  const alreadySubscribed = new Set(client.getSubscribedChannels());
  const toSubscribe = channels.filter((c) => !alreadySubscribed.has(c));
  if (!toSubscribe.length) return;
  client.subscribe({ channels: toSubscribe });
}

export function addMessageListener(listener) {
  if (!client) return () => {};
  client.addListener(listener);
  return () => client.removeListener(listener);
}

export function publishMessage(channel, message) {
  if (!client) return Promise.reject(new Error('PubNub client not initialized'));
  return client.publish({ channel, message });
}

export async function fetchHistory(channels, count = 25) {
  if (!client || !channels?.length) return {};
  const result = await client.fetchMessages({ channels, count });
  return result.channels || {};
}

export async function fetchUnreadCounts(channelTimetokens) {
  if (!client) return {};
  const channels = Object.keys(channelTimetokens);
  if (!channels.length) return {};
  const result = await client.messageCounts({
    channels,
    channelTimetokens: channels.map((c) => channelTimetokens[c]),
  });
  return result.channels || {};
}

export function disconnectPubnub() {
  if (!client) return;
  client.unsubscribeAll();
  client.stop?.();
  client = null;
  clientUuid = null;
}

export function buildTextMessage({ umId, umName, content }) {
  return {
    messageId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    messageType: 'text',
    text: content,
    blobReference: null,
    mimeType: null,
    senderId: umId,
    senderName: umName ?? null,
    timestamp: Date.now(),
    autoUpsertedViaGenx: false,
  };
}
