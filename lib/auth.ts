import { supabase } from './supabase'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function getKullanici() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('mlk_session')
  if (!sessionCookie) return null
  try {
    return JSON.parse(sessionCookie.value)
  } catch {
    return null
  }
}

export async function login(username: string, password: string) {
  const { data, error } = await supabase
    .from('mlk_kullanicilar')
    .select('*')
    .eq('username', username.toLowerCase())
    .eq('aktif', true)
    .single()

  if (error || !data) return { error: 'Kullanıcı adı veya şifre hatalı' }

  const hashli = typeof data.password === 'string' && data.password.startsWith('$2')
  const dogru = hashli ? bcrypt.compareSync(password, data.password) : data.password === password
  if (!dogru) return { error: 'Kullanıcı adı veya şifre hatalı' }

  const { password: _pw, ...guvenli } = data
  return { user: guvenli }
}

export function canDo(user: any, islem: string): boolean {
  if (!user) return false
  if (user.role === 'admin') return true

  const rolYetkileri: Record<string, string[]> = {
    muhasebe: ['hareket_ekle', 'hareket_duzenle', 'tahsilat_ekle', 'virman_ekle', 'kasa_ekle', 'yedek_al'],
    depo: ['uretim_ekle', 'hammadde_ekle'],
    satis: ['hareket_ekle', 'tahsilat_ekle'],
    goruntule: [],
  }
  return (rolYetkileri[user.role] || []).includes(islem)
}
