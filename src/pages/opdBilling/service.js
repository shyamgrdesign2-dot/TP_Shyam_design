import api from "../../api/services/axiosService";
import config from "../../config";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";

const baseUrl = { customBaseUrl: config.lab_params_api_url };

export const fetchPrintSetting = async function (doctorId, billType) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/billing/printSetting?${doctorId ? `um_id=${doctorId}` : ""}${
        billType ? `&billType=ipdBill` : ""
      }`,
      baseUrl
    );
    // Ensure ABHA ID and ABHA Registration Number exist in patientInfo; add only if not present (check by id or title)
    const ensureAbhaFields = (arr) => {
      if (!Array.isArray(arr)) return;

      const ensureItem = (id, title) => {
        const exists = arr.some(
          (item) => item?.id === id || (item?.title && String(item.title).trim() === title)
        );
        if (!exists) {
          arr.push({ id, title, enabled: false });
        }
      };

      ensureItem(8, "ABHA ID");
      ensureItem(9, "ABHA Registration Number");
    };

    const patientInfo = res?.headerFooter?.patientInfo;
    if (Array.isArray(patientInfo)) {
      ensureAbhaFields(patientInfo);
    }

    const ensureDateField = (arr) => {
      if (!Array.isArray(arr)) return;

      const ensureItem = (id, title) => {
        const exists = arr.some(
          (item) => item?.id === id || (item?.title && String(item.title).trim() === title)
        );
        if (!exists) {
          arr.push({ id, title, enabled: false });
        }
      };

      ensureItem(6, "Bill Date");
    };

    const billInfo = res?.headerFooter?.billInfo;
    if (Array.isArray(billInfo)) {
      ensureDateField(billInfo);
    }
  } catch (e) {
    console.error("Error while fetching Print settings details: ", e);
  }
  return res;
};

export const updatePrintSetting = async function (payload) {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/billing/printSetting`,
      payload,
      baseUrl
    );
  } catch (e) {
    console.error("Error while updating Billing Print Setting Data: ", e);
  }
  return res;
};

