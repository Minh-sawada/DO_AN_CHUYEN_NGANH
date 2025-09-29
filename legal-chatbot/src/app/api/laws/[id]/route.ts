import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lawId = params.id

    if (!lawId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Law ID is required' 
      })
    }

    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lấy chi tiết văn bản pháp luật
    const { data: law, error } = await supabase
      .from('laws')
      .select('*')
      .eq('id', lawId)
      .single()

    if (error) {
      console.error('Error fetching law:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Law not found',
        details: error.message
      })
    }

    return NextResponse.json({
      success: true,
      law: law
    })
  } catch (error) {
    console.error('Law API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
