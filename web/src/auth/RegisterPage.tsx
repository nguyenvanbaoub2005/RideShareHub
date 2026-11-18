import React, { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, ApiError } from '../api/client';
import { useAuth } from './AuthContext';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Spinner } from '../components/Spinner';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/AppShell';

export function RegisterPage() {
  const { establishSession } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'PASSENGER' | 'TRANSPORT_COMPANY'>('TRANSPORT_COMPANY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu cần có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const auth = await authApi.register(email.trim(), password, fullName.trim(), role);
      if (role === 'TRANSPORT_COMPANY') {
        await establishSession(auth);
        navigate('/company/profile', { replace: true });
      } else {
        setSuccess(true);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? 'Email này đã được đăng ký.' : err.message);
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
          <BrandMark light subtitle="Đối tác &amp; Hành khách" />
        </div>

        <div className="auth-aside__body">
          <div className="auth-aside__badge">
            <Icon name="building" size={34} />
          </div>
          <p className="auth-aside__eyebrow">Bắt đầu hành trình hợp tác</p>
          <h2 className="auth-aside__heading">
            Tham gia hệ sinh thái
            <br />
            vận tải thông minh.
          </h2>
          <p className="auth-aside__copy">
            Đăng ký tài khoản Nhà xe để gửi hồ sơ xét duyệt và vận hành tuyến chuyến, hoặc tạo tài khoản Hành khách để đặt chỗ trên ứng dụng di động.
          </p>

          <div className="auth-city-pills">
            {['Xác minh minh bạch', 'Quản lý đội xe', 'Đặt chỗ an toàn'].map(tag => (
              <span key={tag} className="auth-city-pill">{tag}</span>
            ))}
          </div>
        </div>

        <div className="auth-aside__footer">© 2026 RideShareHub · Mọi quyền được bảo lưu.</div>
      </aside>

      <main className="auth-main">
        <div className="auth-main__top">
          <span>Đã có tài khoản?</span>
          <Link to="/login" className="auth-main__link">
            Đăng nhập
          </Link>
        </div>

        <div className="auth-panel auth-panel--wide">
          <span className="auth-chip">
            <Icon name="user" size={14} />
            Đăng ký tài khoản mới
          </span>
          <h1 className="auth-panel__title">Đăng ký tài khoản</h1>
          <p className="auth-panel__sub">
            Chọn vai trò phù hợp để bắt đầu sử dụng nền tảng RideShareHub.
          </p>

          <div style={{ marginTop: 24 }}>
            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            {success ? (
              <div className="stack">
                <SuccessAlert message="Đăng ký tài khoản hành khách thành công! Bạn có thể dùng email và mật khẩu này để đăng nhập trên ứng dụng di động RideShareHub." />
                <Link to="/login" className="btn btn--primary btn--lg btn--full">
                  Quay lại trang đăng nhập
                </Link>
              </div>
            ) : (
              <form className="form" onSubmit={handleSubmit} id="register-form" noValidate>
                <div className="form__group">
                  <span className="form__label">Vai trò đăng ký *</span>
                  <div className="role-cards">
                    <button
                      type="button"
                      className={`role-card ${role === 'TRANSPORT_COMPANY' ? 'role-card--active' : ''}`}
                      onClick={() => setRole('TRANSPORT_COMPANY')}
                    >
                      <div className="role-card__title">
                        <Icon name="building" size={16} />
                        <span>Nhà xe</span>
                      </div>
                      <div className="role-card__desc">Đăng ký doanh nghiệp, xe, tài xế và chuyến</div>
                    </button>

                    <button
                      type="button"
                      className={`role-card ${role === 'PASSENGER' ? 'role-card--active' : ''}`}
                      onClick={() => setRole('PASSENGER')}
                    >
                      <div className="role-card__title">
                        <Icon name="user" size={16} />
                        <span>Hành khách</span>
                      </div>
                      <div className="role-card__desc">Tìm chuyến và đặt chỗ trên app di động</div>
                    </button>
                  </div>
                </div>

                <div className="form__row">
                  <div className="form__group">
                    <label className="form__label" htmlFor="register-fullName">Họ và tên *</label>
                    <input
                      id="register-fullName"
                      className="form__input"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Nguyễn Minh Tâm"
                    />
                  </div>
                  <div className="form__group">
                    <label className="form__label" htmlFor="register-email">Email *</label>
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
                </div>

                <div className="form__row">
                  <div className="form__group">
                    <label className="form__label" htmlFor="register-password">Mật khẩu *</label>
                    <div className="password-wrap">
                      <input
                        id="register-password"
                        className="form__input"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
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
                  <div className="form__group">
                    <label className="form__label" htmlFor="register-confirmPassword">Xác nhận mật khẩu *</label>
                    <input
                      id="register-confirmPassword"
                      className="form__input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                    />
                  </div>
                </div>

                {role === 'TRANSPORT_COMPANY' && (
                  <div className="guidance-box" style={{ padding: '12px 14px' }}>
                    <Icon name="shield" size={18} />
                    <span>
                      Sau khi tạo tài khoản Nhà xe, bạn sẽ được chuyển ngay tới bước gửi hồ sơ doanh nghiệp để Admin phê duyệt.
                    </span>
                  </div>
                )}

                <button
                  id="register-submit"
                  className="btn btn--primary btn--lg btn--full"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : (
                    <>
                      <span>{role === 'TRANSPORT_COMPANY' ? 'Tiếp tục đăng ký nhà xe' : 'Tạo tài khoản'}</span>
                      <Icon name="right" size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="auth-main__bottom">Nền tảng kết nối nhà xe và hành khách RideShareHub.</p>
      </main>
    </div>
  );
}
