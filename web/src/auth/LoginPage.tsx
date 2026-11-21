import React, { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { ErrorAlert } from '../components/Alert';
import { Spinner } from '../components/Spinner';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/AppShell';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const role = await login(email.trim(), password);
      if (role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'TRANSPORT_COMPANY') {
        navigate('/company/profile', { replace: true });
      } else {
        setError('Tài khoản Hành khách hoặc Tài xế vui lòng đăng nhập trên ứng dụng di động RideShareHub.');
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
    <div className="auth-split">
      <aside className="auth-aside">
        <div className="auth-aside__grid" />
        <div className="auth-aside__glow" />
        <div style={{ position: 'relative' }}>
          <BrandMark light subtitle="Cổng vận hành nền tảng" />
        </div>

        <div className="auth-aside__body">
          <div className="auth-aside__badge">
            <Icon name="shield" size={34} />
          </div>
          <p className="auth-aside__eyebrow">Một hệ thống. Mọi hành trình.</p>
          <h2 className="auth-aside__heading">
            Vận hành gọn hơn.
            <br />
            Kết nối tin cậy.
          </h2>
          <p className="auth-aside__copy">
            Không gian điều hành tập trung cho quản trị viên và đối tác nhà xe trên nền tảng xe ghép RideShareHub.
          </p>

          <div className="auth-route-card">
            <div className="auth-route-card__label">Mạng lưới kết nối miền Trung</div>
            <svg viewBox="0 0 380 120" style={{ width: '100%' }} aria-hidden="true">
              <path
                d="M38 40 C95 40 88 90 150 90 S235 25 300 35 L344 85"
                stroke="#334155"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M38 40 C95 40 88 90 150 90 S235 25 300 35"
                stroke="#14B8A6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="6 6"
              />
              {[
                [38, 40, 'Huế'],
                [150, 90, 'Đà Nẵng'],
                [300, 35, 'Hội An'],
                [344, 85, 'Quảng Nam'],
              ].map(([x, y, label]) => (
                <g key={String(label)}>
                  <circle cx={Number(x)} cy={Number(y)} r="7" fill="#14B8A6" stroke="#0F172A" strokeWidth="3" />
                  <text x={Number(x)} y={Number(y) + 22} textAnchor="middle" fill="#CBD5E1" fontSize="11">
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="auth-city-pills">
            {['Đà Nẵng', 'Huế', 'Hội An', 'Quảng Nam'].map(city => (
              <span key={city} className="auth-city-pill">{city}</span>
            ))}
          </div>
        </div>

        <div className="auth-aside__footer">© 2026 RideShareHub · Cổng vận hành Admin &amp; Nhà xe</div>
      </aside>

      <main className="auth-main">
        <div className="auth-main__top">
          <span>Chưa có tài khoản?</span>
          <Link to="/register" className="auth-main__link">
            Đăng ký ngay →
          </Link>
        </div>

        <div className="auth-panel">
          <span className="auth-chip">
            <Icon name="building" size={14} />
            Cổng quản trị &amp; đối tác nhà xe
          </span>
          <h1 className="auth-panel__title">Đăng nhập hệ thống vận hành</h1>
          <p className="auth-panel__sub">
            Chào mừng trở lại. Đăng nhập để theo dõi hồ sơ, quản lý đội xe và điều hành chuyến đi.
          </p>

          <div style={{ marginTop: 28 }}>
            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <form className="form" onSubmit={handleSubmit} id="login-form" noValidate>
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
                  placeholder="dieuhanh@nhaxe.vn"
                />
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="password">Mật khẩu</label>
                <div className="password-wrap">
                  <input
                    id="password"
                    className="form__input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <Icon name={showPassword ? 'eyeoff' : 'eye'} size={18} />
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                className="btn btn--primary btn--lg btn--full"
                type="submit"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : (
                  <>
                    <span>Đăng nhập</span>
                    <Icon name="right" size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="auth-main__bottom">
          Dành cho Quản trị viên (Admin) và Nhà xe (Transport Company).
        </p>
      </main>
    </div>
  );
}
