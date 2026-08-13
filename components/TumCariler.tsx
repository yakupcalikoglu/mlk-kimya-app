'use client'
import { useEffect, useState } from 'react'
import { siraliVeri, siraTikla, siraIkon, SiraState } from '@/lib/sort'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function TumCariler({ onCariSec }: { onCariSec: (id: string) => void }) {
  const [cariler, setCariler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aramaKelime, setAramaKelime] = useState('')
  const [sira, setSira] = useState<SiraState>({ alan: 'ad', yon: 'asc' })

  useEffect(() => {
    fetch('/api/cariler', { credentials: 'include' }).then(r => r.json()).then(d => {
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

  const filtre = cariler
    .filter(c => c.ad?.toLowerCase().includes(aramaKelime.toLowerCase()))
    .map(c => ({ ...c, _satis: topSatis(c), _tahsilat: topTahsilat(c), _bakiye: sonBakiye(c) }))
  const gosterilecek = siraliVeri(filtre, sira)

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
              <tr>
                <th style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, 'ad'))}>Cari Adı{siraIkon(sira,'ad')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, '_satis'))}>Toplam Satış{siraIkon(sira,'_satis')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, '_tahsilat'))}>Tahsilat{siraIkon(sira,'_tahsilat')}</th>
                <th className="tr" style={{cursor:'pointer'}} onClick={() => setSira(s => siraTikla(s, '_bakiye'))}>Bakiye{siraIkon(sira,'_bakiye')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={5} style={{textAlign:'center',padding:20,color:'var(--tx2)'}}>Yükleniyor...</td></tr>}
              {gosterilecek.map(c => {
                const bak = c._bakiye
                return (
                  <tr key={c.id} style={{cursor:'pointer'}} onClick={() => onCariSec(c.id)}>
                    <td style={{fontWeight:500}}>{c.ad}</td>
                    <td className="tr">₺{fmt(c._satis)}</td>
                    <td className="tr" style={{color:'var(--g)'}}>₺{fmt(c._tahsilat)}</td>
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

