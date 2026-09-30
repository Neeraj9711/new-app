import { Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import GoogleSignIn from '../components/GoogleSignIn';

export default function LoginPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="page-header login-page">
      <div className="container">
        <h1>{t('auth.loginTitle')}</h1>
        <p>{t('auth.loginBody')}</p>
        <div className="login-card">
          <GoogleSignIn />
          <p className="auth-hint">{t('auth.privacyNote')}</p>
        </div>
      </div>
    </section>
  );
}

