import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.printsettings_api_url }

const ApiPrintSettings = {};

ApiPrintSettings.getDefaultPrintsettings = function (data) {
    return api.post(`/api/v1/printsettings/getDefaultPrintsettings`, data, baseUrl);
};

ApiPrintSettings.savePrintsettings = function (formData) {
    return api.post(`/api/v1/printsettings/savePrintsettings`, formData, baseUrl);
};

ApiPrintSettings.getLimsPrintsettings = function () {
    return api.get(`/api/v1/printsettings/lims`, baseUrl);
};

ApiPrintSettings.saveLimsPrintsettings = function (formData) {
    return api.post(`/api/v1/printsettings/lims`, formData, baseUrl);
};

ApiPrintSettings.deleteLimsPrintsettings = function () {
    return api.delete(`/api/v1/printsettings/lims`, baseUrl);
};

export default ApiPrintSettings;
