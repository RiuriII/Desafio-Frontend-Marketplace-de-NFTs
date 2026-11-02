import { Button } from '@/components/ui/button'
function GoogleMark() {
  return <span className="auth-google-mark" aria-hidden="true">
    <img className="part-blue" src="/icons/auth-google-blue.svg" alt="" />
    <img className="part-green" src="/icons/auth-google-green.svg" alt="" />
    <img className="part-left" src="/icons/auth-google-left.svg" alt="" />
    <img className="part-right-1" src="/icons/auth-google-right-1.svg" alt="" />
    <img className="part-right-2" src="/icons/auth-google-right-2.svg" alt="" />
    <img className="part-top-1" src="/icons/auth-google-top-1.svg" alt="" />
    <img className="part-top-2" src="/icons/auth-google-top-2.svg" alt="" />
  </span>
}

export function AuthSocial() {
  return <div className="auth-social"><p className="auth-social-divider">Ou continue com</p><div className="auth-social-options">
    <Button variant="plain" type="button" disabled title="Login com Google indisponível nesta demonstração"><GoogleMark />Continuar com Google</Button>
    <Button variant="plain" type="button" disabled title="Login com Facebook indisponível nesta demonstração"><img src="/icons/auth-facebook.svg" alt="" />Continuar com Facebook</Button>
  </div></div>
}
