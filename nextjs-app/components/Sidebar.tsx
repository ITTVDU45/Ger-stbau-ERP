"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"

export default function Sidebar(props: React.ComponentProps<typeof AppSidebar>) {
  // Delegate to shadcn-provided AppSidebar (keeps legacy import path working)
  return <AppSidebar {...props} />
}


