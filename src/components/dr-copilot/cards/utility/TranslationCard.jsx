import { tesseractIcon } from "../../ui/tesseractIcon"
import { CardShell } from "../CardShell"

/* Tesseract icons under their old iconsax names (see ui/tesseractIcon). */
const Translate = tesseractIcon("translate")

export function TranslationCard({
  data,
  onCopy,
  onPillTap,
}) {
  return (
    <CardShell
      icon={<Translate size={14} variant="Bulk" />}
      title={data.targetLanguage}
      copyAll={() => _optionalChain([onCopy, 'optionalCall', _ => _(data.copyPayload)])}
      copyAllTooltip="Fill translation to RxPad"

    >
      {/* Source text */}
      <div className="mb-2">
        <div className="mb-[2px] text-[12px] font-medium tracking-wide text-tp-slate-400">
          {data.sourceLanguage}
        </div>
        <div className="rounded-[6px] bg-tp-slate-50 px-2 py-[5px] text-[14px] leading-[1.6] text-tp-slate-600">
          {data.sourceText}
        </div>
      </div>

      {/* Translated text */}
      <div>
        <div className="mb-[2px] text-[12px] font-medium tracking-wide text-tp-success-600">
          {data.targetLanguage}
        </div>
        <div className="rounded-[6px] bg-tp-success-50 px-2 py-[5px] text-[14px] leading-[1.6] text-tp-success-700">
          {data.translatedText}
        </div>
      </div>
    </CardShell>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
