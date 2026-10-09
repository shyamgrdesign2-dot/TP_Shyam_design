import { useEffect } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ASSETS } from "../../../assets";
import { setActiveChannel } from "../../../redux/chatSlice";
import { getTokenData } from "../../../utils/utils";
import { setLastReadTimetoken, approximateNowTimetoken } from "../../../utils/chatReadState";
import ChatThreadView from "../../../components/chat/ChatThreadView";
import { useCmsCareteam } from "../../../components/chat/useCmsCareteam";
import "../../../components/chat/chat.scss";
import "./Chat.scss";

const { arrowLeft: BackIcon } = ASSETS.mobile;

export default function ChatThread() {
  const isCmsCareteamEnabled = useCmsCareteam();
  const { chatId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const channels = useSelector((state) => state.chat.channels);
  const patientNamesByPatientId = useSelector((state) => state.chat.patientNamesByPatientId);

  const channel = location.state?.channel || channels.find((c) => c.chat_id === chatId);
  const patientName = channel
    ? patientNamesByPatientId[channel.patient_unique_id] || channel.patient_unique_id || "Chat"
    : "Chat";

  useEffect(() => {
    if (!channel) return undefined;
    const markRead = () => {
      const tokenData = getTokenData();
      if (tokenData?.user_id) {
        setLastReadTimetoken(tokenData.user_id, channel.channel_name, approximateNowTimetoken());
      }
    };
    dispatch(setActiveChannel(channel.channel_name));
    markRead();
    return () => {
      dispatch(setActiveChannel(null));
      markRead();
    };
  }, [channel, dispatch]);

  if (!isCmsCareteamEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mobile-chat-page">
      <div className="mobile-chat-header">
        <button className="mobile-chat-back" onClick={() => navigate("/chat")}>
          <img src={BackIcon} alt="Back" />
        </button>
        <span className="mobile-chat-title">{patientName}</span>
      </div>
      <div className="mobile-chat-body mobile-chat-thread-body">
        <ChatThreadView channel={channel} />
      </div>
    </div>
  );
}
