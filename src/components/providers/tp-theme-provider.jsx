"use client";

import { ThemeProvider } from "@mui/material/styles";
import { tpTheme } from "@/src/design-system/theme/tp-mui-theme-export";

// Note: `<CssBaseline />` was previously rendered here. It was removed
// because emotion's global-style injection (it emits a
// `<style data-emotion="css-global …">` element into the React tree)
// drifts position between SSR and client hydration, producing recurring
// hydration mismatches on routes that mount client-only subtrees
// (e.g. /rxpad/voice). The app's CSS reset / typography baseline is
// already provided by `src/app/globals.css` and the design-system base
// stylesheet, so CssBaseline is redundant here.
export function TPThemeProvider({ children }) {
  return (
    <ThemeProvider theme={tpTheme}>
      {children}
    </ThemeProvider>);

}