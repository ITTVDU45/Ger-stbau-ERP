"use client"

import React from "react"

export function VersionSwitcher({
  versions,
  defaultVersion,
}: {
  versions: string[]
  defaultVersion?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Version"
        defaultValue={defaultVersion}
        className="rounded-md border px-2 py-1 text-sm"
      >
        {versions.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  )
}