export const deletePrintSetting = async function (billType) {
  let res = {};
  try {
    res = await api.delete(
      `/api/v1/billing/printSetting${billType ? `?billType=ipdBill` : ""}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while deleting the Print Setting: ", e);
  }
  return res;
};

// Function to process a bill refund
export const processBillRefund = async function (payload, billType = "opd") {
  let res = {};
  try {
    const apiUrl =
      billType === "ipd"
        ? `/api/v1/billing/ipd-bill/refund`
        : `/api/v1/billing/bill/refund`;

    // Make the API call
    res = await api.post(apiUrl, payload, baseUrl);
  } catch (e) {
    console.error(
      `Error while processing ${billType.toUpperCase()} bill refund: `,
      e
    );
  }
  return res;
};

// Function to process clear due
export const processClearDue = async function (payload, billType = "opd") {
  let res = {};
  try {
    const apiUrl =
      billType === "ipd"
        ? `/api/v1/billing/ipd-bill/clear-due`
        : `/api/v1/billing/bill/clear-due`;

    // Make the API call
    res = await api.post(apiUrl, payload, baseUrl);
  } catch (e) {
    console.error(
      `Error while processing ${billType.toUpperCase()} clear due: `,
      e
    );
  }
  return res;
};
export const createBill = async function (payload, billType = "opd", id = null) {
  let res = {};
  try {
    const base = billType === "ipd" ? "ipd-bill" : "bill";
    const endpoint = `/api/v1/billing/${base}${id ? "/edit-bill" : ""}`;
    res = await api.post(endpoint, payload, baseUrl);
  } catch (e) {
    console.error(`Error while Creating ${billType.toUpperCase()} Bill: `, e);
  }
  return res;
};

export const fetchAdvanceSetting = async function () {
  let res = {};
  try {
    res = await api.get(`/api/v1/billing/advancedSetting`, baseUrl);
  } catch (e) {
    console.error("Error while fetching Advance settings details: ", e);
  }
  return res;
};

export const searchBillItem = async function (searchQuery, options = {}) {
  let res = {};
  const trimmed = String(searchQuery ?? "").trim();
  if (!trimmed) return res;
  try {
    const params = new URLSearchParams({ search: trimmed });
    if (options.type) {
      params.set("type", options.type);
    }
    res = await api.get(`/api/v1/billing/billItem?${params.toString()}`, baseUrl);
  } catch (e) {
    console.error("Error while fetching search bill items: ", e);
  }
  return res;
};

/** Bill items whose type is dental (API: Dental_Service; local catalog: dental). */
export function isDentalBillItemType(type) {
  const normalized = String(type ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return normalized === "dental" || normalized === "dental_service";
}

export function normalizeBillItemSearchResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export const searchDentalBillItems = async function (searchQuery) {
  const trimmed = String(searchQuery ?? "").trim();
  let response;
  if (!trimmed) {
    const queryParams = new URLSearchParams({
      type: "Dental_Service",
      page: "1",
      limit: "100",
    });
    response = await listBillItem(queryParams);
  } else {
    response = await searchBillItem(trimmed, { type: "Dental_Service" });
  }
  const items = normalizeBillItemSearchResponse(response);
  return items.filter((item) => isDentalBillItemType(item?.type));
};

export const listBillItem = async function (queryParams) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/billing/billItem/list?${queryParams}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching bill items: ", e);
  }
  return res;
};

export const fetchBillingDashboard = async function (params, billType = "opd") {
  let res = {};
  try {
    // Construct query parameters
    const queryParams = {
      search: params.search ?? "",
      startDate: params.startDate,
      endDate: params.endDate,
      sortBy: params.sortBy || "date", // Default sorting field
      sortOrder: params.sortOrder || "desc", // Default sorting order
      page: params.page || 1,
      limit: params.limit || 25,
    };

    if (params.patientId && billType === "ipd") {
      queryParams.patientId = params.patientId;
    }

    // Conditionally add isForm3C **only if the key exists in params**
    if ("isForm3C" in params) {
      queryParams.isForm3C = params.isForm3C;
    }

    // Convert status array into multiple query params
    let statusParams = "";
    if (params.status) {
      statusParams = params.status
        .map((status) => `status=${encodeURIComponent(status)}`)
        .join("&");
    }

    // Convert doctorIds array into multiple query params
    let doctorIdsParams = "";
    if (params.doctorIds && Array.isArray(params.doctorIds)) {
      doctorIdsParams = params.doctorIds
        .map((id) => `doctorIds=${encodeURIComponent(id)}`)
        .join("&");
    }

    // Construct the final query string
    const queryString = new URLSearchParams(queryParams).toString();
    const endpoint =
      billType === "ipd"
        ? "/api/v1/billing/ipd-bill/dashboard"
        : "/api/v1/billing/bill/dashboard";
    const apiUrl = `${endpoint}?${queryString}${
      statusParams ? `&${statusParams}` : ""
    }${doctorIdsParams ? `&${doctorIdsParams}` : ""}`;

    // Make the API call
    res = await api.get(apiUrl, baseUrl);
  } catch (e) {
    console.error(
      `Error while fetching ${billType.toUpperCase()} billing dashboard data: `,
      e
    );
  }
  return res;
};

export const upsertBillItem = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/api/v1/billing/billItem`, payload, baseUrl);
  } catch (e) {
    console.error("Error while upserting bill item: ", e);
  }
  return res;
};

export const getBillItemTypes = async function () {
  let res = [];
  try {
    res = await api.get(`/api/v1/billing/billItemType`, baseUrl);
  } catch (e) {
    console.error("Error while fetching bill item types: ", e);
  }
  return Array.isArray(res) ? res : res?.data || [];
};

