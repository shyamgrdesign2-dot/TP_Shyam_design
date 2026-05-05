"use client";






export function SidebarLink({ text, onClick }) {
  // Strip any trailing arrow characters from text (→, \u2192, etc.)
  const cleanText = text.replace(/[\s]*[→\u2192\u279C\u2794]+[\s]*$/g, "").trim();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group/link inline-flex h-[36px] items-center gap-[4px] rounded-[10px] px-2 text-left text-[14px] font-medium text-tp-blue-500 transition-all hover:bg-tp-blue-50/60 hover:text-tp-blue-600">
      
      <span className="group-hover/link:underline">{cleanText}</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        className="flex-shrink-0 transition-transform duration-200 group-hover/link:translate-x-[2px]">
        
        <path
          d="M6 3L11 8L6 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round" />
        
      </svg>
    </button>);

}