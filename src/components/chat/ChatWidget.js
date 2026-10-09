import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveChannel } from "../../redux/chatSlice";
import { getTokenData } from "../../utils/utils";
import { setLastReadTimetoken, approximateNowTimetoken } from "../../utils/chatReadState";
import ChatListView from "./ChatListView";
import ChatThreadView from "./ChatThreadView";
import { useCmsCareteam } from "./useCmsCareteam";
import "./chat.scss";
import "./ChatWidget.scss";

const CHAT_FAB_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bold/emails-messages/messages.svg";
const CHAT_HEADER_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk/emails-messages/messages-2.svg";
const CHAT_CLOSE_ICON = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bold/essential/close-square.svg";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ChatWidget() {
  const isCmsCareteamEnabled = useCmsCareteam();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [activeChannel, setLocalActiveChannel] = useState(null);
  const unreadByChannel = useSelector((state) => state.chat.unreadByChannel);
  const lastUnseenMessageByChannel = useSelector((state) => state.chat.lastUnseenMessageByChannel);
  const previewByChannel = useSelector((state) => state.chat.previewByChannel);
  const patientNamesByPatientId = useSelector((state) => state.chat.patientNamesByPatientId);

  const chatDemo = useSelector((state) => {
    if (!activeChannel?.patient_unique_id) return null;
    return state.chat.patientDemoByPatientId[activeChannel.patient_unique_id] || null;
  });

  const totalUnread = Object.values(unreadByChannel).reduce((sum, c) => sum + c, 0);
  const hasUnseenAlert = Object.entries(unreadByChannel).some(([channelName, count]) => {
    if (count <= 0) return false;
    const lastMessage = lastUnseenMessageByChannel[channelName] || previewByChannel[channelName];
    return lastMessage?.messageType === "alert";
  });

  const activePatientName = activeChannel
    ? patientNamesByPatientId[activeChannel.patient_unique_id] || activeChannel.patient_unique_id || "Chat"
    : null;

  let headerDemoText = null;
  let headerLocationText = null;
  const headerSrc = chatDemo;
  if (activeChannel && headerSrc) {
    const left = [];
    if (headerSrc.gender) left.push(headerSrc.gender.charAt(0).toUpperCase());
    if (headerSrc.age) left.push(String(headerSrc.age));
    if (left.length > 0) headerDemoText = left.join(", ");
    let wardPart = "";
    if (headerSrc.ward) {
      wardPart = headerSrc.ward;
      if (headerSrc.bedNumber) wardPart += ` (${headerSrc.bedNumber})`;
    }
    if (wardPart) headerLocationText = wardPart;
  }

  const markChannelRead = (channelName) => {
    const tokenData = getTokenData();
    if (tokenData?.user_id && channelName) {
      setLastReadTimetoken(tokenData.user_id, channelName, approximateNowTimetoken());
    }
  };

  const handleSelectChannel = (channel) => {
    setLocalActiveChannel(channel);
    dispatch(setActiveChannel(channel.channel_name));
    markChannelRead(channel.channel_name);
  };

  const handleBack = () => {
    if (activeChannel) markChannelRead(activeChannel.channel_name);
    setLocalActiveChannel(null);
    dispatch(setActiveChannel(null));
  };

  const handleToggle = () => {
    setOpen((prev) => {
      return !prev;
    });
    if (open) {
      if (activeChannel) markChannelRead(activeChannel.channel_name);
      setLocalActiveChannel(null);
      dispatch(setActiveChannel(null));
    }
  };

  if (!isCmsCareteamEnabled) return null;

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget-panel">
          <div className="chat-widget-panel-header">
            {activeChannel ? (
              <button className="chat-widget-back" onClick={handleBack} aria-label="Back to list">
                <BackIcon />
              </button>
            ) : (
              <span className="chat-widget-header-icon-wrap">
                <img src={CHAT_HEADER_ICON} alt="" className="chat-widget-header-icon" />
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-widget-panel-title">
                {activeChannel ? (
                  <span className="chat-widget-patient-name">{activePatientName}</span>
                ) : (
                  <span>Care Team Chat</span>
                )}
              </div>
              {activeChannel && (headerDemoText || headerLocationText) && (
                <div className="chat-widget-panel-subtitle">
                  {headerDemoText && <span className="chat-widget-subtitle-demo">{headerDemoText}</span>}
                  {headerDemoText && headerLocationText && <span className="chat-widget-subtitle-dot" />}
                  {headerLocationText && <span className="chat-widget-subtitle-location">{headerLocationText}</span>}
                </div>
              )}
            </div>
            <button className="chat-widget-close" onClick={handleToggle} aria-label="Close chat">
              <img src={CHAT_CLOSE_ICON} alt="" className="chat-widget-close-icon" />
            </button>
          </div>
          <div className="chat-widget-panel-body">
            {activeChannel ? (
              <ChatThreadView channel={activeChannel} />
            ) : (
              <ChatListView activeChannelName={null} onSelectChannel={handleSelectChannel} />
            )}
          </div>
        </div>
      )}
      {!open && (
        <button className="chat-widget-fab" onClick={handleToggle}>
          <img src={CHAT_FAB_ICON} alt="Chat" className="chat-widget-fab-icon" />
          {hasUnseenAlert ? (
            <span className="chat-widget-fab-badge chat-widget-fab-badge--alert" aria-label="Unread alert">!</span>
          ) : totalUnread > 0 ? (
            <span className="chat-widget-fab-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
          ) : null}
        </button>
      )}
    </div>
  );
}
