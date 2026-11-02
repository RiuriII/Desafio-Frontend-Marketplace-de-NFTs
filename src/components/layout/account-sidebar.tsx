import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleHelp, Download, Heart, LogOut, MapPin, ShoppingCart, UserRound, Wallet } from 'lucide-react'
import { logout } from '@/features/auth/api'
import { writeSessionToken } from '@/features/auth/session'

export function AccountSidebar({ current }: { current: 'profile' | 'wallets' }) {
  const signOut = useMutation({ mutationFn: logout, onSuccess: () => { writeSessionToken(null); window.location.assign('/') } })
  return <aside className="account-sidebar" aria-label="Minha conta"><h2>Meu perfil</h2><nav>
    <Link to="/account/profile" aria-current={current === 'profile' ? 'page' : undefined}><UserRound size={18} /> Dados do perfil</Link>
    <Link to="/account/wallets" aria-current={current === 'wallets' ? 'page' : undefined}><MapPin size={18} /> Carteiras</Link>
    <span aria-disabled="true" title="Atividade fora do escopo"><ShoppingCart size={18} /> Atividade</span>
    <Link to="/account/profile" hash="favorites"><Heart size={18} /> Lista de interesse</Link>
    <span aria-disabled="true" title="Ofertas fora do escopo"><Wallet size={18} /> Ofertas</span>
    <span aria-disabled="true" title="Downloads fora do escopo"><Download size={18} /> Arquivos baixados</span>
    <span aria-disabled="true" title="Suporte fora do escopo"><CircleHelp size={18} /> Suporte</span>
  </nav><Button variant="plain" type="button" onClick={() => signOut.mutate()} disabled={signOut.isPending}><LogOut size={18} /> {signOut.isPending ? 'Saindo…' : 'Sair da conta'}</Button>{signOut.isError && <p role="alert" className="commerce-error">Não foi possível sair. Tente novamente.</p>}</aside>
}