export const createBillItemType = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/api/v1/billing/billItemType`, payload, baseUrl);
  } catch (e) {
    console.error("Error while creating bill item type: ", e);
  }
  return res;
};

export const deleteBillItemType = async function (typeId) {
  let res = {};
  try {
    res = await api.delete(`/api/v1/billing/billItemType/${typeId}`, baseUrl);
  } catch (e) {
    console.error("Error while deleting bill item type: ", e);
  }
  return res;
};

// Function to add bills to Form 3C
export const addBillsToForm3C = async function (payload, billType = "opd") {
  let res = {};
  try {
    const endpoint =
      billType === "ipd"
        ? "/api/v1/billing/ipd-bill/addToForm3C"
        : "/api/v1/billing/bill/addToForm3C";
    res = await api.post(endpoint, payload, baseUrl);
  } catch (e) {
    console.error(
      `Error while adding ${billType.toUpperCase()} bills to Form 3C: `,
      e
    );
  }
  return res;
};

// Function to fetch Form 3C billing data
export const fetchForm3CBills = async function (params) {
  let res = [];
  try {
    res = await api.get(`/api/v1/billing/dashboard/bills`, baseUrl);
  } catch (e) {
    console.error("Error while fetching Form 3C bills: ", e);
  }
  return res;
};

// Function to add advanced deposit
export const createAdvancedDeposit = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/api/v1/billing/advancedDeposit`, payload, baseUrl);
  } catch (e) {
    console.error("Error while adding advanced deposit: ", e);
  }
  return res;
};

// Function to list advanced deposits by patient
export const listAdvancedDepositByPatient = async function (params) {
  let res = {};
  try {
    // Extract non-array query parameters
    const queryParams = {
      search: params.search ?? "",
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      patientId: params.patientId,
      page: params.page || 1,
      limit: params.limit || 25,
    };

    if (params.startDate) {
      queryParams.startDate = params.startDate;
    }

    if (params.endDate) {
      queryParams.endDate = params.endDate;
    }

    // Convert doctorIds array into multiple query params
    let doctorIdsParams = "";
    if (params.doctorIds && Array.isArray(params.doctorIds)) {
      doctorIdsParams = params.doctorIds
        .map((id) => `doctorIds=${encodeURIComponent(id)}`)
        .join("&");
    }

    // Conditionally add isForm3C **only if the key exists in params**
    if ("appointmentId" in params && params.appointmentId) {
      queryParams.appointmentId = params.appointmentId;
    }

    const statusParams = Array.isArray(params.status)
      ? params.status
          .map((status) => `status=${encodeURIComponent(status)}`)
          .join("&")
      : params.status
      ? `status=${encodeURIComponent(params.status)}`
      : "";
    // Combine query parameters into a single query string
    const queryString =
      new URLSearchParams(queryParams).toString() +
      (statusParams ? `&${statusParams}` : "") +
      (doctorIdsParams ? `&${doctorIdsParams}` : "");

    // Construct the final API URL
    const apiUrl = `/api/v1/billing/advancedDeposit/listByPatient?${queryString}`;

    // Perform the API request
    res = await api.get(apiUrl, {
      customBaseUrl: baseUrl.customBaseUrl,
    });
  } catch (e) {
    console.error("Error while listing advanced deposits by patient: ", e);
  }
  return res;
};

export const fetchBillsByPatient = async function (params, billType = "opd") {
  let res = {};
  try {
    // Construct query parameters dynamically
    const queryParams = {
      search: params.search ?? "",
      sortBy: params.sortBy || "date",
      sortOrder: params.sortOrder || (billType === "ipd" ? "desc" : "asc"),
      page: params.page || 1,
      limit: params.limit || 25,
      patientId: params.patientId,
    };

    if (params.startDate) {
      queryParams.startDate = params.startDate;
    }

    if (params.endDate) {
      queryParams.endDate = params.endDate;
    }

    const statusParams = Array.isArray(params.status)
      ? params.status
          .map((status) => `status=${encodeURIComponent(status)}`)
          .join("&")
      : params.status
      ? `status=${encodeURIComponent(params.status)}`
      : "";

    // Convert doctorIds array into multiple query params
    let doctorIdsParams = "";
    if (params.doctorIds && Array.isArray(params.doctorIds)) {
      doctorIdsParams = params.doctorIds
        .map((id) => `doctorIds=${encodeURIComponent(id)}`)
        .join("&");
    }

    if (params.includeInRx && billType === "opd") {
      queryParams.includeInRx = params.includeInRx;
    }
    if (
      "appointmentId" in params &&
      params.appointmentId &&
      billType === "opd"
    ) {
      queryParams.appointmentId = params.appointmentId;
    }

    // Create query string
    const queryString =
      new URLSearchParams(queryParams).toString() +
      (doctorIdsParams ? `&${doctorIdsParams}` : "") +
      (statusParams ? `&${statusParams}` : "");

    // API call
    const endpoint =
      billType === "ipd"
        ? "/api/v1/billing/ipd-bill/listByPatient"
        : "/api/v1/billing/bill/listByPatient";
    res = await api.get(`${endpoint}?${queryString}`, baseUrl);
  } catch (e) {
    console.error(
      `Error while fetching ${billType.toUpperCase()} bills by patient: `,
      e
    );
  }
  return res;
};

