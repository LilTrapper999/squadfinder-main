import 'server-only'
import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/server/admin'
import { deleteAccount } from '@/lib/server/accountDelete'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const result = await deleteAccount(adminClient(), request.headers.get('authorization'))
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
