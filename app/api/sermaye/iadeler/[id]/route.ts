import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/sermaye/iadeler/[id] — sil (kasa etkisi varsa kasadan da sil)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, res } = createClient(req);

  const { data: obj } = await supabase
    .from('mlk_sermaye_iadeler')
    .select('kasa_gider_id')
    .eq('id', params.id)
    .single();

  if (obj?.kasa_gider_id) {
    await supabase.from('mlk_kasa').delete().eq('id', obj.kasa_gider_id);
  }

  const { error } = await supabase.from('mlk_sermaye_iadeler').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true }, { headers: res.headers });
}
