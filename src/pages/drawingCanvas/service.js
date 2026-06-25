import api from "../../api/services/axiosService";
import config from "../../config";

const baseUrl = { customBaseUrl: config.snap_rx_api_url };

/**
 * Our axios instance returns `response.data` (see axiosService interceptor), not the Axios object.
 * Never use `response.status === undefined` to mean "success" — API bodies often include `status: true`.
 */
const normalizeCanvasApiResult = (data, fallbackErrorMessage) => {
    const body = data && typeof data === "object" ? data : {};
    const explicitFailure =
        body.status === false ||
        body.status === "false" ||
        body.status === 0 ||
        body.status === "0";
    if (explicitFailure) {
        return {
            ...body,
            status: false,
            message: body.message || body.error || fallbackErrorMessage,
        };
    }
    // PUT/POST often return the entity only (e.g. mapping_id, canvas_url) with no `status` field.
    // Never do `{ status: true, ...body }` — body may contain `status: null` and overwrite success.
    return { ...body, status: true };
};

export const listTemplates = async () => {
    let res = {};
    try {
        const response = await api.get(`/api/v1/canvas`, baseUrl);
        res = normalizeCanvasApiResult(response, "Error fetching templates");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error fetching templates" };
    }
    return res;
};

export const createCustomCanvas = async (name, file) => {
    let res = {};
    try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("file", file);

        const response = await api.post(`/api/v1/canvas`, formData, {
            ...baseUrl,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        res = normalizeCanvasApiResult(response, "Error creating canvas");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error creating canvas" };
    }
    return res;
};

export const fetchTemplate = async (canvasId) => {
    let res = {};
    try {
        const response = await api.get(`/api/v1/canvas/${canvasId}`, baseUrl);
        res = normalizeCanvasApiResult(response, "Error fetching template");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error fetching template" };
    }
    return res;
};

export const renameCanvasTemplate = async (canvasId, name) => {
    let res = {};
    try {
        const response = await api.patch(`/api/v1/canvas/${canvasId}/rename`, { name }, baseUrl);
        res = normalizeCanvasApiResult(response, "Error renaming canvas");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error renaming canvas" };
    }
    return res;
};

// export const editCanvas = async (canvasId, file) => {
//     let res = {};
//     try {
//         const formData = new FormData();
//         formData.append("file", file);

//         const response = await api.put(`/api/v1/canvas/${canvasId}`, formData, {
//             ...baseUrl,
//             headers: {
//                 "Content-Type": "multipart/form-data",
//             },
//         });
//         if (response?.status === undefined) {
//             res = { status: true, ...response };
//         } else {
//             res = { status: false, message: response?.data?.message };
//         }
//     } catch (error) {
//         res = { status: false, message: error?.response?.data?.message || "Error editing canvas" };
//     }
//     return res;
// };

export const deleteCanvasTemplate = async (canvasId) => {
    let res = {};
    try {
        const response = await api.delete(`/api/v1/canvas/${canvasId}`, baseUrl);
        res = normalizeCanvasApiResult(response, "Error deleting canvas");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error deleting canvas" };
    }
    return res;
};

export const linkCanvasToPatient = async (name, file, patientUniqueId, tcmId) => {
    let res = {};
    try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("file", file);
        if (patientUniqueId) formData.append("patient_unique_id", patientUniqueId);
        if (tcmId) formData.append("tcm_id", tcmId);

        const response = await api.post(`/api/v1/canvas/patient`, formData, {
            ...baseUrl,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        res = normalizeCanvasApiResult(response, "Error linking canvas to patient");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error linking canvas to patient" };
    }
    return res;
};

export const listPatientCanvasMapping = async (patientUniqueId, tcmId) => {
    let res = {};
    try {
        let url = `/api/v1/canvas/patient/${patientUniqueId}`;
        if (tcmId) {
            url += `?tcm_id=${tcmId}`;
        }
        const response = await api.get(url, baseUrl);
        res = normalizeCanvasApiResult(response, "Error fetching patient canvas mapping");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error fetching patient canvas mapping" };
    }
    return res;
};

export const renameMapping = async (mappingId, name) => {
    let res = {};
    try {
        const response = await api.patch(`/api/v1/canvas/patient/${mappingId}/rename`, { name }, baseUrl);
        res = normalizeCanvasApiResult(response, "Error renaming mapping");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error renaming mapping" };
    }
    return res;
};

export const editMapping = async (mappingId, file) => {
    let res = {};
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.put(`/api/v1/canvas/patient/${mappingId}`, formData, {
            ...baseUrl,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        res = normalizeCanvasApiResult(response, "Error editing mapping");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error editing mapping" };
    }
    return res;
};

export const deleteMapping = async (mappingId) => {
    let res = {};
    try {
        const response = await api.delete(`/api/v1/canvas/patient/${mappingId}`, baseUrl);
        res = normalizeCanvasApiResult(response, "Error deleting mapping");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error deleting mapping" };
    }
    return res;
};

export const getShowCanvasPopup = async () => {
    let res = {};
    try {
        const response = await api.get(`/api/v1/canvas/metadata`, baseUrl);
        res = normalizeCanvasApiResult(response, "Error fetching canvas metadata");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error fetching canvas metadata" };
    }
    return res;
};

export const setShowCanvasPopup = async (isCanvasPopup) => {
    let res = {};
    try {
        const response = await api.post(`/api/v1/canvas/metadata`, { isCanvasPopup }, baseUrl);
        res = normalizeCanvasApiResult(response, "Error updating canvas metadata");
    } catch (error) {
        res = { status: false, message: error?.response?.data?.message || "Error updating canvas metadata" };
    }
    return res;
};
