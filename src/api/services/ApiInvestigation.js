import api from "./axiosService";
import config from '../../config';
import { buildNoCustomDataPayload } from "../../utils/chikitsalaySearchParams";

const baseUrl = { customBaseUrl: config.investigation_api_url }
const baseSearchEngineUrl = { customBaseUrl: config.searchengine_url };
const fuzzySearchBaseUrl = { customBaseUrl: config.searchengine_url };

const ApiInvestigation = {};

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

export default ApiInvestigation;
