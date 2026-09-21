import { useEffect, useState } from 'react';
import { Store, Package, Boxes, Truck, ArrowRight, AlertCircle, MailCheck } from 'lucide-react';
import { configured, supabase } from './api';
import { authMessage, createAccount, confirmAccount, resendConfirmation, pendingEmail, savePendingEmail } from '../../../shared/auth/accountAccess.mjs';

const PENDING = 'bb-seller-confirmation';
function Brand() { return <div className="brand"><span className="brand-icon"><Store size={23} /></span><span>BeautyBook<small>ESPACE VENDEUR</small></span></div>; }
function Notice({ children }) { return <div className="notice" role="alert"><AlertCircle size={20} /><span>{children}</span></div>; }

export default function SellerAuth({ sessionError = '' }) {
  const savedEmail = pendingEmail(sessionStorage, PENDING);
  const [mode, setMode] = useState(savedEmail ? 'verify' : 'login'), [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [code, setCode] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(false), [cooldown, setCooldown] = useState(0);
  const redirectTo = `${(import.meta.env.VITE_APP_URL || location.origin).replace(/\/$/, '')}/?auth=confirmed`;
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(n => n - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  function changeMode(next) { setMode(next); setError(''); setNotice(''); setPassword(''); setConfirmation(''); setCode(''); }
  function showConfirmation() { savePendingEmail(sessionStorage, PENDING, email); changeMode('verify'); setCooldown(60); }
  async function submit(event) {
    event.preventDefault(); if (loading) return; setLoading(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        if (password !== confirmation) throw new Error('Les mots de passe ne correspondent pas.');
        const result = await createAccount(supabase, { email, password, redirectTo });
        if (result.status === 'existing') { changeMode('login'); setNotice('Si vous possédez déjà un compte, connectez-vous ou utilisez « Mot de passe oublié ».'); }
        else if (result.status === 'confirmation') showConfirmation();
        else sessionStorage.removeItem(PENDING);
      } else if (mode === 'verify') {
        await confirmAccount(supabase, email, code); sessionStorage.removeItem(PENDING);
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo.replace('auth=confirmed', 'auth=recovery') });
        if (error) throw error;
        setNotice('Si cette adresse correspond à un compte, vous recevrez un lien pour choisir un nouveau mot de passe.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error?.code === 'email_not_confirmed') { showConfirmation(); setCooldown(0); setNotice('Votre compte attend la confirmation de votre email. Demandez un nouvel email si nécessaire.'); }
        else { if (error) throw error; sessionStorage.removeItem(PENDING); }
      }
    } catch (err) { setError(authMessage(err)); } finally { setLoading(false); }
  }
  async function resend() {
    setLoading(true); setError(''); setNotice('');
    try { await resendConfirmation(supabase, email, redirectTo); setCooldown(60); setNotice('Un nouvel email a été demandé. Consultez aussi vos courriers indésirables.'); }
    catch (err) { setError(authMessage(err)); } finally { setLoading(false); }
  }
  const title = { login: 'Heureux de vous retrouver.', signup: 'Ouvrez votre espace.', verify: 'Confirmez votre email.', reset: 'Retrouvez votre accès.' };
  const description = { login: 'Connectez-vous pour gérer votre activité.', signup: 'Créez votre compte, confirmez votre email, puis demandez l’ouverture de votre boutique.', verify: `Saisissez le code envoyé à ${email}. Si l’email contient un lien, ouvrez-le pour confirmer votre compte.`, reset: 'Recevez un lien de récupération par email.' };
  return <main className="auth-page"><section className="auth-story"><Brand /><div><p className="eyebrow">VOTRE ACTIVITÉ, À PORTÉE DE MAIN</p><h1>Votre boutique.<br />Partout avec vous.</h1><p className="lead">Vos produits, votre stock et vos commandes dans un espace pensé pour votre quotidien.</p><div className="auth-features"><span><Package size={20} />Un catalogue à jour</span><span><Boxes size={20} />Chaque mouvement tracé</span><span><Truck size={20} />Des commandes suivies</span></div></div><p className="auth-foot">L’espace des marques et des vendeurs BeautyBook.</p></section>
    <section className="auth-form"><div className="auth-card"><span className="pill">BeautyBook Vendeur</span>{mode === 'verify' && <MailCheck className="confirmation-icon" size={36} />}<h2>{title[mode]}</h2><p className="auth-description">{description[mode]}</p>
      {!configured ? <Notice>Cet espace doit être configuré par le responsable BeautyBook pour activer la connexion.</Notice> : <form onSubmit={submit}>
        {mode !== 'verify' && <label>Adresse email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr" /></label>}
        {['login', 'signup'].includes(mode) && <label>Mot de passe<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : undefined} required value={password} onChange={e => setPassword(e.target.value)} />{mode === 'signup' && <small>12 caractères minimum.</small>}</label>}
        {mode === 'signup' && <label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>}
        {mode === 'verify' && <label>Code reçu par email<input className="confirmation-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>}
        {(error || sessionError) && <Notice>{error || sessionError}</Notice>}{notice && <p role="status" className="success">{notice}</p>}
        <button className="button primary full" disabled={loading}>{loading ? 'Un instant…' : ({ login: 'Se connecter', signup: 'Créer mon compte', verify: 'Confirmer et continuer', reset: 'Envoyer le lien' })[mode]}<ArrowRight size={18} /></button>
      </form>}
      <div className="auth-links">
        {mode === 'verify' && <><button disabled={loading || cooldown > 0} onClick={resend}>{cooldown ? `Renvoyer dans ${cooldown} s` : 'Renvoyer l’email de confirmation'}</button><button disabled={loading} onClick={() => { sessionStorage.removeItem(PENDING); changeMode('signup'); }}>Corriger mon adresse email</button></>}
        <button disabled={loading} onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Créer un compte vendeur' : 'Revenir à la connexion'}</button>
        {mode === 'login' && <button disabled={loading} onClick={() => changeMode('reset')}>Mot de passe oublié ?</button>}
      </div>
    </div></section></main>;
}

export function SellerPasswordReset({ onComplete }) {
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (password !== confirmation) throw new Error('Les mots de passe ne correspondent pas.');
      const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
      onComplete();
    } catch (err) { setError(authMessage(err)); } finally { setBusy(false); }
  }
  return <main className="auth-page single"><section className="auth-card"><Brand /><h1>Nouveau mot de passe</h1><form onSubmit={submit}><label>Mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /><small>12 caractères minimum.</small></label><label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>{error && <Notice>{error}</Notice>}<button className="button primary full" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}</button><button type="button" className="button full" disabled={busy} onClick={onComplete}>Annuler</button></form></section></main>;
}
