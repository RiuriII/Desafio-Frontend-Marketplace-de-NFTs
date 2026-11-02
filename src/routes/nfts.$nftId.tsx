import { createFileRoute } from '@tanstack/react-router'
import { NftDetailPage } from '@/app/pages/nft-detail-page'

export const Route = createFileRoute('/nfts/$nftId')({ component: NftRoute })

function NftRoute() {
  const { nftId } = Route.useParams()
  return <NftDetailPage nftId={nftId} />
}
