import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tip tanımları
export type Cari = {
  id: string
  ad: string
  tip: 'musteri' | 'tedarikci'
  hareketler: Hareket[]
  updated_at?: string
}

export type Hareket = {
  id: number
  tarih: string
  tur: 'satis' | 'tahsilat' | 'bedelsiz_ver' | 'iade_al' | 'virman_giris' | 'virman_cikis' | 'diger'
  tutar: number
  tahsilat: number
  bakiye: number
  adet?: number
  birim?: number
  acik?: string
  fatno?: string
}

export type KasaHareketi = {
  id: number
  yon: 'giris' | 'cikis'
  tarih: string
  ad: string
  tutar: number
  cari_ref?: string
}

export type Kullanici = {
  id: number
  username: string
  name: string
  role: 'admin' | 'muhasebe' | 'depo' | 'satis' | 'goruntule'
  aktif: boolean
}
