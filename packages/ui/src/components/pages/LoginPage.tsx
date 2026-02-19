import React, { useState } from "react";
import { KeyRound, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { AuthService } from "@cham-lang/ui/services";
import { Button, Input, Card } from "@cham-lang/ui/components/atoms";
import { useTranslation } from "react-i18next";

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSkip?: () => void;
}

type FormMode = "login" | "register";

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onSkip,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<FormMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Then login
      await AuthService.login(loginEmail, loginPassword);
      onLoginSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.loginFailed") || "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (registerPassword !== registerConfirmPassword) {
      setError(t("auth.passwordMismatch") || "Passwords do not match");
      return;
    }

    if (registerPassword.length < 8) {
      setError(
        t("auth.passwordTooShort") || "Password must be at least 8 characters",
      );
      return;
    }

    if (!registerUsername || !registerEmail) {
      setError(t("auth.allFieldsRequired") || "All fields are required");
      return;
    }

    setIsLoading(true);

    try {
      // Then register
      await AuthService.register(
        registerUsername,
        registerEmail,
        registerPassword,
      );
      onLoginSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.registrationFailed") ||
              "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: "var(--color-bg-app)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "var(--color-primary-500)",
              boxShadow: "0 0 30px rgba(123, 97, 255, 0.5)",
            }}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-3xl font-extrabold mb-2"
            style={{ color: "var(--color-primary-500)" }}
          >
            Cham Lang
          </h1>
          <p className="text-(--color-text-secondary) text-sm">
            {t("auth.subtitle") || "Sync your learning progress across devices"}
          </p>
        </div>

        {/* Form Card */}
        <Card variant="glass">
          {/* Mode Toggle */}
          <div
            className="flex gap-2 mb-6 p-1 rounded-lg"
            style={{ background: "rgba(15, 23, 42, 0.5)" }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all"
              style={{
                background:
                  mode === "login" ? "var(--color-primary-500)" : "transparent",
                color: mode === "login" ? "#ffffff" : "#a0aec0",
                boxShadow:
                  mode === "login"
                    ? "0 4px 12px rgba(123, 97, 255, 0.4)"
                    : "none",
              }}
            >
              {t("auth.login") || "Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all"
              style={{
                background:
                  mode === "register"
                    ? "var(--color-primary-500)"
                    : "transparent",
                color: mode === "register" ? "#ffffff" : "#a0aec0",
                boxShadow:
                  mode === "register"
                    ? "0 4px 12px rgba(123, 97, 255, 0.4)"
                    : "none",
              }}
            >
              {t("auth.register") || "Register"}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm border"
              style={{
                background: "rgba(255, 51, 102, 0.1)",
                borderColor: "rgba(255, 51, 102, 0.3)",
                color: "#ff3366",
              }}
            >
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-bold mb-2 text-(--color-text-primary)"
                >
                  <div className="flex items-center gap-2">
                    <Mail
                      className="w-4 h-4"
                      style={{ color: "var(--color-primary-400)" }}
                    />
                    {t("auth.email") || "Email"}
                  </div>
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-bold mb-2 text-(--color-text-primary)"
                >
                  <div className="flex items-center gap-2">
                    <Lock
                      className="w-4 h-4"
                      style={{ color: "var(--color-primary-400)" }}
                    />
                    {t("auth.password") || "Password"}
                  </div>
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-6"
                disabled={isLoading || !loginEmail || !loginPassword}
              >
                {isLoading
                  ? t("auth.signingIn") || "Signing in..."
                  : t("auth.signIn") || "Sign In"}
              </Button>
            </form>
          )}

          {/* Registration Form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="register-username"
                  className="block text-sm font-bold mb-2 text-(--color-text-primary)"
                >
                  <div className="flex items-center gap-2">
                    <User
                      className="w-4 h-4"
                      style={{ color: "var(--color-primary-400)" }}
                    />
                    {t("auth.username") || "Username"}
                  </div>
                </label>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="johndoe"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block text-sm font-bold mb-2 text-(--color-text-primary)"
                >
                  <div className="flex items-center gap-2">
                    <Mail
                      className="w-4 h-4"
                      style={{ color: "var(--color-primary-400)" }}
                    />
                    {t("auth.email") || "Email"}
                  </div>
                </label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-sm font-bold mb-2 text-(--color-text-primary)"
                >
                  <div className="flex items-center gap-2">
                    <Lock
                      className="w-4 h-4"
                      style={{ color: "var(--color-primary-400)" }}
                    />
                    {t("auth.password") || "Password"}
                  </div>
                </label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {t("auth.passwordHelp") || "At least 8 characters"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="block text-sm font-bold mb-2 text-(--color-text-primary)"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound
                      className="w-4 h-4"
                      style={{ color: "var(--color-primary-400)" }}
                    />
                    {t("auth.confirmPassword") || "Confirm Password"}
                  </div>
                </label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-6"
                disabled={
                  isLoading ||
                  !registerUsername ||
                  !registerEmail ||
                  !registerPassword ||
                  !registerConfirmPassword
                }
              >
                {isLoading
                  ? t("auth.creatingAccount") || "Creating account..."
                  : t("auth.createAccount") || "Create Account"}
              </Button>
            </form>
          )}

          {/* Skip Option */}
          {onSkip && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm font-medium hover:underline transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                disabled={isLoading}
              >
                {t("auth.skip") || "Skip for now (Local only)"}
              </button>
            </div>
          )}
        </Card>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("auth.footer") || "Your data is encrypted and secure"}
        </p>
      </div>
    </div>
  );
};
