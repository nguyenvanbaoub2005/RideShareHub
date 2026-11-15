import React, { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, ApiError } from '../api/client';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Spinner } from '../components/Spinner';

export function RegisterPage() {
  const [role, setRole] = useState<'PASSENGER' | 'TRANSPORT_COMPANY'>('PASSENGER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register(email.trim(), password, fullName.trim(), role);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
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
        <h1 className="auth-card__title">Đăng ký tài khoản</h1>
        <p className="auth-card__sub">Tạo tài khoản để sử dụng dịch vụ</p>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {success ? (
          <>
            <SuccessAlert message="Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập." />
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-sub)' }}>
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                Đến trang đăng nhập
              </Link>
            </p>
          </>
        ) : (
          <form className="form" onSubmit={handleSubmit} id="register-form">
            <div className="form__group">
              <label className="form__label" htmlFor="register-role">Vai trò</label>
              <select
                id="register-role"
                className="form__input"
                value={role}
                onChange={e => setRole(e.target.value as 'PASSENGER' | 'TRANSPORT_COMPANY')}
              >
                <option value="PASSENGER">Hành khách</option>
                <option value="TRANSPORT_COMPANY">Nhà xe</option>
              </select>
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="register-fullName">Họ và tên</label>
              <input
                id="register-fullName"
                className="form__input"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className="form__input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="register-password">Mật khẩu</label>
              <input
                id="register-password"
                className="form__input"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="register-confirmPassword">Xác nhận mật khẩu</label>
              <input
                id="register-confirmPassword"
                className="form__input"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              id="register-submit"
              className="btn btn--primary btn--full"
              type="submit"
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : 'Đăng ký'}
            </button>
          </form>
        )}

        {!success && (
          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-sub)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
              Đăng nhập
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
