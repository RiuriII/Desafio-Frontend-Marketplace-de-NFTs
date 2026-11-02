import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import Decimal from 'decimal.js'
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCatalog, getNft } from '@/features/catalog/api'
import { MarketHeader } from '@/components/layout/market-header'
import { NftCard } from '@/components/shared/nft-card'
import { addCartItem } from '@/features/commerce/api'
import { FavoriteButton } from '@/features/favorites/favorite-button'

export function NftDetailPage({ nftId }: { nftId: string }) {
  const navigate = useNavigate()
  const [imageIndex, setImageIndex] = useState(0)
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const buy = useMutation({ mutationFn: ({ editionId, quantity }: { editionId: string; quantity: number }) => addCartItem(nftId, editionId, quantity), onSuccess: () => void navigate({ to: '/cart' }) })
  const query = useQuery({ queryKey: ['nft', nftId], queryFn: ({ signal }) => getNft(nftId, signal) })
  const related = useQuery({ queryKey: ['nfts', 'related'], queryFn: ({ signal }) => getCatalog({ q: '', sort: 'recent', tab: 'all', page: 1 }, signal) })
  const nft = query.data
  const edition = nft?.editions.find((item) => item.id === editionId) ?? nft?.editions.at(-1)
  const selectedImage = nft?.gallery[imageIndex] ?? nft?.gallery[0]
  const chosenQuantity = Math.min(quantity, Math.max(1, edition?.available ?? 1))
  const canBuy = Boolean(edition?.available && !buy.isPending)
  const purchase = () => { if (edition && canBuy) buy.mutate({ editionId: edition.id, quantity: chosenQuantity }) }
  const stepImage = (direction: number) => { if (nft) setImageIndex((current) => (current + direction + nft.gallery.length) % nft.gallery.length) }

  return <div className="detail-screen"><MarketHeader /><div className="market-container detail-container"><p className="breadcrumbs"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Início</Link> / <Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }} hash="catalogo">Mercado</Link></p>
    {query.isPending ? <div className="detail-layout"><Skeleton className="detail-skeleton" /><Skeleton className="detail-skeleton" /></div> : query.isError ? <div className="catalog-message" role="alert"><h1>{isAxiosError(query.error) && query.error.response?.status === 404 ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}</h1><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Voltar ao mercado</Link>{!(isAxiosError(query.error) && query.error.response?.status === 404) && <Button variant="plain" type="button" onClick={() => void query.refetch()}>Tentar novamente</Button>}</div> : nft && selectedImage && <>
      <article className="detail-layout">
        <div className="detail-mobile-nav"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }} hash="catalogo" aria-label="Voltar ao mercado"><ChevronLeft size={21} /></Link><FavoriteButton nft={nft} /></div>
        <div className="detail-gallery" aria-label={`Galeria de ${nft.name}`}>
          <div className="detail-art"><img src={selectedImage.image} alt={`${nft.name}: ${selectedImage.label.toLowerCase()}`} width="600" height="600" className={selectedImage.id === 'full' ? '' : 'detail-image-crop'} style={{ objectPosition: selectedImage.position }} /><div className="detail-gallery-arrows"><Button variant="plain" type="button" aria-label="Imagem anterior" onClick={() => stepImage(-1)}><ChevronLeft size={19} /></Button><Button variant="plain" type="button" aria-label="Próxima imagem" onClick={() => stepImage(1)}><ChevronRight size={19} /></Button></div></div>
          <div className="detail-thumbnails" aria-label="Escolher imagem">{nft.gallery.map((image, index) => <Button variant="plain" type="button" key={image.id} aria-label={image.label} aria-pressed={selectedImage.id === image.id} onClick={() => setImageIndex(index)}><img src={image.image} alt="" className={image.id === 'full' ? '' : 'detail-image-crop'} style={{ objectPosition: image.position }} /></Button>)}</div>
        </div>
        <div className="detail-info"><p className="eyebrow">{nft.collection}</p><h1>{nft.name}</h1><p className="rating"><Star size={17} fill="currentColor" /> {nft.rating} <span className="rating-desktop">({nft.reviewCount} avaliações de colecionadores)</span><span className="rating-mobile">({nft.reviewCount})</span></p><p className="detail-price">{nft.priceEth} ETH</p><div className="detail-description"><h2>Sobre este NFT:</h2><p>{nft.description}</p></div>
          <div className="edition-row"><strong>Edição:</strong><span>{edition?.label}</span><span>{edition?.available ?? 0} disponíveis nesta edição</span></div>
          <div className="edition-options" role="group" aria-label="Selecionar edição">{nft.editions.map((item) => <Button variant="plain" type="button" key={item.id} aria-pressed={edition?.id === item.id} disabled={item.available === 0} onClick={() => { setEditionId(item.id); setQuantity(1) }}>{item.label}{item.available === 0 && <span className="sr-only"> esgotada</span>}</Button>)}</div>
          <div className="detail-purchase-row"><div className="detail-quantity" role="group" aria-label="Quantidade"><Button variant="plain" type="button" aria-label="Diminuir quantidade" disabled={!edition?.available || chosenQuantity <= 1} onClick={() => setQuantity(chosenQuantity - 1)}><Minus size={16} /></Button><output aria-label="Quantidade selecionada">{chosenQuantity}</output><Button variant="plain" type="button" aria-label="Aumentar quantidade" disabled={!edition?.available || chosenQuantity >= edition.available} onClick={() => setQuantity(chosenQuantity + 1)}><Plus size={16} /></Button></div><div className="detail-actions"><Button variant="market" type="button" disabled={!canBuy} onClick={purchase}>{buy.isPending ? 'ADICIONANDO…' : !edition?.available ? 'ESGOTADO' : 'COMPRAR'}</Button><FavoriteButton nft={nft} /></div></div>
          {buy.isError && <p role="alert" className="commerce-error">Não foi possível adicionar esta edição ao carrinho. Confira a disponibilidade e tente novamente.</p>}
          <dl className="detail-facts"><div><dt>ID do token:</dt><dd>{nft.tokenId}</dd></div><div><dt>Coleção:</dt><dd>{nft.collection}</dd></div><div><dt>Rede:</dt><dd>{nft.network}</dd></div></dl>
        </div>
        <div className="detail-mobile-buybar"><div className="detail-mobile-total"><span>Total · {edition?.label}</span><strong>{new Decimal(nft.priceEth).times(chosenQuantity).toString()} ETH</strong></div><div className="detail-mobile-quantity"><span>Qtd.</span><Button variant="plain" type="button" aria-label="Diminuir quantidade" disabled={!edition?.available || chosenQuantity <= 1} onClick={() => setQuantity(chosenQuantity - 1)}><Minus size={15} /></Button><output aria-label="Quantidade selecionada">{chosenQuantity}</output><Button variant="plain" type="button" aria-label="Aumentar quantidade" disabled={!edition?.available || chosenQuantity >= edition.available} onClick={() => setQuantity(chosenQuantity + 1)}><Plus size={15} /></Button></div><div className="detail-mobile-buyactions"><Button variant="market" type="button" disabled={!canBuy} onClick={purchase}>{buy.isPending ? 'ADICIONANDO…' : !edition?.available ? 'ESGOTADO' : 'COMPRAR'}</Button><Link to="/cart" aria-label="Abrir carrinho"><ShoppingCart size={20} /></Link></div></div>
      </article>
      <section className="related"><h2>Mais NFTs</h2><div className="nft-grid">{related.data?.items.filter((item) => item.id !== nftId).slice(0, 4).map((item) => <NftCard key={item.id} nft={item} />)}</div></section>
    </>}
    <footer className="market-footer"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }} className="brand">KURIO◆</Link><p>Feito para colecionadores, criadores e cultura digital.</p></footer>
  </div></div>
}
