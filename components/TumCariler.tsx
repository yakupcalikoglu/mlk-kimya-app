'use client'
import { useEffect, useState } from 'react'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function TumCariler({ onCariSec }: { onCariSec: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aramaKelime, setAramaKelime] = useState('')

  useEffect(() => {
    fetch('/api/cariler').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCariler(d)
      setYukleniyor(false)
    })
  }, [])

  function sonBakiye(c: any) {
    const h = c.hareketler || []
    return h.length ? h[h.length-1].bakiye : 0
  }

  function topSatis(c: any) {
    return (c.hareketler||[]).filter((h:any)=>h.tur==='satis').reduce((a:number,h:any)=>a+(h.tutar||0),0)
  }

  function topTahsilat(c: any) {
    return (c.hareketler||[]).filter((h:any)=>h.tur==='tahsilat').reduce((a:number,h:any)=>a+(h.tahsilat||0),0)
  }

  const filtre = cariler.filter(c => c.ad?.toLowerCase().includes(aramaKelime.toLowerCase()))

  return (
    <div>
      <div style={{marginBottom:12}}>
        <input type="text" placeholder="Cari ara..." value={aramaKelime}
          onChange={e=>setAramaKelime(e.target.value)}
          style={{padding:'7px 12px',border:'1px solid var(--bdr)',borderRadius:6,width:'100%',maxWidth:320,fontSize:13}} />
      </div>
      <div className="card">
        <div className="ch">👥 Tüm Cariler
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--tx2)'}}>{cariler.length} kayıt</span>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Cari Adı</th><th className="tr">Toplam Satış</th><th className="tr">Tahsilat</th><th className="tr">Bakiye</th><th></th></tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={5} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Yükleniyor...</td></tr>}
              {filtre.map(c => {
                const bak = sonBakiye(c)
                return (
                  <tr key={c.id} style={{cursor:'pointer'}} onClick={() => onCariSec(c.id)}>
                    <td style={{fontWeight:500}}>{c.ad}</td>
                    <td className="tr">₺{fmt(topSatis(c))}</td>
                    <td className="tr" style={{color:'var(--g)'}}>₺{fmt(topTahsilat(c))}</td>
                    <td className="tr" style={{fontWeight:700,color:bak>0?'var(--r)':bak<0?'var(--b)':'var(--tx2)'}}>
                      ₺{fmt(Math.abs(bak))}
                      {bak<0 && <span style={{fontSize:10,marginLeft:4,color:'var(--b)'}}>↩</span>}
                    </td>
                    <td><button className="btn xs pr">Detay →</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
