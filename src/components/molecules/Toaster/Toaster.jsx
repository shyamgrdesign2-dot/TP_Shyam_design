'use client';

import { Toaster as Sonner } from 'sonner';

/**
 * Brand Sonner toaster — matches the VoiceRxSavingSnackbar spec:
 *   • Solid black pill (rgba(0,0,0,0.92))
 *   • White text, tight sans
 *   • Horizontally centered at the top of the viewport
 *   • No border / no ring
 * Applied globally so every toast (net-drop warnings, success states,
 * etc.) reads as the same surface as our in-app snackbar.
 */
const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      toastOptions={{
        // All app snackbars share the same spec: solid black pill, white
        // text, NO outer shadow, no border / ring. Defaults apply to
        // success / error / warning / info alike so a green Sonner
        // success toast never leaks through.
        classNames: {
          toast:
          'group toast !bg-black !text-white !border-0 !shadow-none !rounded-full !px-[18px] !py-[10px] !text-[14px] !font-medium !backdrop-blur-0',
          title: '!text-white !text-[14px] !font-medium !leading-none',
          description: '!text-white/80 !text-[12px] !mt-[2px]',
          actionButton: '!bg-white/15 !text-white',
          cancelButton: '!bg-white/10 !text-white/80',
          closeButton: '!bg-transparent !text-white/70 !border-0',
          success:
          '!bg-black !text-white !border-0 !shadow-none',
          error:
          '!bg-black !text-white !border-0 !shadow-none',
          warning:
          '!bg-black !text-white !border-0 !shadow-none',
          info:
          '!bg-black !text-white !border-0 !shadow-none'
        }
      }}
      style={
      {
        '--normal-bg': 'rgba(0,0,0,0.92)',
        '--normal-text': '#ffffff',
        '--normal-border': 'transparent',
        '--success-bg': 'rgba(0,0,0,0.92)',
        '--success-text': '#ffffff',
        '--success-border': 'transparent',
        '--error-bg': 'rgba(0,0,0,0.92)',
        '--error-text': '#ffffff',
        '--error-border': 'transparent',
        '--warning-bg': 'rgba(0,0,0,0.92)',
        '--warning-text': '#ffffff',
        '--warning-border': 'transparent'
      }
      }
      {...props} />);


};

export { Toaster };