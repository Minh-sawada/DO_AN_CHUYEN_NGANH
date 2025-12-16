import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Face enroll API is disabled' },
    { status: 404 },
  )
}
