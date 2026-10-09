import api from "./axiosService";
import config from '../../config';
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { buildNoCustomDataPayload } from "../../utils/chikitsalaySearchParams";
import { PERSISTANT_STORAGE_KEY_GENX_TOKEN } from "../../utils/constants";

const baseUrl = { customBaseUrl: config.investigation_api_url }
const baseSearchEngineUrl = { customBaseUrl: config.searchengine_url };
const fuzzySearchBaseUrl = { customBaseUrl: config.searchengine_url };
const genxMasterSearchBaseUrl =
  "https://gen-master-search-http-uat.ambitiousstone-b2402989.centralindia.azurecontainerapps.io/master-search-service";

const ApiInvestigation = {};

const getPersistedGenxAccessToken = () => {
  const storedToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_GENX_TOKEN);
  if (!storedToken) {
    throw new Error("GenX access token is missing from login response");
  }

  try {
    return JSON.parse(storedToken);
  } catch {
    return storedToken;
  }
};

const getGenxBusinessGroupId = (token) => {
  const decodedToken = jwtDecode(token);
  const businessGroupId = decodedToken?.businessGroupId;
  if (businessGroupId === undefined || businessGroupId === null) {
    throw new Error("GenX businessGroupId is missing from access token");
  }
  return businessGroupId;
};

ApiInvestigation.addTemplate = function (template) {
  return api.post(`/api/v1/investigation/addTemplate`, template, baseUrl);
};

ApiInvestigation.updateTemplate = function (template) {
  return api.post(`/api/v1/investigation/editTemplate`, template, baseUrl);
};

ApiInvestigation.deleteTemplate = function (templateId) {
  return api.get(`/api/v1/investigation/deleteTemplate/${templateId}`, baseUrl);
};

ApiInvestigation.getFuzzySearch = function (query, max_results = 1, { isChikitsalayAccessable } = {}) {
  const params = new URLSearchParams({
    search: query,
    max_results,
    ...buildNoCustomDataPayload(isChikitsalayAccessable),
  });
  return api.get(
    `/api/v1/investigation/fuzzySearch?${params.toString()}`,
    fuzzySearchBaseUrl
  );
};

ApiInvestigation.getInvestigationTemplates = function (query) {
  return api.get(`/api/v1/investigation/listTemplate`, baseUrl);
};

ApiInvestigation.singleTemplateDetails = function (templateId) {
  return api.get(`/api/v1/investigation/singleTemplateDetails/${templateId}`, baseUrl);
};

ApiInvestigation.getFrequentlySearchedInvestigation = function ({ isChikitsalayAccessable } = {}) {
  const params = new URLSearchParams(buildNoCustomDataPayload(isChikitsalayAccessable));
  return api.get(`/api/v1/investigation/frequentlyInvestigations?${params.toString()}`, baseSearchEngineUrl);
};

// ApiInvestigation.getFrequentlySearchedInvestigation = function () {
//   return api.post(`/api/v1/investigation/searchInvestigation`, {
//       search: "li"
//   }, baseUrl);
// };

ApiInvestigation.searchInvestigation = function (query, { isChikitsalayAccessable } = {}) {
  return api.post(`/api/v1/investigation/search`, {
    search: query,
    ...buildNoCustomDataPayload(isChikitsalayAccessable),
  }, baseSearchEngineUrl);
};

ApiInvestigation.searchGenxInvestigation = async function (query) {
  const token = getPersistedGenxAccessToken();
  const businessGroupId = getGenxBusinessGroupId(token);
  const response = await axios.get(
    `${genxMasterSearchBaseUrl}/api/v1/service-master/search`,
    {
      params: {
        query: `%${query}%`,
        active: true,
        businessGroupId,
        page: 0,
        size: 10,
        sort: JSON.stringify(["string"]),
      },
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
        genxaccesstoken: token,
      },
    }
  );

  return Array.isArray(response.data) ? response.data : response.data?.content || [];
};

export default ApiInvestigation;
