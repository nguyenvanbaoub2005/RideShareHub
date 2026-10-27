import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { ErrorAlert } from '../components/Alert';
import { Spinner } from '../components/Spinner';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const role = await login(email.trim(), password);
      if (role === 'ADMIN') {
        navigate('/admin/companies', { replace: true });
      } else if (role === 'TRANSPORT_COMPANY') {
        navigate('/company/profile', { replace: true });
      } else {
        setError('Tài khoản này không có quyền truy cập hệ thống vận hành.');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
        </div>
        <h1 className="auth-card__title">Đăng nhập hệ thống vận hành</h1>
        <p className="auth-card__sub">Dành cho Admin và Nhà xe</p>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <form className="form" onSubmit={handleSubmit} id="login-form">
          <div className="form__group">
            <label className="form__label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form__input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="form__group">
            <label className="form__label" htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              className="form__input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            id="login-submit"
            className="btn btn--primary btn--full"
            type="submit"
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
