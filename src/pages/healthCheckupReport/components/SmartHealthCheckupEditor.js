import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, useMemo } from "react";
import JoditEditor from "jodit-react";
import "./SmartHealthCheckupEditor.scss";

// Strips invisible Word break-hint characters AND converts Word's &nbsp; word
// separators to regular spaces so that normal CSS word-wrap rules apply.
// Runs on paste AND on initial load so existing saved reports are fixed too.
const BREAK_HINTS_RE = /[­​‌‍]/g;
const NBSP = '\u00A0';
const FONT_FAMILY_OPTIONS = {
  '': 'Default',
  'Arial, Helvetica, sans-serif': 'Arial',
  "'Courier New', Courier, monospace": 'Courier New',
  'Georgia, Palatino, serif': 'Georgia',
  "'Lucida Sans Unicode', 'Lucida Grande', sans-serif": 'Lucida Sans Unicode',
  'Tahoma, Geneva, sans-serif': 'Tahoma',
  "'Times New Roman', Times, serif": 'Times New Roman',
  "'Trebuchet MS', Helvetica, sans-serif": 'Trebuchet MS',
  'Helvetica, sans-serif': 'Helvetica',
  'Impact, Charcoal, sans-serif': 'Impact',
  'Verdana, Geneva, sans-serif': 'Verdana'
};

function stripBreakHints(html) {
  if (!html) return html;

  // 1. Remove invisible soft-hyphen / zero-width characters.
  let result = html.replace(BREAK_HINTS_RE, '');

  // 2. Convert &nbsp; word-separators to plain spaces.
  //    Word exports every space as &nbsp;, turning entire sentences into one
  //    unbreakable run — the browser then must split mid-word at the container edge.
  //    We parse through DOM text nodes so we can preserve &nbsp; in nodes that
  //    contain ONLY &nbsp; (e.g. <p>&nbsp;</p> empty-line spacers used by Jodit).
  if (result.includes('&nbsp;') && typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = result;
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      if (!text.includes(NBSP)) continue;
      // Preserve &nbsp; in nodes whose content is ONLY &nbsp; — these are
      // Jodit / Word empty-line spacers like <p>&nbsp;</p>. Converting them
      // to plain spaces would collapse those paragraphs in the browser.
      if (text.replace(/\u00A0/g, '').trim().length > 0) {
        node.textContent = text.replace(/\u00A0/g, ' ');
      }
    }
    result = div.innerHTML;
  }

  return result;
}

function getSelectedTextNodes(range, root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue || !range.intersectsNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    const textLength = node.nodeValue.length;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : textLength;

    if (start < end) {
      nodes.push({ node, start, end });
    }
  }

  return nodes;
}

function applyCase(editor, fn) {
  const range = editor.selection.range;
  if (!range || range.collapsed) return;

  const selectedNodes = getSelectedTextNodes(range, editor.editor);
  if (selectedNodes.length === 0) return;

  const transformedNodes = selectedNodes.map(({ node, start, end }) => {
    const originalText = node.nodeValue;
    const selectedText = originalText.slice(start, end);
    const transformedText = fn(selectedText);

    node.nodeValue =
      originalText.slice(0, start) +
      transformedText +
      originalText.slice(end);

    return {
      node,
      start,
      end: start + transformedText.length,
    };
  });

  const nextRange = document.createRange();
  const firstNode = transformedNodes[0];
  const lastNode = transformedNodes[transformedNodes.length - 1];
  nextRange.setStart(firstNode.node, firstNode.start);
  nextRange.setEnd(lastNode.node, lastNode.end);
  editor.selection.selectRange(nextRange);
  editor.synchronizeValues?.();
}

function wrapSelectedTextNode({ node, start, end }, fontFamily) {
  const originalText = node.nodeValue;
  const parent = node.parentNode;
  if (!parent) return null;

  const beforeText = originalText.slice(0, start);
  const selectedText = originalText.slice(start, end);
  const afterText = originalText.slice(end);
  const selectedTextNode = document.createTextNode(selectedText);
  const wrapper = document.createElement('span');
  wrapper.style.fontFamily = fontFamily;
  wrapper.appendChild(selectedTextNode);

  if (beforeText) {
    parent.insertBefore(document.createTextNode(beforeText), node);
  }

  parent.insertBefore(wrapper, node);

  if (afterText) {
    parent.insertBefore(document.createTextNode(afterText), node);
  }

  parent.removeChild(node);
  return selectedTextNode;
}

