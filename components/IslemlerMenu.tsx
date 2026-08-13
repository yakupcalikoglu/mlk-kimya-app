'use client'
import { useState, useRef, useEffect } from 'react'

// Tablo satırlarındaki "✏️ Düzenle / 🗑 Sil" gibi butonları her zaman açık
// göstermek yerine, "⋮" ikonuna tıklayınca açılan bir menüde toplar.
// Bu, yanlışlıkla sil butonuna tıklamayı büyük ölçüde engeller.
//
// Kullanım:
//   <IslemlerMenu>
//     <IslemlerMenu.Item onClick={() => setModal(true)} ikon="✏️">Düzenle</IslemlerMenu.Item>
//     <IslemlerMenu.Item onClick={() => sil(x.id)} ikon="🗑" tehlikeli>Sil</IslemlerMenu.Item>
//   </IslemlerMenu>

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
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
        fontSize: 12.5, textAlign: 'left', borderRadius: 6,
        color: tehlikeli ? 'var(--r)' : 'var(--tx)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = tehlikeli ? 'var(--rbg)' : 'var(--surf2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {ikon && <span style={{ fontSize: 13 }}>{ikon}</span>}
      {children}
    </button>
  )
}

export default function IslemlerMenu({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function disaTikla(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAcik(false)
    }
    if (acik) document.addEventListener('mousedown', disaTikla)
    return () => document.removeEventListener('mousedown', disaTikla)
  }, [acik])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setAcik(v => !v)}
        title="İşlemler"
        style={{
          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid transparent', background: acik ? 'var(--surf2)' : 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 15, color: 'var(--tx2)', lineHeight: 1,
        }}
      >
        ⋮
      </button>
      {acik && (
        <div
          style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 50,
            background: 'var(--surf)', border: '1px solid var(--bdr)', borderRadius: 8,
            boxShadow: 'var(--shm)', minWidth: 140, padding: 4,
          }}
          onClick={() => setAcik(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

IslemlerMenu.Item = Item
