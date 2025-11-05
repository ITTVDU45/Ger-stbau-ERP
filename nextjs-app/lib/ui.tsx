"use client"

import React from 'react'
import colors from './theme/colors'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', children, ...rest }: ButtonProps) {
  const base: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: 'transform .12s ease, box-shadow .12s ease, opacity .12s ease'
  }

  const styles: React.CSSProperties = variant === 'primary' ? {
    ...base,
    background: colors.primary.main,
    color: colors.text.onPrimary,
    boxShadow: colors.shadows.sm,
    borderRadius: 12,
    padding: '10px 18px'
  } : {
    ...base,
    background: 'transparent',
    color: colors.secondary.main,
    border: `1px solid rgba(0,0,0,0.06)`,
    padding: '8px 14px'
  }

  return <button style={styles} {...rest}>{children}</button>
}

export function Card({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 18, boxShadow: colors.shadows.md, ...style }}>
      {children}
    </div>
  )
}

export default { Button, Card }


