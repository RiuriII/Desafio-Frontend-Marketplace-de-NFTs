import { Link } from '@tanstack/react-router'
import type { Nft } from '@/contracts/nft'

export function NftCard({ nft }: { nft: Nft }) {
  return <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="nft-card">
    <span className="nft-card-image"><img src={nft.image} alt={`Arte de ${nft.name}`} loading="lazy" width="300" height="300" />{nft.available === 0 && <span className="sold-out">Esgotado</span>}</span>
    <span className="nft-card-name">{nft.name}</span>
    <span className="nft-card-price">{nft.priceEth} ETH</span>
  </Link>
}
