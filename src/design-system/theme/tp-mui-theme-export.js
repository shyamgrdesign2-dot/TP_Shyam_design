/**
 * TatvaPractice MUI Theme
 *
 * Full theme customization wrapping Material UI with TP foundational tokens.
 * Architecture: MUI Base → TP Theme Layer → TP Wrapped Components
 *
 * @see lib/design-tokens.ts for token definitions
 * @see https://mui.com/material-ui/customization/theming/
 */

import { createTheme, alpha } from "@mui/material/styles";

// ─── Color palette from design tokens ───

const tpBlue = {
  50: "#EEEEFF",
  100: "#D8D8FA",
  200: "#B5B4F2",
  300: "#8E8DE8",
  400: "#6C6BDE",
  500: "#4B4AD5",
  600: "#3C3BB5",
  700: "#2E2D96",
  800: "#212077",
  900: "#161558"
};

const tpSlate = {
  0: "#FFFFFF",
  50: "#FAFAFB",
  100: "#F1F1F5",
  200: "#E2E2EA",
  300: "#D0D5DD",
  400: "#A2A2A8",
  500: "#717179",
  600: "#545460",
  700: "#454551",
  800: "#2C2C35",
  900: "#171725"
};

const tpViolet = {
  500: "#A461D8",
  600: "#8A4DBB"
};

const tpSuccess = {
  500: "#10B981",
  600: "#059669"
};

const tpWarning = {
  500: "#F59E0B",
  600: "#D97706"
};

const tpError = {
  500: "#E11D48",
  600: "#C8102E"
};

// ─── Shadows from design-tokens shadowScale ───

const shadows = [
"none",
"0 1px 2px 0 rgba(23,23,37,0.04)",
"0 1px 3px 0 rgba(23,23,37,0.08), 0 1px 2px -1px rgba(23,23,37,0.06)",
"0 4px 8px -2px rgba(23,23,37,0.08), 0 2px 4px -2px rgba(23,23,37,0.06)",
"0 12px 24px -4px rgba(23,23,37,0.08), 0 4px 8px -4px rgba(23,23,37,0.04)",
"0 20px 40px -8px rgba(23,23,37,0.12), 0 8px 16px -6px rgba(23,23,37,0.06)",
"0 32px 64px -12px rgba(23,23,37,0.20)",
"0 0 0 3px #B5B4F2",
"0 0 0 3px #FDA4AF",
"0 0 0 3px #D0D5DD",
"none", "none", "none", "none", "none", "none", "none", "none", "none", "none",
"none", "none", "none", "none", "none", "none"];


