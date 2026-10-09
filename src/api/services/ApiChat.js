import api from "./axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.notification_engine_api_url };

const ApiChat = {};

ApiChat.getToken = function () {
  return api.get(`/api/v1/chat/token`, baseUrl);
};

ApiChat.getUserNames = function (umIds) {
  return api.get(`/api/v1/chat/user-names?um_ids=${umIds.join(",")}`, baseUrl);
};

ApiChat.getAttachmentUrl = function (blobReference, chatId) {
  const params = new URLSearchParams({
    blob_reference: blobReference,
    chat_id: String(chatId),
  });
  return api.get(`/api/v1/chat/attachment-url?${params.toString()}`, baseUrl);
};

ApiChat.getPatientNames = function (patientUniqueIds) {
  return api.get(`/api/v1/chat/patient-names?patient_unique_ids=${patientUniqueIds.join(",")}`, baseUrl);
};

export default ApiChat;
