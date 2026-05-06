"use client";

import { useEffect, useState } from "react";
import { Like1, Dislike } from "iconsax-reactjs";
import { cn } from "@/src/hooks/utils";
import { toast } from "@/src/components/molecules/Toaster";
import { FeedbackBottomSheet } from "../shell/FeedbackBottomSheet";







export function FeedbackRow({ messageId, initialFeedback, onFeedback }) {
  const [feedback, setFeedback] = useState(initialFeedback ?? null);
  const [downSheetOpen, setDownSheetOpen] = useState(false);

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
    toast.success("Thanks — feedback submitted");
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
    </>);

}