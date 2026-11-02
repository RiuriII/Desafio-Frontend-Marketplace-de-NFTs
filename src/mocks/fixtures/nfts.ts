import type { Nft } from '@/contracts/nft'

const names = [
  'Emerald Ape #042', 'Sage Nomad #009', 'Neon Vessel #552', 'Cosmic Bloom #118',
  'Violet Nomad #314', 'Ivory Baron #088', 'Golden Beat #207', 'Golden Signal #160',
  'Amber Echo #301', 'Aurora Frame #024', 'Lunar Garden #717', 'Copper Wave #012',
  'Pixel Oracle #344', 'Vivid Orbit #102', 'Night Archive #080', 'Ceramic Sky #016',
  'Electric Forest #651', 'Silk Horizon #131', 'Mint Mirage #221', 'Solar Verse #091',
  'Nova Bloom #315', 'Deep Current #115', 'Echo Study #018', 'Prism Gate #404',
]
const prices = ['1.19', '1.69', '1.99', '1.29', '1.39', '1.79', '0.99', '0.39', '2.19', '0.79', '3.40', '0.59']
const categories = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos'] as const
const networks = ['Ethereum', 'Polygon', 'Solana'] as const
const images = ['/images/8f387.png', '/images/83794.png', '/images/9add2.png', '/images/b7cfc.png']

export const initialNfts: Nft[] = names.map((name, index) => ({
  id: `nft-${String(index + 1).padStart(3, '0')}`,
  name,
  creator: ['Kurio Studio', 'Ari Vale', 'Lena Motion', 'Milo D'][index % 4],
  collection: index === 0 ? 'Kurio Apes' : ['Genesis Drops', 'Curated Art', 'Kurio Originals'][index % 3],
  category: categories[index % categories.length],
  network: networks[index % networks.length],
  image: images[index % images.length],
  gallery: [
    { id: 'full', image: images[index % images.length], label: 'Obra completa', position: 'center' },
    { id: 'detail-top', image: images[index % images.length], label: 'Detalhe superior', position: 'center top' },
    { id: 'detail-bottom', image: images[index % images.length], label: 'Detalhe inferior', position: 'center bottom' },
  ],
  priceEth: prices[index % prices.length],
  available: index % 11 === 10 ? 0 : Math.min(index % 5 === 0 ? 50 : 10, 10 + index),
  editionSize: index % 5 === 0 ? 50 : 10,
  editions: (() => { const stock = index % 11 === 10 ? 0 : Math.min(index % 5 === 0 ? 50 : 10, 10 + index); const one = Math.min(1, stock); const ten = Math.min(3, stock - one); return index % 5 === 0 ? [{ id: 'edition-1', label: '1/1', available: one }, { id: 'edition-10', label: '1/10', available: ten }, { id: 'edition-50', label: '1/50', available: stock - one - ten }] : [{ id: 'edition-1', label: '1/1', available: one }, { id: 'edition-10', label: '1/10', available: stock - one }] })(),
  version: 1,
  description: index === 0 ? 'Uma peça rara da coleção Kurio Apes, criada para colecionadores de arte digital.' : `Obra digital ${name} da coleção Kurio. Uma edição para colecionadores de cultura digital.`,
  tokenId: `#${String(index + 42).padStart(4, '0')}`,
  rating: 4.8,
  reviewCount: index === 0 ? 19 : 3 + index,
  createdAt: new Date(Date.UTC(2026, 9, 31 - (index % 24))).toISOString(),
  featured: index < 4,
}))
