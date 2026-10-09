import { useSelector } from "react-redux";

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getInitials(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default function ChatListRow({ channel, isActive, onClick }) {
  const cachedName = useSelector((state) => state.chat.patientNamesByPatientId[channel.patient_unique_id]);
  const unread = useSelector((state) => state.chat.unreadByChannel[channel.channel_name] || 0);
  const lastUnseenMessage = useSelector((state) => state.chat.lastUnseenMessageByChannel[channel.channel_name]);
  const previewMessage = useSelector((state) => state.chat.previewByChannel[channel.channel_name]);

  const chatDemo = useSelector((state) => state.chat.patientDemoByPatientId[channel.patient_unique_id]);

  const displayName = cachedName || channel.patient_unique_id || "?";
  const isUnseenAlert = unread > 0 && (lastUnseenMessage || previewMessage)?.messageType === "alert";

  let metaLine = null;
  const src = chatDemo;
  if (src) {
    const left = [];
    if (src.gender) left.push(src.gender.charAt(0).toUpperCase());
    if (src.age) left.push(src.age);
    let wardPart = "";
    if (src.ward) {
      wardPart = src.ward;
      if (src.bedNumber) wardPart += ` (${src.bedNumber})`;
    }
    if (left.length > 0 || wardPart) {
      metaLine = left.join(", ");
      if (wardPart) metaLine += (metaLine ? " | " : "") + wardPart;
    }
  }

  return (
    <div className={`chat-list-row${isActive ? " chat-list-row-active" : ""}`} onClick={onClick}>
      <div className="chat-list-row-avatar">{getInitials(displayName)}</div>
      <div className="chat-list-row-body">
        <div className="chat-list-row-name">{displayName}</div>
        {metaLine && <div className="chat-list-row-meta">{metaLine}</div>}
      </div>
      <div className="chat-list-row-right">
        {unread > 0 &&
          (isUnseenAlert ? (
            <div className="chat-list-row-unread chat-list-row-unread-alert" aria-label="Unread alert">
              ⚠
            </div>
          ) : (
            <div className="chat-list-row-unread">{unread > 99 ? "99+" : unread}</div>
          ))}
        <span className="chat-list-row-chevron">
          <ChevronIcon />
        </span>
      </div>
    </div>
  );
}