function applyFontFamily(editor, fontFamily) {
  if (!fontFamily) {
    editor.execCommand('fontname', false, fontFamily);
    return;
  }

  const range = editor.selection.range;
  if (!range || range.collapsed) return;

  const selectedNodes = getSelectedTextNodes(range, editor.editor);
  if (selectedNodes.length === 0) return;

  const wrappedTextNodes = selectedNodes
    .map((selectionPart) => wrapSelectedTextNode(selectionPart, fontFamily))
    .filter(Boolean);

  if (wrappedTextNodes.length === 0) return;

  const nextRange = document.createRange();
  const firstNode = wrappedTextNodes[0];
  const lastNode = wrappedTextNodes[wrappedTextNodes.length - 1];
  nextRange.setStart(firstNode, 0);
  nextRange.setEnd(lastNode, lastNode.nodeValue.length);
  editor.selection.selectRange(nextRange);
  editor.synchronizeValues?.();
}

function getFontFamilyLabel(fontFamily = '') {
  const [firstFont] = fontFamily.split(',');
  return firstFont.replace(/['"]/g, '');
}

const TOOLBAR_ITEMS = [
  "Bold", "Italic", "Underline", "StrikeThrough", "FontName", "FontSize",
  "FontColor", "BackgroundColor", "LowerCase", "UpperCase", "|",
  "Formats", "Alignment", "OrderedList", "UnorderedList", "Outdent", "Indent", "|",
  "hyperlink", "table", "Image", "|",
  "ClearFormat", "SourceCode", "FullScreen", "|",
  "Undo", "Redo", "subscript", "superscript", "delete"
];

function SmartHealthCheckupEditor(
  { value = "", onChange, readonly = false, className = "", toolbarItems = TOOLBAR_ITEMS, hideToolbar = true },
  ref
) {
  const joditRef = useRef(null);
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastEditorValueRef = useRef(null);
  const [internalValue, setInternalValue] = useState(stripBreakHints(value || ""));
  const internalValueRef = useRef(value || "");
  internalValueRef.current = internalValue;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Only react to externally-driven value changes. Skip if the new value came
  // from the editor itself (via onChange or onBlur) to prevent jodit-react from
  // replacing the editor DOM with an echoed-back string, which would destroy the
  // current selection and break mid-flight toolbar operations like font-family.
  useEffect(() => {
    if (
      value !== internalValueRef.current &&
      value !== lastEditorValueRef.current
    ) {
      setInternalValue(stripBreakHints(value || ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // onChange: only notify parent — do NOT update internalValue here.
  // Updating state on every keystroke feeds the new value back into JoditEditor's
  // `value` prop, which causes jodit-react's useEffect([value]) to fire and
  // potentially replace the editor DOM (due to HTML normalisation differences),
  // destroying the active selection before toolbar commands (e.g. font-family) complete.
  const handleEditorChange = useCallback((newContent) => {
    lastEditorValueRef.current = newContent;
    if (onChangeRef.current) {
      onChangeRef.current(newContent);
    }
  }, []);

  // onBlur: safe to update state here — editor has already finished its operation.
  const handleEditorBlur = useCallback((newContent) => {
    lastEditorValueRef.current = newContent;
    setInternalValue(newContent);
    if (onChangeRef.current) {
      onChangeRef.current(newContent);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    getHtml: () => {
      // Read directly from Jodit's live DOM — always current regardless of internalValue.
      if (joditRef.current?.editor) {
        return joditRef.current.editor.value;
      }
      return internalValueRef.current;
    },
    executeCommand: (commandName, valueArg) => {
      if (joditRef.current && joditRef.current.editor) {
        joditRef.current.editor.execCommand(commandName, false, valueArg);
      }
    },
    clearContent: () => {
      setInternalValue("");
    },
  }), []);

  const safeListInsert = useCallback((editor, listType) => {
    const current = editor.selection.current();
    if (!current) {
      editor.execCommand(listType === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
      return;
    }

    let box = current.nodeType === 3 ? current.parentNode : current;
    let tdNode = null;
    while (box && box !== editor.editor) {
      if (box.tagName === 'TD' || box.tagName === 'TH' || (box.classList && box.classList.contains('report-section-box'))) {
        tdNode = box;
        break;
      }
      box = box.parentNode;
    }

    if (tdNode) {
      const hasList = tdNode.querySelector(listType);
      if (hasList) {
        // Toggle OFF: convert all LIs to Ps
        const lis = Array.from(tdNode.querySelectorAll('li'));
        if (lis.length > 0) {
          tdNode.innerHTML = lis.map(li => `<p>${li.innerHTML}</p>`).join('');
        } else {
          tdNode.innerHTML = '<p><br></p>';
        }
      } else {
        const otherListType = listType === 'ul' ? 'ol' : 'ul';
        const hasOtherList = tdNode.querySelector(otherListType);
        if (hasOtherList) {
          // Switch type
          const lis = Array.from(tdNode.querySelectorAll('li'));
          tdNode.innerHTML = `<${listType}>${lis.map(li => `<li>${li.innerHTML}</li>`).join('')}</${listType}>`;
        } else {
          // Convert current content to list
          const pTags = Array.from(tdNode.querySelectorAll('p, div'));
          if (pTags.length > 0) {
            tdNode.innerHTML = `<${listType}>${pTags.map(p => `<li>${p.innerHTML}</li>`).join('')}</${listType}>`;
          } else {
            let inner = tdNode.innerHTML.trim();
            inner = inner.replace(/<span[^>]*data-jodit-selection_marker[^>]*>.*?<\/span>/gi, '');
            if (inner === '' || inner === '<br>' || inner === '&#8203;' || inner === '&ZeroWidthSpace;') {
              inner = '<br>';
            }
            tdNode.innerHTML = `<${listType}><li>${inner}</li></${listType}>`;
          }
        }
      }

      const target = tdNode.querySelector('li, p');
      if (target) {
        editor.selection.setCursorIn(target, false);
      } else {
        editor.selection.setCursorIn(tdNode, false);
      }
      return;
    }

    // Fallback
    editor.execCommand(listType === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  }, []);

  const config = useMemo(() => ({
    readonly: readonly,
    toolbar: !hideToolbar,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    disablePlugins: "resizer,table-keyboard-navigation,add-new-line",
    cleanHTML: {
      fillEmptyParagraph: false,
      replaceNBSP: false,
    },
    buttons: [
      "bold", "italic", "underline", "strikethrough", "font", "fontsize", "brush", "eraser", "uppercase", "lowercase", "|",
      "ul", "ol", "outdent", "indent", "align", "|",
      "link", "table", "image", "|",
      "source", "fullsize", "|",
      "undo", "redo", "superscript", "subscript"
    ],
    width: '100%',
    minHeight: 800,
    height: 'auto',
    style: {
      background: "transparent",
      wordBreak: "normal",
      overflowWrap: "break-word",
      hyphens: "none",
    },
    events: {
      afterPaste: function() {
        const inst = joditRef.current?.editor;
        if (!inst) return;
        // Word embeds soft hyphens (­) and zero-width chars (​/C/D)
        // as invisible word-break hints. They cause text to split at unexpected
        // positions inside Jodit. Strip them from the raw HTML string after paste.
        setTimeout(() => {
          if (!inst) return;
          const current = inst.value;
          if (!current) return;
          const cleaned = stripBreakHints(current);
          if (cleaned !== current) {
            inst.value = cleaned;
          }
        }, 0);
      }
    },
    controls: {
      font: {
        command: 'fontname',
        tooltip: 'Font family',
        list: FONT_FAMILY_OPTIONS,
        textTemplate: (_, value) => getFontFamilyLabel(value),
        childTemplate: (_, key, value) =>
          `<span data-style="${key}" style="font-family: ${key};">${value}</span>`,
        exec: (editor, current, { control }) => {
          if (!control.args || typeof control.args[0] === 'undefined') return false;
          applyFontFamily(editor, control.args[0]);
          return undefined;
        },
        data: {
          cssRule: 'font-family',
          normalize: (value) =>
            value
              .toLowerCase()
              .replace(/['"]+/g, '')
              .replace(/[^a-z0-9-]+/g, ',')
        }
      },
      uppercase: {
        tooltip: 'Upper Case',
        exec: (editor) => applyCase(editor, s => s.toUpperCase())
      },
      lowercase: {
        tooltip: 'Lower Case',
        exec: (editor) => applyCase(editor, s => s.toLowerCase())
      },
      ul: {
        command: 'insertUnorderedList',
        tags: ['ul'],
        tooltip: 'Insert Unordered List',
        exec: (editor) => safeListInsert(editor, 'ul')
      },
      ol: {
        command: 'insertOrderedList',
        tags: ['ol'],
        tooltip: 'Insert Ordered List',
        exec: (editor) => safeListInsert(editor, 'ol')
      }
    }
  }), [readonly, hideToolbar, safeListInsert]);

  return (
    <div ref={containerRef} className={`smart-health-checkup-editor ${className}`} style={{ height: "auto" }}>
      <JoditEditor
        ref={joditRef}
        value={internalValue}
        config={config}
        onBlur={handleEditorBlur}
        onChange={handleEditorChange}
        className="health-checkup-editor__document-body"
      />
    </div>
  );
}

export default React.forwardRef(SmartHealthCheckupEditor);
export { TOOLBAR_ITEMS, applyCase, applyFontFamily };
