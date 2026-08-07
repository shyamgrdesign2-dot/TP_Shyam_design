import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "antd";
import styles from "./RichEditor.module.scss";

function exec(command, value) {
	document.execCommand(command, false, value);
}

const EMPTY_FORMATS = {
	h1: false,
	h2: false,
	paragraph: false,
	bold: false,
	italic: false,
	bulletList: false,
	numberedList: false,
};

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function plainTextToHtml(text) {
	return String(text || "")
		.replace(/\r\n/g, "\n")
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean)
		.map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
		.join("");
}

function sanitizePastedHtml(html) {
	if (!html || typeof DOMParser === "undefined") return "";
	const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
	const root = doc.body.firstElementChild;
	if (!root) return "";

	const hasBlockChildren = (node) =>
		Array.from(node.children || []).some((child) =>
			/^(article|div|h[1-6]|li|ol|p|section|ul)$/i.test(child.tagName)
		);

	const wrapMarks = (content, node) => {
		const style = node.getAttribute?.("style") || "";
		const isBold =
			/^(b|strong)$/i.test(node.tagName) ||
			/font-weight\s*:\s*(bold|bolder|[6-9]\d{2})/i.test(style);
		const isItalic =
			/^(i|em)$/i.test(node.tagName) ||
			/font-style\s*:\s*(italic|oblique)/i.test(style);
		let next = content;
		if (isItalic) next = `<em>${next}</em>`;
		if (isBold) next = `<strong>${next}</strong>`;
		return next;
	};

	const walk = (node) => {
		if (!node) return "";
		if (node.nodeType === 3) return escapeHtml(node.textContent || "");
		if (node.nodeType !== 1) return "";
		if (/^br$/i.test(node.tagName)) return "<br>";

		const children = Array.from(node.childNodes || []).map(walk).join("");
		if (!children.trim()) return "";
		const tag = node.tagName.toLowerCase();

		if (/^h[1-6]$/.test(tag)) {
			const headingTag = tag === "h1" ? "h1" : "h2";
			return `<${headingTag}>${wrapMarks(children, node)}</${headingTag}>`;
		}
		if (tag === "p") return `<p>${wrapMarks(children, node)}</p>`;
		if (tag === "ul" || tag === "ol") return `<${tag}>${children}</${tag}>`;
		if (tag === "li") return `<li>${wrapMarks(children, node)}</li>`;
		if (/^(article|div|section)$/.test(tag)) {
			return hasBlockChildren(node)
				? children
				: `<p>${wrapMarks(children, node)}</p>`;
		}
		return wrapMarks(children, node);
	};

	return Array.from(root.childNodes || []).map(walk).join("");
}

function isNodeInside(root, node) {
	if (!root || !node) return false;
	const element = node.nodeType === 1 ? node : node.parentNode;
	return Boolean(element && (element === root || root.contains(element)));
}

function getElementFromNode(node) {
	if (!node) return null;
	return node.nodeType === 1 ? node : node.parentElement;
}

function isBoldElement(element) {
	if (!element) return false;
	if (/^(b|strong)$/i.test(element.tagName)) return true;
	const fontWeight = element.style?.fontWeight || "";
	if (/^(bold|bolder)$/i.test(fontWeight)) return true;
	const numericWeight = Number(fontWeight);
	return Number.isFinite(numericWeight) && numericWeight >= 600;
}

function isItalicElement(element) {
	if (!element) return false;
	if (/^(i|em)$/i.test(element.tagName)) return true;
	return /^(italic|oblique)$/i.test(element.style?.fontStyle || "");
}

function mergeElementFormats(formats, node, root) {
	let element = getElementFromNode(node);
	let sawHeading = false;
	let sawBlock = false;

	while (element && element !== root.parentElement) {
		if (/^h1$/i.test(element.tagName)) {
			formats.h1 = true;
			sawHeading = true;
			sawBlock = true;
		}
		if (/^h2$/i.test(element.tagName)) {
			formats.h2 = true;
			sawHeading = true;
			sawBlock = true;
		}
		if (/^p$/i.test(element.tagName)) {
			formats.paragraph = true;
			sawBlock = true;
		}
		if (/^ul$/i.test(element.tagName)) {
			formats.bulletList = true;
			sawBlock = true;
		}
		if (/^ol$/i.test(element.tagName)) {
			formats.numberedList = true;
			sawBlock = true;
		}
		if (isBoldElement(element)) {
			formats.bold = true;
		}
		if (isItalicElement(element)) {
			formats.italic = true;
		}
		if (element === root) break;
		element = element.parentElement;
	}

	if (!sawHeading && !sawBlock && !formats.paragraph) {
		formats.paragraph = true;
	}
}

function rangeIntersectsNode(range, node) {
	try {
		return range.intersectsNode(node);
	} catch {
		return false;
	}
}

