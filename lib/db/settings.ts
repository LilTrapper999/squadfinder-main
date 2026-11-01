// Account settings: the online-players toggle, the block list, data export and deletion.

import { supabase } from '@/lib/supabase/client'
import { rpc, RpcError, toRpcError } from '@/lib/db/rpc'

export interface BlockedPlayer {
  id: string
  /** The in-game username they had when blocked — a label, never a user id. */
  label: string
  createdAt: string
}

export async function fetchShowOnlinePlayers(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('users').select('show_online_players').eq('id', userId).single()
  if (error) throw toRpcError(new Error(error.message))
  return data?.show_online_players === true
}

export async function saveShowOnlinePlayers(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ show_online_players: value }).eq('id', userId)
  if (error) throw toRpcError(new Error(error.message))
}

export async function fetchBlocks(): Promise<BlockedPlayer[]> {
  const rows = await rpc<{ block_id: string; label: string | null; created_at: string }[]>('get_my_blocks')
  return (rows ?? []).map((r) => ({ id: r.block_id, label: r.label ?? '', createdAt: r.created_at }))
}

export const exportMyData = () => rpc<Record<string, unknown>>('export_my_data')

/** Server-side delete (needs the service role). Resolves on success; throws RpcError otherwise. */
export async function deleteMyAccount(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new RpcError('not_authenticated', 'no session')
  let res: Response
  try {
    res = await fetch('/api/account/delete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  } catch (e) {
    throw toRpcError(e)
  }
  if (res.ok) return
  let code = 'unknown'
  try {
    code = (await res.json()).error ?? code
  } catch {
    // body was not JSON
  }
  throw toRpcError(new Error(code))
}
