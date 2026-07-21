import {
  buildVoiceSoapStoreFields,
  hasMeaningfulVoicePayloadData,
  resolveVoiceSoapHtml,
  resolveVoiceSoapSections,
} from "./voiceSoapPayload";

describe("voiceSoapPayload", () => {
  it("prefers stored SOAP HTML across supported API field names", () => {
    expect(resolveVoiceSoapHtml({ soap_html: "<h1>Subjective</h1>" })).toBe("<h1>Subjective</h1>");
    expect(resolveVoiceSoapHtml({ soap: { html: "<p>nested</p>" } })).toBe("<p>nested</p>");
    expect(resolveVoiceSoapHtml({ soapHtml: "<p>old</p>", soap: { soapHtml: "<p>nested</p>" } })).toBe("<p>nested</p>");
  });

  it("resolves structured SOAP without treating an HTML wrapper as the RTF object", () => {
    const soap = { subjective: "{\\rtf1 Subjective\\par}" };

    expect(resolveVoiceSoapSections({ soap })).toEqual(soap);
    expect(resolveVoiceSoapSections({ soap: { html: "<h1>Subjective</h1>" }, soapStructured: soap })).toEqual(soap);
  });

  it("reads nested soapHtml but excludes it from structured SOAP hydration", () => {
    const payload = {
      soap: {
        subjective: "{\\rtf1 Subjective\\par}",
        soapHtml: "<h1>Subjective</h1>",
      },
    };

    expect(resolveVoiceSoapHtml(payload)).toBe("<h1>Subjective</h1>");
    expect(resolveVoiceSoapSections(payload)).toEqual({
      subjective: "{\\rtf1 Subjective\\par}",
    });
  });

  it("builds store fields with exact HTML nested inside the SOAP object", () => {
    const soap = { plan: "{\\rtf1 Plan\\par}" };

    expect(buildVoiceSoapStoreFields({ soap, soapHtml: "<h1>Plan</h1>" })).toEqual({
      soap: {
        plan: "{\\rtf1 Plan\\par}",
        soapHtml: "<h1>Plan</h1>",
      },
    });
  });

  it("treats an HTML-only SOAP response as meaningful", () => {
    expect(hasMeaningfulVoicePayloadData({ soap_html: "<h1>Plan</h1>" })).toBe(true);
    expect(hasMeaningfulVoicePayloadData({})).toBe(false);
  });
});
