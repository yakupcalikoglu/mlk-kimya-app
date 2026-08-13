'use client'
import { useState, useRef, useEffect } from 'react'

interface ItemProps {
  onClick: () => void
  ikon?: string
  tehlikeli?: boolean
  children: React.ReactNode
}

function Item({ onClick, ikon, tehlikeli, children }: ItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '9px 13px', border: 'none', background: 'none', cursor: 'pointer',
        fontSize: 13, textAlign: 'left', borderRadius: 6, whiteSpace: 'nowrap',
        color: tehlikeli ? 'var(--r)' : 'var(--tx)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = tehlikeli ? 'var(--rbg)' : 'var(--surf2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {ikon && <span style={{ fontSize: 14 }}>{ikon}</span>}
      {children}
    </button>
  )
}

export default function IslemlerMenu({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = useState(false)
  const [konum, setKonum] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function disaTikla(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setAcik(false)
    }
    function kapatKaydirma() { setAcik(false) }
    if (acik) {
      document.addEventListener('mousedown', disaTikla)
      window.addEventListener('scroll', kapatKaydirma, true)
    }
    return () => {
      document.removeEventListener('mousedown', disaTikla)
      window.removeEventListener('scroll', kapatKaydirma, true)
    }
  }, [acik])

  function ac() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const genislikTahmini = 180
      const solaAc = r.right + genislikTahmini > window.innerWidth
      setKonum({
        top: r.bottom + 4,
        left: solaAc ? r.right - genislikTahmini : r.left,
      })
    }
    setAcik(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={ac}
        title="İşlemler"
        style={{
          width: 30, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid ' + (acik ? 'var(--acc)' : 'var(--bdr)'),
          background: acik ? 'var(--surf2)' : 'var(--surf)',
          borderRadius: 6, cursor: 'pointer', fontSize: 18, color: 'var(--tx)', lineHeight: 1,
          fontWeight: 900, letterSpacing: '1px',
        }}
      >
        •••
      </button>
      {acik && konum && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: konum.top, left: konum.left, zIndex: 1000,
            background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 8,
            boxShadow: 'var(--shm)', minWidth: 180, padding: 5,
          }}
          onClick={() => setAcik(false)}
        >
          {children}
        </div>
      )}
    </>
  )
}

IslemlerMenu.Item = Item
