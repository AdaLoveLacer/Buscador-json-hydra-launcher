"use client"

import Home from "@/app/page"
import ThemeSelector from "./theme-selector"

export default function HomeWrapper() {
  return (
    <>
      <ThemeSelector />
      <Home />
    </>
  )
}
