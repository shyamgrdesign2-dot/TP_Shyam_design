import { Navigate, useNavigate } from "react-router-dom";
import BottomNavigation from "../AppointmentDashboard/components/BottomNavigation";
import ChatListView from "../../../components/chat/ChatListView";
import { useCmsCareteam } from "../../../components/chat/useCmsCareteam";
import "../../../components/chat/chat.scss";
import "./Chat.scss";

export default function ChatList() {
  const isCmsCareteamEnabled = useCmsCareteam();
  const navigate = useNavigate();

  if (!isCmsCareteamEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mobile-chat-page">
      <div className="mobile-chat-header">
        <span className="mobile-chat-title">Chat</span>
      </div>
      <div className="mobile-chat-body">
        <ChatListView
          activeChannelName={null}
          onSelectChannel={(channel) => navigate(`/chat/${channel.chat_id}`, { state: { channel } })}
        />
      </div>
      <BottomNavigation activeTab="chat" />
    </div>
  );
}
