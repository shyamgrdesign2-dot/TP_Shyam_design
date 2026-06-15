# VoiceBar — Global Dictation Shortcut

A floating Whisper/Superwhisper-style dictation strip available anywhere
in the app. The clinician double-taps Shift, speaks naturally, and the
final transcript is routed either into the focused input or to the
clipboard.

**Status:** Shipped. Globally mounted in `src/app/layout.jsx`.

---

## How it works for the doctor

| Action | What happens |
|---|---|
| **Double-tap Shift** (within 400ms) | Bar slides up from the bottom-centre, mic starts recording, wave bars react to volume, live transcript scrolls inline. |
| **Click ✓ or press Enter** | Final transcript routes to the destination (see below). Bar closes. |
| **Click X or press Esc** | Bar closes. Nothing routed. The caret returns to wherever it was before the bar opened. |
| **Double-tap Shift again while open** | Bar closes (same as Esc). |

### Destination routing

When the doctor accepts (`✓` / `Enter`):

1. **Focused `<input>` / `<textarea>`** → inserts the transcript at the
   current selection range. Existing text is preserved; a separating
   space is added when stitching into mid-sentence text. The native
   value setter is used so React-controlled inputs see the update via
   the `input` event.
2. **Focused `contenteditable`** → `document.execCommand("insertText")`
   does the same job for rich-text surfaces (TipTap, etc.).
3. **Nothing focused** → copies the transcript to the clipboard and
   fires a `voice-bar:no-target` `CustomEvent` on `window`. A
   `toast.success("Copied dictation to clipboard")` confirms. Any
   feature that wants to listen for this event and route the text
   somewhere bespoke can.

The "focus we captured on open" is the `document.activeElement` at the
moment the bar opened — not the activeElement at the moment of accept
(which would be the ✓ button itself).

---

## How it works in code

```
src/components/organisms/voice-bar/
  voice-bar-context.jsx   ← VoiceBarProvider + useVoiceBar() hook
                              + window-level keydown listener (double-Shift,
                              Esc) + routing logic.
  VoiceBar.jsx            ← The visible bar. Mounts to document.body via
                              createPortal. Web Speech recognition + a
                              mic-amplitude analyser feeding the wave bars.
  VoiceBar.module.scss    ← Styles. Tokens via var(--tp-*). Even-pixel
                              sizing. 36px touch targets, brand-violet
                              gradient on ✓, slate-100 on X.
  index.js                  ← Barrel.
```

### Mounting

Mounted once at the app root in `src/app/layout.jsx`:

```jsx
<VoiceBarProvider>
  {children}
  <VoiceBar />
</VoiceBarProvider>
```

The provider attaches **one** window-level keydown listener for the whole
app — no per-mount listeners.

### Public hook

```js
import { useVoiceBar } from "@/src/components/organisms/voice-bar";

const { isOpen, open, close, route } = useVoiceBar();
```

`route(text)` exists for callers that want to programmatically push a
transcript through the same destination logic without using the bar UI.
Returns `"input" | "editable" | "clipboard" | "empty"` so the caller can
show the right confirmation.

### Listening for the no-target signal

If you want a custom fallback instead of the default clipboard + toast:

```js
useEffect(() => {
  const onNoTarget = (e) => {
    const { text } = e.detail;
    // open a custom modal, write somewhere specific, etc.
  };
  window.addEventListener("voice-bar:no-target", onNoTarget);
  return () => window.removeEventListener("voice-bar:no-target", onNoTarget);
}, []);
```

---

## Design contract

- **Position:** bottom-centre of the viewport, `max-width: 720px`, 16px
  side padding, 24px from the bottom edge.
- **Sizing:** strictly even pixels (12 / 14 / 16 / 20 / 24 / 28 / 36 / 44).
- **Colours:** all `var(--tp-*)` for slate/text + `var(--ai-pink/violet/indigo)`
  for the brand gradient on the ✓ and wave bars.
- **Animations:** spring-curve slide-in (`cubic-bezier(0.22, 1, 0.36, 1)`,
  360ms). Mic pulse (1.8s infinite). Wave bars transition height at
  80ms linear to smooth between rAF samples. All animations honour
  `prefers-reduced-motion: reduce`.
- **A11y:** `role="region"` on the host, `role="dialog" aria-modal="false"`
  on the bar (it doesn't trap focus — clinician can still interact with
  the page), `aria-live="polite"` on the transcript line.

---

## Limitations / future work

- **Browser support:** Web Speech API only. Chrome/Safari/Edge work;
  Firefox shows a "speech recognition isn't supported" inline message.
- **Single language:** hard-coded to `en-US`. Future: read the doctor's
  preferred dictation locale from settings.
- **No partial-word insertion:** the bar inserts on accept, not as you
  speak. Adding "live insertion" mode is a single state flag away if
  product wants it.
- **No undo memory:** if the doctor accepts into the wrong field, they
  use the field's own native undo. We don't keep our own history.
