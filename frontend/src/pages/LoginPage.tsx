import { useState } from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { GoogleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { usePageTitle } from '@/hooks/use-page-title';

const { Title, Paragraph, Text } = Typography;

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export default function LoginPage() {
  usePageTitle('Login');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/';

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setErrorMessage('Google did not return a usable credential.');
      return;
    }

    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      await login({ credential: credentialResponse.credential });
      navigate(from, { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in with Google. Make sure your Garena account is allowed and backend env is configured correctly.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-shell__panel">
        <div className="login-shell__intro">
          <div className="login-shell__badge">
            <SafetyCertificateOutlined />
          </div>
          <Text className="login-shell__eyebrow">Internal access</Text>
          <Title className="login-shell__title">Delivery Management System</Title>
          <Paragraph className="login-shell__description">
            Sign in with your Garena Google account. The frontend receives the Google
            credential, sends it to the backend, and the backend returns the internal JWT.
          </Paragraph>
        </div>

        <Card className="login-shell__card" bordered={false}>
          <Title level={4}>Sign in with Google</Title>
          <Paragraph type="secondary">
            Only <code>@garena.vn</code> accounts are allowed to enter this workspace.
          </Paragraph>
          <Paragraph type="secondary">
            If Google shows an origin error, add <code>http://localhost:5173</code> to
            your Google OAuth client&apos;s Authorized JavaScript origins.
          </Paragraph>

          {errorMessage ? (
            <Alert
              type="error"
              showIcon
              message="Authentication failed"
              description={errorMessage}
              style={{ marginBottom: 16 }}
            />
          ) : null}

          {!googleClientId ? (
            <Alert
              type="warning"
              showIcon
              message="Missing Google OAuth configuration"
              description="Set VITE_GOOGLE_CLIENT_ID in frontend/.env before using Google sign-in."
            />
          ) : (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div className="google-login-wrap">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    setErrorMessage('Google sign-in was cancelled or failed to initialize.')
                  }
                  theme="outline"
                  shape="pill"
                  size="large"
                  text="signin_with"
                  width="100%"
                />
              </div>

              <Button
                icon={<GoogleOutlined />}
                block
                disabled={isSubmitting}
                style={{ height: 44 }}
              >
                Secure sign-in is handled via Google OAuth
              </Button>
            </Space>
          )}
        </Card>
      </div>
    </div>
  );
}
