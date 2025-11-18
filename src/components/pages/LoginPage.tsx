import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input, Button, Card } from '../atoms';
import type { LoginRequest } from '../../types/auth';

const FloatingBg = () => (
  <>
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(5deg); }
      }
    `}</style>
    <div className="absolute w-32 h-32 bg-cyan-400 opacity-20 rounded-lg top-10 left-10 rotate-12 animate-[float_4s_ease-in-out_infinite]" />
    <div className="absolute w-24 h-24 bg-amber-300 opacity-20 top-40 right-20 rounded-2xl animate-[float_3.5s_ease-in-out_0.5s_infinite]" />
    <div className="absolute w-28 h-28 bg-orange-400 opacity-20 bottom-20 left-1/4 rounded-xl rotate-45 animate-[float_4.5s_ease-in-out_1s_infinite]" />
    <div className="absolute w-20 h-20 bg-teal-500 opacity-20 bottom-40 right-1/3 rounded-lg animate-[float_3s_ease-in-out_1.5s_infinite]" />
  </>
);

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-200 via-cyan-100 to-teal-200 relative overflow-hidden flex items-center justify-center p-4">
      <FloatingBg />

      <div className="relative z-10 w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {t('auth.login')}
            </h1>
            <p className="text-gray-600">
              {t('auth.loginDescription')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('auth.username')}
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              icon={User}
              placeholder={t('auth.usernamePlaceholder')}
              required
              autoFocus
            />

            <Input
              label={t('auth.password')}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              placeholder={t('auth.passwordPlaceholder')}
              required
            />

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-teal-600 font-semibold hover:text-teal-700">
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
