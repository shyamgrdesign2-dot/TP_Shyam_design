import { useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { getTokenData } from "../../utils/utils";
import { publishMessage, buildTextMessage } from "../../utils/pubnubClient";
import { appendLiveMessage, setMessageDeliveryStatus } from "../../redux/chatSlice";

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const MAX_ROWS = 4;
const LINE_HEIGHT = 20;
const PADDING_Y = 16;

export default function ChatComposer({ channelName, isActive = true }) {
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const textareaRef = useRef(null);

  const autoResize = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_ROWS + PADDING_Y;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, []);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !channelName || !isActive || sendingRef.current) return;
    const tokenData = getTokenData();
    if (!tokenData?.user_id) return;

    sendingRef.current = true;
    setSending(true);
    const message = buildTextMessage({
      umId: tokenData.user_id,
      umName: tokenData.doctor_unique_id,
      content,
    });
    dispatch(
      appendLiveMessage({
        channel: channelName,
        message: { ...message, deliveryStatus: "pending" },
        myUmId: tokenData.user_id,
      })
    );
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    try {
      await publishMessage(channelName, message);
      dispatch(setMessageDeliveryStatus({ channel: channelName, messageId: message.messageId, status: "sent" }));
    } catch (err) {
      console.error("[chat] publish failed", err);
      dispatch(setMessageDeliveryStatus({ channel: channelName, messageId: message.messageId, status: "failed" }));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    autoResize(e.target);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isActive) {
    return (
      <div className="chat-composer-wrap">
        <div className="chat-composer-archived">This chat is archived — messaging is disabled.</div>
      </div>
    );
  }

  return (
    <div className="chat-composer-wrap">
      <div className="chat-composer">
        <textarea
          ref={textareaRef}
          className="chat-composer-input"
          rows={1}
          value={text}
          placeholder="Type a message"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={!channelName}
        />
        <button
          className="chat-composer-send"
          onClick={handleSend}
          disabled={!channelName || !text.trim() || sending}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
