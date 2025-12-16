import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Face descriptors API is disabled' },
    { status: 404 },
  )
}
