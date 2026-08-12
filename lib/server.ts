// lib/supabase/server.ts
//
// NOT: Projenizde muhtemelen zaten böyle bir helper var (middleware/API
// route'larınızda req.cookies.get() pattern'ini kullanan). Eğer varsa BU
// DOSYAYI EKLEMEYİN, mevcut olanı kullanın — aşağıdaki sadece referans
// amaçlıdır ve API route örneklerinde import edildiği için buraya konuldu.

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export function createClient(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  return { supabase, res };
}
