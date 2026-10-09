import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setChannelHistory } from "../../redux/chatSlice";
import { fetchHistory } from "../../utils/pubnubClient";
import { getTokenData } from "../../utils/utils";
import { loadUserNames } from "./chatUserNames";
import MessageBubble from "./MessageBubble";
import ChatComposer from "./ChatComposer";

export default function ChatThreadView({ channel }) {
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.chat.messagesByChannel[channel?.channel_name] || []);
  const userNamesByUmId = useSelector((state) => state.chat.userNamesByUmId);
  const userNamesRef = useRef(userNamesByUmId);
  userNamesRef.current = userNamesByUmId;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!channel) return;
    const tokenData = getTokenData();
    fetchHistory([channel.channel_name], 25)
      .then((result) => {
        const entries = result[channel.channel_name] || [];
        dispatch(
          setChannelHistory({
            channel: channel.channel_name,
            messages: entries.map((e) => e.message),
            myUmId: tokenData?.user_id,
          })
        );
      })
      .catch((err) => console.warn("[chat] fetchHistory failed", err));
  }, [channel, dispatch]);

  useEffect(() => {
    const senderIds = messages
      .filter((m) => !m.mine && m.messageType !== "info" && m.senderId != null)
      .map((m) => m.senderId);
    loadUserNames(dispatch, senderIds, userNamesRef.current);
  }, [messages, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (!channel) {
    return <div className="chat-thread-empty">Select a chat to view messages.</div>;
  }

  return (
    <div className="chat-thread">
      <div className="chat-thread-messages">
        {messages.length === 0 && <div className="chat-thread-empty">No messages yet.</div>}
        {messages.map((m) => (
          <MessageBubble key={m.messageId} message={m} chatId={channel.chat_id} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatComposer channelName={channel.channel_name} isActive={channel.is_active !== false} />
    </div>
  );
}
