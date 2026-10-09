import { useSelector } from "react-redux";
import AttachmentViewer from "./AttachmentViewer";

function DeliveryTicks({ status }) {
  const delivered = status === "sent";
  return (
    <span className={"chat-bubble-ticks" + (delivered ? " chat-bubble-ticks-double" : "")} aria-hidden="true">
      <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
        <path d="M1 5.5L5 9.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {delivered && (
        <svg width="14" height="10" viewBox="0 0 16 11" fill="none" className="chat-bubble-ticks-second">
          <path d="M1 5.5L5 9.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export default function MessageBubble({ message, chatId }) {
  const isInfo = message.messageType === "info";
  const isAlert = message.messageType === "alert";
  const resolvedUmName = useSelector((state) => state.chat.userNamesByUmId[message.senderId]?.um_name);
  const senderName = message.senderId != null ? resolvedUmName : message.senderName;

  const time = message.timestamp ? new Date(message.timestamp) : null;
  const timeLabel = time && !isNaN(time.getTime()) ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  if (isInfo) {
    const infoLines = (message.text || "").split("\n").filter((l) => l.trim());
    const hasKeyVal = infoLines.some((l) => l.indexOf(":") > 0);

    return (
      <div className="chat-bubble chat-bubble-info">
        <div className="chat-bubble-info-label">INFO</div>
        {hasKeyVal ? (
          <div className="chat-bubble-info-fields">
            {infoLines.map((line, i) => {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                return (
                  <div key={i} className="chat-bubble-info-row">
                    <span className="chat-bubble-info-key">{line.slice(0, colonIdx)}:</span>{" "}
                    <span className="chat-bubble-info-val">{line.slice(colonIdx + 1).trim()}</span>
                  </div>
                );
              }
              return <div key={i} className="chat-bubble-text">{line}</div>;
            })}
          </div>
        ) : (
          <div className="chat-bubble-text">{message.text}</div>
        )}
        {timeLabel && <div className="chat-bubble-time">{timeLabel}</div>}
      </div>
    );
  }

  return (
    <div className={"chat-bubble" + (message.mine ? " chat-bubble-mine" : " chat-bubble-other") + (isAlert ? " chat-bubble-alert" : "")}>
      {!message.mine && <div className="chat-bubble-sender">{senderName || "..."}</div>}
      {message.blobReference && (
        <AttachmentViewer blobReference={message.blobReference} chatId={chatId} mimeType={message.mimeType} />
      )}
      {(!message.blobReference || message.text) && (
        <div className="chat-bubble-text">
          {isAlert && <span className="chat-bubble-alert-icon" aria-hidden="true">⚠</span>}
          {message.text}
        </div>
      )}
      <div className="chat-bubble-footer">
        {timeLabel && <span className="chat-bubble-time">{timeLabel}</span>}
        {message.mine && <DeliveryTicks status={message.deliveryStatus} />}
      </div>
    </div>
  );
}
