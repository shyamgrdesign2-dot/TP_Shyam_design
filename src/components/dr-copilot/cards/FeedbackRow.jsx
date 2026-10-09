import { useEffect, useState } from "react"
import { cn } from "../../dr-agent/utils"
import { TPSnackbar } from "../compat/tp-ui"
import { FeedbackBottomSheet } from "../shell/FeedbackBottomSheet"
import { CopilotIcon } from "../ui/CopilotIcon"

export function FeedbackRow({ messageId, initialFeedback, onFeedback }) {
  const [feedback, setFeedback] = useState(_nullishCoalesce(initialFeedback, () => ( null)))
  const [downSheetOpen, setDownSheetOpen] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  useEffect(() => {
    setFeedback(_nullishCoalesce(initialFeedback, () => ( null)))
  }, [initialFeedback])

  const handleUp = () => {
    if (!onFeedback) return
    setDownSheetOpen(false)
    if (feedback === "up") return
    setFeedback("up")
    onFeedback(messageId, "up")
  }

  /** Down selects immediately; optional sheet. Tapping down again while already down reopens the sheet */
  const handleDownClick = () => {
    if (!onFeedback) return
    if (feedback === "down") {
      setDownSheetOpen(true)
      return
    }
    setFeedback("down")
    onFeedback(messageId, "down")
    setDownSheetOpen(true)
  }

  const handleDownSheetClose = () => {
    setDownSheetOpen(false)
  }

  const handleDownSubmit = (_comment) => {
    setDownSheetOpen(false)
    setSnackbarOpen(true)
  }

  return (
    <>
      <div className="flex items-center gap-[4px]">
        <button
          type="button"
          onClick={handleUp}
          disabled={!onFeedback}
          className={cn(
            "flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-all",
            feedback === "up" && "text-tp-success-500",
            feedback === "down" && "text-tp-slate-300 hover:text-tp-success-500",
            feedback === null && "text-tp-slate-400 hover:text-tp-success-500",
          )}
        >
          <CopilotIcon asset="support-like-question/like" size={15} variant={feedback === "up" ? "bulk" : "linear"} />
        </button>
        <button
          type="button"
          onClick={handleDownClick}
          disabled={!onFeedback}
          className={cn(
            "flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-all",
            feedback === "down" && "text-tp-error-500",
            feedback === "up" && "text-tp-slate-300 hover:text-tp-error-500",
            feedback === null && "text-tp-slate-400 hover:text-tp-error-500",
          )}
        >
          <CopilotIcon asset="support-like-question/dislike" size={15} variant={feedback === "down" ? "bulk" : "linear"} />
        </button>
      </div>

      <FeedbackBottomSheet isOpen={downSheetOpen} onClose={handleDownSheetClose} onSubmit={handleDownSubmit} />

      <TPSnackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={2800}
        onClose={(_, reason) => {
          if (reason === "clickaway") return
          setSnackbarOpen(false)
        }}
        message={
          <div
            className="flex max-w-[min(400px,calc(100vw-32px))] items-center gap-2.5 rounded-[12px] px-4 py-3 text-[14px] font-medium leading-snug text-white shadow-lg"
            style={{
              background: "#171725",
              boxShadow: "0 12px 24px rgba(23,23,37,0.15)",
            }}
          >
            <CopilotIcon name="tick-circle" size={20} variant="bulk" className="shrink-0 text-tp-success-500" />
            <span>Feedback received</span>
          </div>
        }
      />
    </>
  )
}

/* eslint-disable no-unused-expressions -- sucrase-generated runtime helpers */
function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
