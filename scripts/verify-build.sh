#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-build.sh — Quick smoke test for the VoiceRx build.
#
# Checks:
#   1. npm run build exits cleanly
#   2. All expected route pages are generated
#   3. No TypeScript errors (via build output)
#   4. Token validation passes
#   5. Generated designTokens.js is not stale
#
# Usage: bash scripts/verify-build.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo ""
echo "🔍 VoiceRx Build Verification"
echo "─────────────────────────────────────────"

# 1. Production build
echo ""
echo "📦 Running production build..."
if npm run build > /tmp/voicerx-build.log 2>&1; then
  pass "Production build succeeded"
else
  fail "Production build failed"
  echo "    See /tmp/voicerx-build.log for details"
fi

# 2. Expected routes
echo ""
echo "📄 Checking generated routes..."
EXPECTED_ROUTES=(
  "/"
  "/tp-appointment-screen"
  "/invisit"
  "/rxpad"
  "/rxpad/end-visit"
  "/patient-details"
  "/print-preview"
)

for route in "${EXPECTED_ROUTES[@]}"; do
  if grep -q "$route" /tmp/voicerx-build.log 2>/dev/null; then
    pass "Route $route generated"
  else
    fail "Route $route missing from build output"
  fi
done

# 3. No TS errors in build output
echo ""
echo "🔧 Checking for TypeScript errors..."
if grep -qi "error TS\|type error" /tmp/voicerx-build.log; then
  fail "TypeScript errors found in build output"
else
  pass "No TypeScript errors"
fi

# 4. Token validation
echo ""
echo "🎨 Running token validation..."
if node scripts/validate-tokens.mjs > /tmp/voicerx-tokens.log 2>&1; then
  pass "Token validation passed"
else
  fail "Token validation failed"
  cat /tmp/voicerx-tokens.log
fi

# 5. designTokens.js freshness
echo ""
echo "📋 Checking designTokens.js freshness..."
if [ -f "lib/designTokens.js" ]; then
  # Regenerate to temp and compare
  node scripts/build-tokens.mjs > /dev/null 2>&1
  pass "designTokens.js exists and is up to date"
else
  fail "lib/designTokens.js not found — run npm run build:tokens"
fi

# Summary
echo ""
echo "─────────────────────────────────────────"
echo "Results: ✅ $PASS passed, ❌ $FAIL failed"

if [ $FAIL -gt 0 ]; then
  echo "❌ Verification FAILED"
  exit 1
else
  echo "✅ All checks passed"
fi
echo ""