function getSelectionFormats(root) {
	const selection = window.getSelection?.();
	if (!root || !selection || selection.rangeCount === 0) return EMPTY_FORMATS;

	const anchorInside = isNodeInside(root, selection.anchorNode);
	const focusInside = isNodeInside(root, selection.focusNode);
	if (!anchorInside && !focusInside) return EMPTY_FORMATS;

	const formats = { ...EMPTY_FORMATS };
	const range = selection.getRangeAt(0);

	if (selection.isCollapsed) {
		mergeElementFormats(formats, selection.anchorNode, root);
		try {
			formats.bold = formats.bold || document.queryCommandState("bold");
			formats.italic = formats.italic || document.queryCommandState("italic");
			formats.bulletList = formats.bulletList || document.queryCommandState("insertUnorderedList");
			formats.numberedList = formats.numberedList || document.queryCommandState("insertOrderedList");
			const block = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
			if (block === "h1") formats.h1 = true;
			if (block === "h2") formats.h2 = true;
			if (block === "p" || block === "div") formats.paragraph = true;
		} catch {
			// queryCommandState can throw in some browsers when focus is moving.
		}
		return formats;
	}

	const walker = document.createTreeWalker(
		root,
		NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				if (!rangeIntersectsNode(range, node)) return NodeFilter.FILTER_REJECT;
				if (node.nodeType === 3 && !String(node.textContent || "").trim()) {
					return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		}
	);

	let foundNode = false;
	while (walker.nextNode()) {
		foundNode = true;
		mergeElementFormats(formats, walker.currentNode, root);
	}

	if (!foundNode) {
		mergeElementFormats(formats, selection.anchorNode, root);
		mergeElementFormats(formats, selection.focusNode, root);
	}

	return formats;
}

const ICON_SIZE = 16;

const H1Icon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" />
		<path d="M17 12l3-2v8" />
	</svg>
);

const H2Icon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" />
		<path d="M17 10a2 2 0 1 1 4 0c0 1.5-2.5 2.8-4 5h4" />
	</svg>
);

const TextIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
	</svg>
);

const BoldIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" />
	</svg>
);

const ItalicIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
	</svg>
);

const ListIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
		<circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" />
	</svg>
);

const OrderedListIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
		<path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
	</svg>
);

export function RichEditor({ html, onChange, placeholder = "Edit notes…" }) {
	const ref = useRef(null);
	const lastHtmlRef = useRef("");
	const isFocusedRef = useRef(false);
	const [activeFormats, setActiveFormats] = useState(EMPTY_FORMATS);

	const updateActiveFormats = useCallback(() => {
		const nextFormats = getSelectionFormats(ref.current);
		setActiveFormats((prev) => {
			const unchanged = Object.keys(EMPTY_FORMATS).every(
				(key) => Boolean(prev[key]) === Boolean(nextFormats[key])
			);
			return unchanged ? prev : nextFormats;
		});
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const nextHtml = html ?? "";
		if (!isFocusedRef.current && el.innerHTML !== nextHtml) {
			el.innerHTML = nextHtml;
			lastHtmlRef.current = nextHtml;
		}
	}, [html]);

	useEffect(() => {
		const handleSelectionChange = () => updateActiveFormats();
		document.addEventListener("selectionchange", handleSelectionChange);
		return () => {
			document.removeEventListener("selectionchange", handleSelectionChange);
		};
	}, [updateActiveFormats]);

	function handleInput() {
		const el = ref.current;
		if (!el) return;
		lastHtmlRef.current = el.innerHTML;
		onChange?.(el.innerHTML);
		updateActiveFormats();
	}

	function handlePaste(event) {
		const html = event.clipboardData?.getData("text/html");
		const text = event.clipboardData?.getData("text/plain");
		const sanitizedHtml = sanitizePastedHtml(html) || plainTextToHtml(text);
		if (!sanitizedHtml) return;
		event.preventDefault();
		exec("insertHTML", sanitizedHtml);
		handleInput();
	}

	function applyFormat(command, value) {
		exec(command, value);
		const el = ref.current;
		if (el) {
			lastHtmlRef.current = el.innerHTML;
			onChange?.(el.innerHTML);
		}
		window.setTimeout(updateActiveFormats, 0);
	}

	const buttons = [
		{ key: "h1", label: "Heading 1", icon: <H1Icon />, cmd: "formatBlock", value: "H1" },
		{ key: "h2", label: "Heading 2", icon: <H2Icon />, cmd: "formatBlock", value: "H2" },
		{ key: "paragraph", label: "Paragraph", icon: <TextIcon />, cmd: "formatBlock", value: "P" },
		{ divider: true },
		{ key: "bold", label: "Bold", icon: <BoldIcon />, cmd: "bold" },
		{ key: "italic", label: "Italic", icon: <ItalicIcon />, cmd: "italic" },
		{ divider: true },
		{ key: "bulletList", label: "Bullet list", icon: <ListIcon />, cmd: "insertUnorderedList" },
		{ key: "numberedList", label: "Numbered list", icon: <OrderedListIcon />, cmd: "insertOrderedList" }
	];

	return (
		<div className={styles.wrap}>
			<div className={styles.toolbar}>
				{buttons.map((b, i) =>
					b.divider ? (
						<span key={i} className={styles.divider} />
					) : (
						<Tooltip key={i} title={b.label} placement="top">
							<button
								type="button"
								className={[
									styles.toolBtn,
									activeFormats[b.key] ? styles.toolBtnActive : "",
								].filter(Boolean).join(" ")}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => applyFormat(b.cmd, b.value)}
								aria-pressed={Boolean(activeFormats[b.key])}
								aria-label={b.label}>
								{b.icon}
							</button>
						</Tooltip>
					)
				)}
			</div>
			<div
				ref={ref}
				className={styles.editor}
				contentEditable
				suppressContentEditableWarning
				data-placeholder={placeholder}
				onFocus={() => {
					isFocusedRef.current = true;
					updateActiveFormats();
				}}
				onBlur={() => {
					isFocusedRef.current = false;
					const el = ref.current;
					if (!el) return;
					lastHtmlRef.current = el.innerHTML;
					onChange?.(el.innerHTML);
				}}
				onInput={handleInput}
				onKeyUp={updateActiveFormats}
				onMouseUp={updateActiveFormats}
				onPaste={handlePaste}
				spellCheck
			/>
		</div>
	);
}
