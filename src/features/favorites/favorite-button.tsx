import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { Nft } from '@/contracts/nft'
import type { Favorites } from '@/contracts/favorites'
import { addFavorite, getFavorites, removeFavorite } from '@/features/favorites/api'
import { readSessionToken } from '@/features/auth/session'

export function FavoriteButton({ nft }: { nft: Nft }) {
  const token = readSessionToken()
  const client = useQueryClient()
  const key = ['favorites', token]
  const favorites = useQuery({ queryKey: key, queryFn: ({ signal }) => getFavorites(signal), enabled: Boolean(token) })
  const active = favorites.data?.items.some((item) => item.id === nft.id) ?? false
  const mutation = useMutation({
    mutationFn: (next: boolean) => next ? addFavorite(nft.id) : removeFavorite(nft.id),
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Favorites>(key)
      client.setQueryData<Favorites>(key, (current) => ({ items: next ? [...(current?.items ?? []).filter((item) => item.id !== nft.id), nft] : (current?.items ?? []).filter((item) => item.id !== nft.id) }))
      return { previous }
    },
    onError: (_error, _next, context) => { if (context?.previous) client.setQueryData(key, context.previous) },
    onSuccess: (result) => client.setQueryData(key, result),
    onSettled: () => { void client.invalidateQueries({ queryKey: key }) },
  })
  if (!token) return <Link className="favorite-action" to="/login" search={{ redirect: `/nfts/${nft.id}` }}><Heart size={18} /> Entrar para favoritar</Link>
  return <span className="favorite-control"><Button variant="marketOutline" className="favorite-action" type="button" aria-pressed={active} disabled={favorites.isPending || mutation.isPending} onClick={() => mutation.mutate(!active)}><Heart size={18} fill={active ? 'currentColor' : 'none'} /> {active ? 'Remover dos favoritos' : 'Favoritar'}</Button>{mutation.isError && <span role="alert" className="commerce-error">Não foi possível atualizar o favorito. Tente novamente.</span>}</span>
}
