'use client'

import { useId, useState } from 'react'

/** Format digits as (XXX) XXX-XXXX; max 10 digits. */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Strip to digits only for storage/validation. */
export function phoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

type Props = {
  name: string
  placeholder?: string
  defaultValue?: string
  className?: string
  id?: string
  required?: boolean
}

export function PhoneInput({ name, placeholder = '(555) 123-4567', defaultValue = '', className, id: propId, required }: Props) {
  const fallbackId = useId()
  const id = propId ?? fallbackId
  const [value, setValue] = useState(defaultValue ? formatPhone(defaultValue) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = formatPhone(e.target.value)
    setValue(next)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const key = e.key
    if (key === 'Backspace' || key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Delete') return
    if (e.ctrlKey || e.metaKey) return
    if (!/^\d$/.test(key)) e.preventDefault()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 10)
    setValue(formatPhone(pasted))
  }

  return (
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      id={id}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={className}
      maxLength={14}
      required={required}
    />
  )
}