// Function to get advanced deposit dashboard data
export const fetchAdvancedDepositDashboard = async function (params) {
  let res = {};
  try {
    const queryParams = {
      sortBy: params.sortBy || "date", // Default sorting field
      sortOrder: params.sortOrder || "desc", // Default sorting order
      page: params.page,
      limit: params.limit,
      startDate: params.startDate,
      endDate: params.endDate,
      patientName: params.patientName ?? "",
      patientPhone: params.patientPhone ?? "",
      search: params.search ?? "",
    };

    const statusParams = Array.isArray(params.status)
      ? params.status
          .map((status) => `status=${encodeURIComponent(status)}`)
          .join("&")
      : params.status
      ? `status=${encodeURIComponent(params.status)}`
      : "";

    // Combine query parameters into a single query string
    const queryString =
      new URLSearchParams(queryParams).toString() +
      (statusParams ? `&${statusParams}` : "");

    // Construct the final API URL
    const apiUrl = `/api/v1/billing/advancedDeposit/dashboard?${queryString}`;

    // Perform the API request
    res = await api.get(apiUrl, {
      customBaseUrl: baseUrl.customBaseUrl,
    });
  } catch (e) {
    console.error("Error while fetching advanced deposit dashboard data: ", e);
  }
  return res;
};

// Function to add bills to Form 3C
export const addToForm3C = async function (billIds, billType = "opd") {
  let res = {};
  try {
    // API request payload
    const payload = {
      billIds: billIds, // Array of bill IDs
    };

    const endpoint =
      billType === "ipd"
        ? "/api/v1/billing/ipd-bill/addToForm3C"
        : "/api/v1/billing/bill/addToForm3C";
    res = await api.post(endpoint, payload, baseUrl);
  } catch (e) {
    console.error(
      `Error while adding ${billType.toUpperCase()} bills to Form 3C: `,
      e
    );
  }
  return res;
};

export const bulkInsertBillItems = async function (items) {
  let res = {};
  try {
    res = await api.post(`/api/v1/billing/billItem/bulkInsert`, { items }, baseUrl);
  } catch (e) {
    console.error("Error while bulk inserting bill items: ", e);
    throw e;
  }
  return res;
};

export const deleteBillItem = async function (itemId) {
  let res = {};
  try {
    res = await api.delete(`/api/v1/billing/billItem/${itemId}`, baseUrl);
  } catch (e) {
    console.error("Error while deleting the bill item: ", e);
  }
  return res;
};

export const fetchPatientDueAmount = async function (patientId) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/billing/bill/patientDueAmount?patientId=${patientId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching patient due amount: ", e);
  }
  return res;
};

export const fetchPatientWalletBalance = async function (patientId) {
  let res = {};
  try {
    res = await api.get(
      `/api/v1/billing/advancedDeposit/walletBalance?patientId=${patientId}`,
      baseUrl
    );
  } catch (e) {
    console.error("Error while fetching patient wallet balance: ", e);
  }
  return res;
};

export const updateAdvancedSettings = async function (payload) {
  let res = {};
  try {
    res = await api.post(`/api/v1/billing/advancedSetting`, payload, baseUrl);
  } catch (e) {
    res = e?.response;
    console.error("Error while updating advanced settings: ", e);
  }
  return res;
};

