import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChatListRow from "./ChatListRow";
import { loadPatientNames } from "./chatPatientName";
import { loadChannelPreviews } from "./chatPreview";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function ChatListView({ activeChannelName, onSelectChannel }) {
  const dispatch = useDispatch();
  const channels = useSelector((state) => state.chat.channels);
  const patientNamesByPatientId = useSelector((state) => state.chat.patientNamesByPatientId);
  const previewByChannel = useSelector((state) => state.chat.previewByChannel);
  const messagesByChannel = useSelector((state) => state.chat.messagesByChannel);
  const [tab, setTab] = useState("admitted");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPatientNames(
      dispatch,
      channels.map((c) => c.patient_unique_id),
      patientNamesByPatientId
    );
    loadChannelPreviews(
      dispatch,
      channels.map((c) => c.channel_name),
      previewByChannel
    );
  }, [channels, dispatch, patientNamesByPatientId, previewByChannel]);

  const { admitted, archived } = useMemo(() => {
    const admittedList = [];
    const archivedList = [];
    channels.forEach((channel) => {
      (channel.is_active === false ? archivedList : admittedList).push(channel);
    });
    const lastMessageOf = (name) => {
      const msgs = messagesByChannel[name];
      return (msgs?.length ? msgs[msgs.length - 1] : null) || previewByChannel[name] || null;
    };
    const sortByLatest = (list) =>
      list.slice().sort((a, b) => {
        const lastA = lastMessageOf(a.channel_name)?.timestamp || 0;
        const lastB = lastMessageOf(b.channel_name)?.timestamp || 0;
        return lastB - lastA;
      });
    return { admitted: sortByLatest(admittedList), archived: sortByLatest(archivedList) };
  }, [channels, messagesByChannel, previewByChannel]);

  const tabChannels = tab === "admitted" ? admitted : archived;

  const filteredChannels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tabChannels;
    return tabChannels.filter((channel) => {
      const name = (patientNamesByPatientId[channel.patient_unique_id] || channel.patient_unique_id || "").toLowerCase();
      return name.includes(query);
    });
  }, [tabChannels, search, patientNamesByPatientId]);

  return (
    <div className="chat-list-container">
      <div className="chat-list-segment">
        <div className="chat-list-segment-track">
          <button
            type="button"
            className={`chat-list-segment-btn${tab === "admitted" ? " chat-list-segment-btn--active" : ""}`}
            onClick={() => setTab("admitted")}
          >
            Admitted
          </button>
          <button
            type="button"
            className={`chat-list-segment-btn${tab === "archived" ? " chat-list-segment-btn--active" : ""}`}
            onClick={() => setTab("archived")}
          >
            Archived
          </button>
        </div>
      </div>
      <div className="chat-list-search">
        <div className="chat-list-search-wrap">
          <SearchIcon />
          <input
            type="text"
            className="chat-list-search-input"
            placeholder="Search by patient name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {channels.length === 0 ? (
        <div className="chat-list-empty">No chats yet.</div>
      ) : filteredChannels.length === 0 ? (
        <div className="chat-list-empty">No matching chats.</div>
      ) : (
        <div className="chat-list">
          {filteredChannels.map((channel) => (
            <ChatListRow
              key={channel.channel_name}
              channel={channel}
              isActive={channel.channel_name === activeChannelName}
              onClick={() => onSelectChannel(channel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
