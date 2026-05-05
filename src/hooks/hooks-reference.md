# Hooks reference

> **Scope:** every shared, layer-agnostic hook + utility in `src/hooks/` (`cn`, mobile, touch-device, toast).
> **Audience:** frontend devs (the canonical list — don't reinvent), AI assistants (use these helpers instead of generating new ones).
> **Read when:** building any component that needs classnames, viewport / device detection, or a toast.
> **Sibling docs:** [`../components/component-library.md`](../components/component-library.md) (where these hooks are imported from).

Cross-layer utilities. Anything in `src/components/{atoms,molecules,organisms}` may import from here.

## Files

| File | Export(s) | Purpose |
|---|---|---|
| `utils.js` | `cn(...)` | Classname helper — combines `clsx` + `tailwind-merge`. **The single classname utility used across the project.** Always use this; do not bring in `classnames` or other variants. |
| `use-mobile.js` | `useIsMobile()` | Boolean — viewport width is mobile (< 640 px). Hydration-safe (returns false on SSR). |
| `use-touch-device.js` | `useIsTouchDevice()` | Boolean — primary input is touch (matches `(pointer: coarse)`). |
| `use-toast.js` | `useToast()` | Sonner toast wrapper — small façade around `toast()` so consumers don't import sonner directly. |

## Usage

```jsx
import { cn } from "@/src/hooks/utils";
import { useIsMobile } from "@/src/hooks/use-mobile";

const isMobile = useIsMobile();

return (
  <div className={cn(
    "rounded-[12px] p-[16px]",
    isMobile && "rounded-[10px] p-[12px]",
    className,
  )} />
);
```

## When to add a new hook here

Add to `src/hooks/` only if:
1. The hook is **layer-agnostic** (used by atoms AND molecules AND organisms), or
2. It's a **classname / DOM / device utility** with no domain coupling.

If a hook reads from `useRxPadSync()`, knows about prescriptions, or
otherwise carries domain knowledge, it belongs in
`src/components/organisms/<feature>/` next to the feature it serves.

## Cross-references

- `../components/component-library.md` — atomic-design layering rules.
- Sonner docs (https://sonner.emilkowal.ski/) — for the toast API.
