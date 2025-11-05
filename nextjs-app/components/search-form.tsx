"use client"

import React, { useState } from "react"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SearchForm() {
  const [query, setQuery] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // For now, just keep the query in state. Integrate with search later.
    // This keeps the component self-contained and usable by the sidebar.
    console.log("Search:", query)
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex w-full gap-2">
      <label htmlFor="sidebar-search" className="sr-only">
        Suche
      </label>
      <Input
        id="sidebar-search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suche..."
        className="min-w-0"
      />
      <Button type="submit" variant="ghost" size="icon" aria-label="Search">
        <SearchIcon className="h-4 w-4" />
      </Button>
    </form>
  )
}


