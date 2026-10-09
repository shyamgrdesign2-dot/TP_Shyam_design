/** Intro line for the quick clinical snapshot / text_quote card */
export const SITUATION_AT_A_GLANCE_ASSISTANT_TEXT = "Here's the situation at a glance."

/** True for assistant messages that should show inline canned pills directly below their bubble.
 *  Everything else pipes suggestions into the PillBar above the input box instead.
 *  Keep this list tight — only messages that act as an "entry point" belong here. */
export function isSituationAtGlanceAssistantMessage(message) {
  if (message.role !== "assistant") return false

  // Classic "situation at a glance" (text_quote)
  if (
    _optionalChain([message, 'access', _ => _.text, 'optionalAccess', _2 => _2.trim, 'call', _3 => _3()]) === SITUATION_AT_A_GLANCE_ASSISTANT_TEXT &&
    _optionalChain([message, 'access', _4 => _4.rxOutput, 'optionalAccess', _5 => _5.kind]) === "text_quote"
  ) {
    return true
  }

  // Velora entry card only — subsequent Velora messages feed the PillBar.
  if (_optionalChain([message, 'access', _6 => _6.rxOutput, 'optionalAccess', _7 => _7.kind]) === "velora_brief") {
    return true
  }

  return false
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
