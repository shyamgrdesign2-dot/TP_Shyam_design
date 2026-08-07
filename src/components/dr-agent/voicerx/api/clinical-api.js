import { env } from '../../../../EnvironmentConfig';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../../../../utils/constants';

function normalizeBaseUrl(url) {
	return (url || '').trim().replace(/\/+$/, '');
}

export const CLINICAL_API_BASE_URL =
	normalizeBaseUrl(env?.agent_module_api_base_url);

export const AGENT_MODULE_API_BASE_URL =
	normalizeBaseUrl(env?.agent_module_api_base_url);

export function joinClinicalApiUrl(path) {
	if (!CLINICAL_API_BASE_URL) {
		throw new Error('Clinical API base URL is not configured.');
	}
	return `${CLINICAL_API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function joinAgentModuleApiUrl(path) {
	const configuredUrl = AGENT_MODULE_API_BASE_URL.replace(/\/+$/, '');
	const requestedPath = (path || '').replace(/^\/+/, '');

	if (!configuredUrl) {
		throw new Error('Agent module API base URL is not configured.');
	}

	if (!requestedPath) {
		return configuredUrl;
	}

	return `${configuredUrl}/${requestedPath}`;
}

function normalizeBearerToken(token) {
	const cleanedToken = String(token || '').trim().replace(/^['"]+|['"]+$/g, '');
	if (!cleanedToken) return '';
	return cleanedToken.startsWith('Bearer ') ? cleanedToken : `Bearer ${cleanedToken}`;
}

function parseStoredToken(rawToken) {
	if (!rawToken) return '';
	try {
		return JSON.parse(rawToken);
	} catch (error) {
		return rawToken;
	}
}

function getStoredAuthToken() {
	if (typeof window === 'undefined' || !window.localStorage) return '';
	return parseStoredToken(window.localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN));
}

export function buildClinicalApiHeaders({ includeContentType = true } = {}) {
	const headers = includeContentType ? { 'Content-Type': 'application/json' } : {};
	const authToken = getStoredAuthToken();

	if (authToken) {
		headers.Authorization = normalizeBearerToken(authToken);
	}

	return headers;
}

export function getVoiceApiEnvironment(appEnv = process.env.REACT_APP_ENV) {
	if (appEnv === 'prod' || appEnv === 'zy-prod') return 'prod';
	if (appEnv === 'zy-preprod') return 'preprod';
	return 'uat';
}

export function buildVoiceApiMetadata(context = {}) {
	const appEnv = process.env.REACT_APP_ENV || '';
	const doctorId = String(context.doctorId || context.doctor_id || '');
	return {
		tenant_id: appEnv,
		tenant_type: 'hospital',
		request_source: 'tatva_practice',
		environment: getVoiceApiEnvironment(appEnv),
		user_id: doctorId,
		actor_type: doctorId,
		asset_source: 'microphone',
		asset_scope: 'api_input',
		doctor_name: String(context.doctorName || context.doctor_name || ''),
		patient_name: String(context.patientName || context.patient_name || ''),
	};
}

export function appendVoiceApiMetadata(formData, context) {
	const metadata = buildVoiceApiMetadata(context);
	Object.entries(metadata).forEach(([key, value]) => {
		formData.append(key, value);
	});
	return formData;
}
