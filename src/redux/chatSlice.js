import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiChat from "../api/services/ApiChat";

export const fetchChatToken = createAsyncThunk("chat/fetchToken", async () => {
  const res = await ApiChat.getToken();
  return res;
});

export const fetchUserNames = createAsyncThunk("chat/fetchUserNames", async (umIds) => {
  const res = await ApiChat.getUserNames(umIds);
  return res.users;
});

const initialState = {
  status: "idle",
  token: null,
  subscribeKey: null,
  publishKey: null,
  channels: [],
  activeChannel: null,
  messagesByChannel: {},
  unreadByChannel: {},
  lastUnseenMessageByChannel: {},
  userNamesByUmId: {},
  patientNamesByPatientId: {},
  patientDemoByPatientId: {},
  previewByChannel: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChannel: (state, action) => {
      state.activeChannel = action.payload;
      if (action.payload) {
        state.unreadByChannel[action.payload] = 0;
        state.lastUnseenMessageByChannel[action.payload] = null;
      }
    },
    hydrateUnreadCounts: (state, action) => {
      Object.entries(action.payload).forEach(([channel, { count, lastUnseenMessage }]) => {
        if (state.unreadByChannel[channel] === undefined && count > 0) {
          state.unreadByChannel[channel] = count;
          if (lastUnseenMessage) state.lastUnseenMessageByChannel[channel] = lastUnseenMessage;
        }
      });
    },
    setChannelHistory: (state, action) => {
      const { channel, messages, myUmId } = action.payload;
      const incoming = messages.map((m) => ({
        ...m,
        mine: m.senderId === myUmId,
        deliveryStatus: m.senderId === myUmId ? "sent" : m.deliveryStatus,
      }));
      const incomingIds = new Set(incoming.map((m) => m.messageId));
      const extra = (state.messagesByChannel[channel] || []).filter((m) => !incomingIds.has(m.messageId));
      state.messagesByChannel[channel] = [...incoming, ...extra].sort((a, b) => a.timestamp - b.timestamp);
    },
    appendLiveMessage: (state, action) => {
      const { channel, message, myUmId } = action.payload;
      if (!state.messagesByChannel[channel]) state.messagesByChannel[channel] = [];
      const mine = message.senderId === myUmId;
      const existing = state.messagesByChannel[channel].find((m) => m.messageId === message.messageId);
      if (existing) {
        if (mine && !message.deliveryStatus) existing.deliveryStatus = "sent";
        return;
      }
      state.messagesByChannel[channel].push({
        ...message,
        mine,
        deliveryStatus: mine ? (message.deliveryStatus || "sent") : message.deliveryStatus,
      });
      if (!mine && channel !== state.activeChannel) {
        state.unreadByChannel[channel] = (state.unreadByChannel[channel] || 0) + 1;
        // Alert priority: once an unread alert is recorded, a later non-alert unread
        // message must not downgrade the badge back to plain — only a newer alert
        // can replace it. Same rule applied during hydration; see ChatBootstrap.jsx.
        const currentUnseen = state.lastUnseenMessageByChannel[channel];
        const currentIsAlert = currentUnseen?.messageType === "alert";
        const incomingIsAlert = message.messageType === "alert";
        if (!currentIsAlert || incomingIsAlert) {
          state.lastUnseenMessageByChannel[channel] = message;
        }
      }
    },
    setMessageDeliveryStatus: (state, action) => {
      const { channel, messageId, status } = action.payload;
      const message = (state.messagesByChannel[channel] || []).find((m) => m.messageId === messageId);
      if (message) message.deliveryStatus = status;
    },
    setPatientNames: (state, action) => {
      action.payload.forEach(({ patientUniqueId, name }) => {
        if (name) state.patientNamesByPatientId[patientUniqueId] = name;
      });
    },
    setChannelPreviews: (state, action) => {
      action.payload.forEach(({ channel, message }) => {
        state.previewByChannel[channel] = message;
      });
    },
    setPatientDemo: (state, action) => {
      action.payload.forEach(({ patientUniqueId, demo }) => {
        state.patientDemoByPatientId[patientUniqueId] = demo;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatToken.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchChatToken.fulfilled, (state, action) => {
        state.status = "ready";
        state.token = action.payload.token;
        state.subscribeKey = action.payload.subscribe_key;
        state.publishKey = action.payload.publish_key;
        state.channels = action.payload.channels || [];
        const currentChannelNames = new Set(state.channels.map((c) => c.channel_name));
        Object.keys(state.unreadByChannel).forEach((ch) => {
          if (!currentChannelNames.has(ch)) delete state.unreadByChannel[ch];
        });
        Object.keys(state.lastUnseenMessageByChannel).forEach((ch) => {
          if (!currentChannelNames.has(ch)) delete state.lastUnseenMessageByChannel[ch];
        });
      })
      .addCase(fetchChatToken.rejected, (state) => {
        state.status = "error";
      })
      .addCase(fetchUserNames.fulfilled, (state, action) => {
        action.payload.forEach((u) => {
          state.userNamesByUmId[u.um_id] = { um_name: u.um_name, participant_type: u.participant_type };
        });
      });
  },
});

export const {
  setActiveChannel,
  hydrateUnreadCounts,
  setChannelHistory,
  appendLiveMessage,
  setMessageDeliveryStatus,
  setPatientNames,
  setChannelPreviews,
  setPatientDemo,
} = chatSlice.actions;
export default chatSlice.reducer;