export const tpTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: tpBlue[500],
      light: tpBlue[300],
      dark: tpBlue[700],
      contrastText: tpSlate[0]
    },
    secondary: {
      main: tpViolet[500],
      light: "#C89FE7",
      dark: tpViolet[600],
      contrastText: tpSlate[0]
    },
    success: {
      main: tpSuccess[500],
      light: "#6EE7B7",
      dark: tpSuccess[600]
    },
    warning: {
      main: tpWarning[500],
      light: "#FCD34D",
      dark: tpWarning[600]
    },
    error: {
      main: tpError[500],
      light: "#FDA4AF",
      dark: tpError[600]
    },
    background: {
      default: tpSlate[100],
      paper: tpSlate[0]
    },
    text: {
      primary: tpSlate[900],
      secondary: tpSlate[700],
      disabled: tpSlate[400]
    },
    divider: tpSlate[200],
    action: {
      active: tpSlate[500],
      hover: alpha(tpBlue[500], 0.08),
      selected: alpha(tpBlue[500], 0.12),
      disabled: tpSlate[400],
      disabledBackground: tpSlate[100]
    }
  },
  typography: {
    fontFamily: 'Inter, Mulish, -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontFamily: "Mulish, var(--font-heading), sans-serif",
      fontWeight: 700,
      fontSize: "2.25rem", // 36px
      lineHeight: 1.22,
      letterSpacing: "-0.02em"
    },
    h2: {
      fontFamily: "Mulish, var(--font-heading), sans-serif",
      fontWeight: 600,
      fontSize: "1.875rem", // 30px
      lineHeight: 1.27,
      letterSpacing: "-0.01em"
    },
    h3: {
      fontFamily: "Mulish, var(--font-heading), sans-serif",
      fontWeight: 600,
      fontSize: "1.5rem", // 24px
      lineHeight: 1.33
    },
    h4: {
      fontFamily: "Mulish, var(--font-heading), sans-serif",
      fontWeight: 600,
      fontSize: "1.25rem", // 20px
      lineHeight: 1.4
    },
    h5: {
      fontFamily: "Mulish, var(--font-heading), sans-serif",
      fontWeight: 600,
      fontSize: "1rem", // 16px
      lineHeight: 1.5
    },
    h6: {
      fontFamily: "Mulish, var(--font-heading), sans-serif",
      fontWeight: 600,
      fontSize: "0.875rem", // 14px
      lineHeight: 1.43,
      letterSpacing: "0.01em"
    },
    body1: {
      fontFamily: "Inter, sans-serif",
      fontSize: "1rem",
      lineHeight: 1.5
    },
    body2: {
      fontFamily: "Inter, sans-serif",
      fontSize: "0.875rem",
      lineHeight: 1.43
    },
    button: {
      fontFamily: "Inter, sans-serif",
      fontWeight: 600,
      fontSize: "0.875rem",
      lineHeight: 1.43
    },
    caption: {
      fontFamily: "Inter, sans-serif",
      fontSize: "0.75rem",
      fontWeight: 500,
      lineHeight: 1.33,
      letterSpacing: "0.01em"
    }
  },
  shape: {
    borderRadius: 10 // CTA spec, cards; TP radius-10
  },
  shadows,
  spacing: 8, // 8px base grid
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "Inter, var(--font-sans), sans-serif"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: false
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: "0.875rem",
          padding: "8px 14px",
          minHeight: 42
        },
        contained: {
          "&:hover": {
            backgroundColor: tpBlue[600]
          },
          "&:active": {
            backgroundColor: tpBlue[700]
          }
        },
        outlined: {
          borderWidth: 1.5,
          "&:hover": {
            borderWidth: 1.5,
            backgroundColor: tpBlue[50]
          }
        },
        sizeSmall: {
          minHeight: 36,
          padding: "6px 12px",
          fontSize: "0.8125rem"
        },
        sizeLarge: {
          minHeight: 48,
          padding: "10px 20px"
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: alpha(tpBlue[500], 0.08)
          }
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "medium"
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: tpSlate[0],
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: tpSlate[300]
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 2,
              borderColor: tpBlue[500],
              boxShadow: "0 0 0 3px rgba(75,74,213,0.2)"
            },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: tpError[500]
            }
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: tpSlate[200]
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.875rem"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: shadows[2],
          border: `1px solid ${tpSlate[200]}`,
          "&:hover": {
            boxShadow: shadows[3]
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${tpSlate[200]}`,
          boxShadow: shadows[2]
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          fontSize: "0.75rem"
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: shadows[5],
          border: `1px solid ${tpSlate[200]}`
        }
      }
    },
    MuiModal: {
      styleOverrides: {
        backdrop: {
          backgroundColor: "rgba(23,23,37,0.5)"
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: tpBlue[500],
          height: 3,
          borderRadius: "3px 3px 0 0"
        },
        root: {
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem"
          },
          "& .Mui-selected": {
            color: tpBlue[500]
          }
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none"
        }
      }
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          color: tpSlate[400],
          "&.Mui-checked": {
            color: tpBlue[500]
          },
          "&.Mui-focusVisible": {
            borderRadius: 4,
            boxShadow: `0 0 0 3px ${alpha(tpBlue[500], 0.2)}`
          }
        }
      }
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: tpSlate[400],
          "&.Mui-checked": {
            color: tpBlue[500]
          }
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          "& .MuiSwitch-switchBase.Mui-checked": {
            color: tpBlue[500]
          },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: tpBlue[500]
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: tpBlue[50]
          },
          "&.Mui-selected": {
            backgroundColor: tpBlue[50],
            "&:hover": {
              backgroundColor: alpha(tpBlue[500], 0.12)
            }
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: tpSlate[200],
          fontSize: "0.875rem"
        },
        head: {
          fontWeight: 600,
          backgroundColor: tpSlate[50],
          color: tpSlate[900]
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: tpSlate[50]
          }
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500
        },
        standardSuccess: {
          backgroundColor: "#ECFDF5",
          color: "#047857"
        },
        standardWarning: {
          backgroundColor: "#FFFBEB",
          color: "#B45309"
        },
        standardError: {
          backgroundColor: "#FFF1F2",
          color: "#9F1239"
        },
        standardInfo: {
          backgroundColor: tpBlue[50],
          color: tpBlue[700]
        }
      }
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "& .MuiPaper-root": {
            borderRadius: 8,
            boxShadow: shadows[3]
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          fontSize: "0.75rem",
          fontWeight: 500
        }
      }
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          fontSize: "0.625rem"
        }
      }
    },
    MuiProgress: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          backgroundColor: tpSlate[200]
        },
        bar: {
          borderRadius: 9999
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          backgroundColor: tpSlate[200]
        },
        bar: {
          borderRadius: 9999
        }
      }
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: tpSlate[200]
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: tpBlue[200],
          color: tpBlue[700],
          fontWeight: 600
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: tpSlate[200]
        }
      }
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          "& .MuiLink-root": {
            color: tpBlue[500],
            fontWeight: 500,
            "&:hover": {
              color: tpBlue[600],
              textDecoration: "underline"
            }
          }
        }
      }
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          "& .MuiPaginationItem-root": {
            fontWeight: 500,
            "&.Mui-selected": {
              backgroundColor: tpBlue[500],
              color: tpSlate[0]
            }
          }
        }
      }
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          border: `1px solid ${tpSlate[200]}`,
          "&:before": { display: "none" },
          "&.Mui-expanded": {
            margin: 0
          }
        }
      }
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.875rem"
        }
      }
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: tpBlue[500],
          "& .MuiSlider-thumb": {
            "&:hover, &.Mui-focusVisible": {
              boxShadow: `0 0 0 6px ${alpha(tpBlue[500], 0.16)}`
            }
          }
        }
      }
    }
  }
});