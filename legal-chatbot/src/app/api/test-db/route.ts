import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('laws')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Database connection failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    // Test if we can insert a simple record
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('laws')
      .insert({
        title: 'Test Document',
        category: 'Test',
        loai_van_ban: 'Test',
        noi_dung: 'This is a test document for database connection.',
        so_hieu: 'TEST-001',
        embedding: new Array(1536).fill(0) // Dummy embedding
      })
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ 
        success: false,
        error: 'Database insert failed',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 })
    }

    // Clean up test record
    if (insertData && insertData.length > 0) {
      await supabaseAdmin
        .from('laws')
        .delete()
        .eq('id', insertData[0].id)
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      testRecord: insertData
    })

  } catch (error) {
    console.error('Test DB error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