export const fetchBillDetailsByBillNumber = async function (
  billNumber,
  admissionId = null,
  billType = "opd"
) {
  let res = {};
  try {
    const queryParams = {
      billNumber: billNumber,
    };

    if (admissionId && billType === "ipd") {
      queryParams.admissionId = admissionId;
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const endpoint =
      billType === "ipd"
        ? "/api/v1/billing/ipd-bill/getByBillNumber"
        : "/api/v1/billing/bill/getByBillNumber";
    res = await api.get(`${endpoint}?${queryString}`, baseUrl);
  } catch (e) {
    console.error(
      `Error while fetching ${billType.toUpperCase()} bill details by bill number: `,
      e
    );
  }
  return res;
};

export const checkToShowOpdBilling = async function () {
  let res = {};
  try {
    res = await api.get(`api/v1/billing/bill/isV2Enabled`, baseUrl);
  } catch (e) {
    console.error(
      "Error while fetching to check whether to show opd billing: ",
      e
    );
  }
  return res?.data;
};

export const generateBillToken = async function () {
  let res = {};
  try {
    res = await api.post(
      `/api/v1/billing/bill/generate-bill-token`,
      {},
      baseUrl
    );
    res = res?.token;
  } catch (e) {
    console.error("Error while generating bill token: ", e);
  }
  return res;
};

export const fetchBillDetails = async function (
  billNumber,
  patientId,
  doctorId,
  token,
  admissionId = null,
) {
  try {
    const queryParams = {
      billNumber: billNumber,
      patientId: patientId,
      doctorId: doctorId,
    };
    
    if (admissionId) {
      queryParams.admissionId = admissionId;
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const endpoint = admissionId 
      ? "/api/v1/billing/bill-pdf/ipd-bill-details" 
      : "/api/v1/billing/bill-pdf/bill-details";
    
    const response = await fetch(
      `${baseUrl.customBaseUrl}${endpoint}?${queryString}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error(`Error while fetching bill details: `, e);
    return null;
  }
};

export const fetchAdvancedDepositDetails = async function (
  receiptNumber,
  patientId,
  doctorId,
  token
) {
  try {
    const response = await fetch(
      `${baseUrl.customBaseUrl}/api/v1/billing/bill-pdf/advanced-deposit-details?receiptNumber=${receiptNumber}&patientId=${patientId}&doctorId=${doctorId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Error while fetching advanced deposit details: ", e);
    return null;
  }
};

export const sendWhatsAppMessage = async function (payload) {
  try {
    // switched from the internal static-key route to this JWT-authenticated one, since the key can't stay secret in a browser bundle
    const token = JSON.parse(localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN));
    const response = await fetch(
      `${config.bulk_messages}/api/v1/communication/sendWhatsAppMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.status;
  } catch (e) {
    console.error("Error while sending WhatsApp message: ", e);
    return null;
  }
};

export const createShortLink = async function (targetUrl) {
  try {
    const response = await fetch(`${config.short_links_api_url}/api/v2/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": config.short_links_api_key,
      },
      body: JSON.stringify({
        target: targetUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data?.short_url;
  } catch (e) {
    console.error("Error while creating short link: ", e);
    return null;
  }
};

export const fetchItemizedBillData = async function (
  startDate,
  endDate,
  billType = "opd"
) {
  let res = {};
  try {
    const endpoint =
      billType === "ipd"
        ? "/api/v1/billing/ipd-bill/itemized-bill-data"
        : "/api/v1/billing/bill/itemized-bill-data";
    res = await api.get(
      `${endpoint}?startDate=${startDate}&endDate=${endDate}`,
      baseUrl
    );
  } catch (e) {
    console.error(
      `Error while fetching ${billType.toUpperCase()} itemized bill data: `,
      e
    );
  }
  return res;
};

// Function to get IPD bills by admission IDs (IPD specific)
export const fetchBillsByAdmissionIds = async function (admissionIds) {
  let res = {};
  try {
    // Convert admissionIds array into multiple query params
    let admissionIdsParams = "";
    if (admissionIds && Array.isArray(admissionIds)) {
      admissionIdsParams = admissionIds
        .map((id) => `admissionIds=${encodeURIComponent(id)}`)
        .join("&");
    }

    const apiUrl = `/api/v1/billing/ipd-bill/getByAdmissionIds?${admissionIdsParams}`;

    // Make the API call
    res = await api.get(apiUrl, baseUrl);
  } catch (e) {
    console.error("Error while fetching IPD bills by admission IDs: ", e);
  }
  return res;
};
