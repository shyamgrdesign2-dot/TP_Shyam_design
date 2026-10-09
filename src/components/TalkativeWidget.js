import { useEffect, useMemo } from "react";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useLocation } from "react-router-dom";
import { GB_TALKATIVE, HIDE_ROUTES } from "../utils/constants";

const TALKATIVE_SCRIPT_ID = "talkative-widget-script";
const TALKATIVE_ARTIFACT_SELECTORS = [
  `#${TALKATIVE_SCRIPT_ID}`,
  'script[src*="engage.app/api/ecs/v1/loader"]',
  'script[src*="talkative-cdn.com"]',
  'iframe[src*="engage.app"]',
  'iframe[src*="talkative"]',
  '[data-talkative]',
  '[id^="talkative"]',
  '[id*="talkative"]',
  '[id^="Talkative"]',
  '[id*="Talkative"]',
  '[class^="talkative"]',
  '[class*=" talkative"]',
  '[class^="Talkative"]',
  '[class*=" Talkative"]',
];

function getTalkativeApi() {
  return window.talkativeApi || window.talaktiveApi;
}

function deactivateTalkativeWidget() {
  const talkativeApi = getTalkativeApi();
  talkativeApi?.ui?.hide?.();
  talkativeApi?.ui?.deactivate?.();
}

function activateTalkativeWidget() {
  const talkativeApi = getTalkativeApi();
  talkativeApi?.ui?.activate?.();
}

function findFabButton(shadowRoot) {
  const byTitle = shadowRoot.querySelector('button[title="Open Talkative Widget"]');
  if (byTitle) return byTitle;

  const marked = shadowRoot.querySelector("button[data-cw-fab]");
  if (marked) {
    const rect = marked.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return marked;
    delete marked.dataset.cwFab;
  }

  const btns = shadowRoot.querySelectorAll("button");
  for (let i = btns.length - 1; i >= 0; i--) {
    const rect = btns[i].getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.width <= 80 && rect.height <= 80) {
      btns[i].dataset.cwFab = "1";
      return btns[i];
    }
  }
  return null;
}

function injectShadowStyles(shadowRoot) {
  if (shadowRoot.querySelector("#cw-override-styles")) return;
  const style = document.createElement("style");
  style.id = "cw-override-styles";
  style.textContent =
    'button[title="Open Talkative Widget"] {' +
    "  width:56px!important;height:56px!important;border-radius:16px!important;" +
    "  background:linear-gradient(135deg,#4B4AD5 0%,#5E5DE0 40%,#7171EA 100%)!important;" +
    "  border:1px solid rgba(255,255,255,0.18)!important;padding:0!important;" +
    "  box-shadow:0 4px 16px rgba(75,74,213,0.30),0 2px 6px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.18)!important;" +
    "  display:flex!important;align-items:center!important;justify-content:center!important;" +
    "  transition:transform 200ms cubic-bezier(0.4,0,0.2,1),box-shadow 200ms cubic-bezier(0.4,0,0.2,1)!important;" +
    "}" +
    'button[title="Open Talkative Widget"]:hover {' +
    "  transform:translateY(-2px)!important;" +
    "  box-shadow:0 8px 24px rgba(75,74,213,0.35),0 3px 10px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.22)!important;" +
    "}" +
    'button[title="Open Talkative Widget"]:active {' +
    "  transform:scale(0.95)!important;" +
    "  box-shadow:0 2px 8px rgba(75,74,213,0.25),0 1px 4px rgba(0,0,0,0.08)!important;" +
    "}" +
    'button[title="Open Talkative Widget"] > div {' +
    "  padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;" +
    "}" +
    'button[title="Open Talkative Widget"] img {' +
    "  width:28px!important;height:28px!important;object-fit:contain!important;" +
    "  filter:brightness(0) invert(1)!important;" +
    "}";
  shadowRoot.prepend(style);
}

function findFixedAncestors(node) {
  const result = [];
  let n = node;
  while (n && n.parentElement) {
    n = n.parentElement;
    try {
      if (window.getComputedStyle(n).position === "fixed") result.push(n);
    } catch (_) {
      // ignore detached nodes
    }
  }
  return result;
}

function enforceFabPosition(btn) {
  const fixedNodes = findFixedAncestors(btn);

  const host = document.getElementById("talkative-engage");
  if (host) {
    try {
      if (window.getComputedStyle(host).position === "fixed") fixedNodes.push(host);
    } catch (_) {
      // ignore detached host
    }
    fixedNodes.push(...findFixedAncestors(host));
  }

  fixedNodes.forEach((ancestor) => {
    ancestor.style.setProperty("bottom", "16px", "important");
    ancestor.style.setProperty("right", "16px", "important");
    ancestor.style.setProperty("transition", "none", "important");
  });
}

