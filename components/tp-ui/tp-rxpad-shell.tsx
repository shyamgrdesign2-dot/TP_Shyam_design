"use client"

import React from "react"

import { CustomiseProvider } from "@/components/tp-rxpad/customise-context"
import {
  SaveTemplateSidebar,
  TemplateProvider,
  TemplatesListSidebar,
} from "@/components/tp-rxpad/templates"

interface TPRxPadShellProps {
  topNav: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function TPRxPadShell({ topNav, sidebar, children }: TPRxPadShellProps) {
  return (
    <CustomiseProvider>
      <TemplateProvider>
        <div className="flex min-h-screen flex-col bg-tp-slate-100" data-tp-slide-in>
          {topNav}
          <div className="flex h-[calc(100vh-62px)] overflow-hidden">
            <aside className="h-full shrink-0">{sidebar}</aside>
            <main className="min-w-0 flex-1 overflow-auto bg-tp-slate-100">{children}</main>
          </div>
        </div>
        {/* Template sidebars — mounted at the shell so opening from any
            module overlays everything. */}
        <SaveTemplateSidebar />
        <TemplatesListSidebar />
      </TemplateProvider>
    </CustomiseProvider>
  )
}
