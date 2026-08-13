'use client'
import { useState, useEffect, useRef } from 'react'

// Kullanıcı yazarken anında "225.000" gibi binlik ayraçlı gösterir,
// ama dışarıya (onChange) her zaman düz sayı (225000) verir.
// type="number" input'ların yerine bunu kullanın.
export default function SayiInput({
  value, onChange, placeholder, min, step, className, style, autoFocus,
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  min?: number
  step?: number
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
}) {
  const [metin, setMetin] = useState('')
  const odaklandi = useRef(false)

  useEffect(() => {
    if (!odaklandi.current) setMetin(value ? formatla(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function formatla(n: number) {
    const parcalar = n.toString().split('.')
    parcalar[0] = parcalar[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return parcalar.join(',')
  }

  function parseEt(s: string): number {
    // "225.000,50" -> 225000.50
    const temiz = s.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(temiz)
    return isNaN(n) ? 0 : n
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      className={className}
      style={style}
      placeholder={placeholder}
      value={metin}
      onFocus={() => { odaklandi.current = true }}
      onBlur={() => { odaklandi.current = false; setMetin(value ? formatla(value) : '') }}
      onChange={e => {
        const ham = e.target.value
        // Sadece rakam, nokta ve virgüle izin ver
        if (!/^[\d.,]*$/.test(ham)) return
        setMetin(ham)
        onChange(parseEt(ham))
      }}
    />
  )
}
