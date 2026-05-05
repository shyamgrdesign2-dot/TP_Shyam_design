"use client";

import { useEffect, useState } from "react";
import { Like1, Dislike, TickCircle } from "iconsax-reactjs";
import { cn } from "@/src/hooks/utils";
import { Snackbar as TPSnackbar } from "@/src/components/molecules/Snackbar";
import { FeedbackBottomSheet } from "../shell/FeedbackBottomSheet";







export function FeedbackRow({ messageId, initialFeedback, onFeedback }) {
  const [feedback, setFeedback] = useState(initialFeedback ?? null);
  const [downSheetOpen, setDownSheetOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    setFeedback(initialFeedback ?? null);
  }, [initialFeedback]);

  const handleUp = () => {
    if (!onFeedback) return;
    setDownSheetOpen(false);
    if (feedback === "up") return;
    setFeedback("up");
    onFeedback(messageId, "up");
  };

  /** Down selects immediately; optional sheet. Tapping down again while already down reopens the sheet */
  const handleDownClick = () => {
    if (!onFeedback) return;
    if (feedback === "down") {
      setDownSheetOpen(true);
      return;
    }
    setFeedback("down");
    onFeedback(messageId, "down");
    setDownSheetOpen(true);
  };

  const handleDownSheetClose = () => {
    setDownSheetOpen(false);
  };

  const handleDownSubmit = (_comment) => {
    setDownSheetOpen(false);
    setSnackbarOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-[4px]">
        <button
          type="button"
          onClick={handleUp}
          disabled={!onFeedback}
          className={cn(
            "flex h-[20px] w-[20px] items-center justify-center rounded transition-all",
            feedback === "up" && "text-tp-success-500",
            feedback === "down" && "text-tp-slate-300 hover:text-tp-success-500",
            feedback === null && "text-tp-slate-400 hover:text-tp-success-500"
          )}>
          
          <Like1 size={14} variant={feedback === "up" ? "Bold" : "Linear"} />
        </button>
        <button
          type="button"
          onClick={handleDownClick}
          disabled={!onFeedback}
          className={cn(
            "flex h-[20px] w-[20px] items-center justify-center rounded transition-all",
            feedback === "down" && "text-tp-error-500",
            feedback === "up" && "text-tp-slate-300 hover:text-tp-error-500",
            feedback === null && "text-tp-slate-400 hover:text-tp-error-500"
          )}>
          
          <Dislike size={14} variant={feedback === "down" ? "Bold" : "Linear"} />
        </button>
      </div>

      <FeedbackBottomSheet isOpen={downSheetOpen} onClose={handleDownSheetClose} onSubmit={handleDownSubmit} />

      <TPSnackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={2800}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setSnackbarOpen(false);
        }}
        message={
        <div
          className="flex max-w-[min(400px,calc(100vw-32px))] items-center gap-2.5 rounded-[12px] px-4 py-3 text-[14px] font-medium leading-snug text-white shadow-lg"
          style={{
            background: "#171725",
            boxShadow: "0 12px 24px rgba(23,23,37,0.15)"
          }}>
          
            <TickCircle size={20} variant="Bold" className="shrink-0 text-emerald-400" aria-hidden />
            <span>Feedback received</span>
          </div>
        } />
      
    </>);

}