let latestSoapDraft = null;
const soapDraftBySession = new Map();

export function setLatestSoapDraft({ sessionId = "", html = "", soap = null } = {}) {
	const draft = {
		sessionId: sessionId || "",
		html: typeof html === "string" ? html : "",
		soap: soap && typeof soap === "object" ? soap : null,
		updatedAt: Date.now(),
	};
	latestSoapDraft = draft;
	if (draft.sessionId) {
		soapDraftBySession.set(draft.sessionId, draft);
	}
	return draft;
}

export function getLatestSoapDraft(sessionId = "") {
	if (sessionId && soapDraftBySession.has(sessionId)) {
		return soapDraftBySession.get(sessionId);
	}
	if (sessionId) return null;
	return latestSoapDraft;
}

export function clearLatestSoapDraft(sessionId = "") {
	if (sessionId) {
		soapDraftBySession.delete(sessionId);
		if (latestSoapDraft?.sessionId === sessionId) latestSoapDraft = null;
		return;
	}
	latestSoapDraft = null;
	soapDraftBySession.clear();
}