function styleWidgetIcon(shadowRoot) {
  if (!shadowRoot) return;
  injectShadowStyles(shadowRoot);
  const btn = findFabButton(shadowRoot);
  if (!btn) return;

  btn.style.setProperty("width", "56px", "important");
  btn.style.setProperty("height", "56px", "important");
  btn.style.setProperty("border-radius", "16px", "important");
  btn.style.setProperty("background", "linear-gradient(135deg,#4B4AD5 0%,#5E5DE0 40%,#7171EA 100%)", "important");
  btn.style.setProperty("border", "1px solid rgba(255,255,255,0.18)", "important");
  btn.style.setProperty("padding", "0", "important");
  btn.style.setProperty("display", "flex", "important");
  btn.style.setProperty("align-items", "center", "important");
  btn.style.setProperty("justify-content", "center", "important");

  enforceFabPosition(btn);

  const innerDiv = btn.querySelector("div");
  if (innerDiv) {
    innerDiv.style.setProperty("padding", "0", "important");
    innerDiv.style.setProperty("display", "flex", "important");
    innerDiv.style.setProperty("align-items", "center", "important");
    innerDiv.style.setProperty("justify-content", "center", "important");
  }

  const img = btn.querySelector("img");
  if (img) {
    img.style.setProperty("width", "28px", "important");
    img.style.setProperty("height", "28px", "important");
    img.style.setProperty("object-fit", "contain", "important");
    img.style.setProperty("filter", "brightness(0) invert(1)", "important");
  }
}

function applyTalkativeFabShape() {
  const el = document.getElementById("talkative-engage");
  if (!el || !el.shadowRoot) return;
  styleWidgetIcon(el.shadowRoot);
}

function watchTalkativeShadow(el) {
  if (!el.shadowRoot || el.dataset.cwShapeObserved) return undefined;
  el.dataset.cwShapeObserved = "1";

  const observer = new MutationObserver(applyTalkativeFabShape);
  observer.observe(el.shadowRoot, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  return observer;
}

function removeTalkativeArtifacts() {
  TALKATIVE_ARTIFACT_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.parentNode?.removeChild(node);
    });
  });
}

function cleanupTalkativeWidget() {
  deactivateTalkativeWidget();
  removeTalkativeArtifacts();
}

const TalkativeWidget = ({
  region = "eu",
  configUuid = "3f5d31d7-aae5-43f2-903a-2dc2d90a36f3",
}) => {
  const location = useLocation();

  const shouldHideWidget = useMemo(() => {
    return HIDE_ROUTES.TALKATIVE.some(
      (route) =>
        location.pathname.includes(route)
    );
  }, [location.pathname]);

  const isTalktiveAccessableFromGB = useFeatureIsOn(GB_TALKATIVE);

  const scriptSrc = useMemo(() => {
    return `https://${region}.engage.app/api/ecs/v1/loader/${configUuid}.js?path=${encodeURIComponent(
      window.location.origin + window.location.pathname
    )}&selectedVersion=${
      new URLSearchParams(window.location.search).get("ecsSelectedVersion") ||
      ""
    }`;
  }, [region, configUuid, location.pathname, location.search]);

  useEffect(() => {
    if (!isTalktiveAccessableFromGB || shouldHideWidget) {
      cleanupTalkativeWidget();
      const cleanupTimer = window.setTimeout(cleanupTalkativeWidget, 500);
      return () => window.clearTimeout(cleanupTimer);
    }

    const existingScript = document.getElementById(TALKATIVE_SCRIPT_ID);
    if (existingScript?.src === scriptSrc) {
      activateTalkativeWidget();
      return () => {
        cleanupTalkativeWidget();
      };
    }

    if (existingScript) {
      existingScript.parentNode?.removeChild(existingScript);
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.id = TALKATIVE_SCRIPT_ID;
    script.addEventListener("load", activateTalkativeWidget);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", activateTalkativeWidget);
      cleanupTalkativeWidget();
    };
  }, [isTalktiveAccessableFromGB, scriptSrc, shouldHideWidget]);

  useEffect(() => {
    if (!isTalktiveAccessableFromGB || shouldHideWidget) return undefined;

    let shadowObserver;
    let shadowPollTimer;

    const attach = (el) => {
      applyTalkativeFabShape();
      if (el.shadowRoot) {
        shadowObserver = watchTalkativeShadow(el);
      } else {
        shadowPollTimer = window.setInterval(() => {
          if (el.shadowRoot) {
            window.clearInterval(shadowPollTimer);
            shadowPollTimer = undefined;
            applyTalkativeFabShape();
            shadowObserver = watchTalkativeShadow(el);
          }
        }, 200);
      }
    };

    const existing = document.getElementById("talkative-engage");
    let bodyObserver;
    if (existing) {
      attach(existing);
    } else {
      bodyObserver = new MutationObserver(() => {
        const el = document.getElementById("talkative-engage");
        if (el) {
          bodyObserver.disconnect();
          attach(el);
        }
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      bodyObserver?.disconnect();
      shadowObserver?.disconnect();
      if (shadowPollTimer) window.clearInterval(shadowPollTimer);
    };
  }, [isTalktiveAccessableFromGB, scriptSrc, shouldHideWidget]);

  return null;
};

export default TalkativeWidget;
