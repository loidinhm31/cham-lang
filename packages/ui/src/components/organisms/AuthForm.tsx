import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogIn, UserPlus, Mail, Lock, User } from "lucide-react";
import { Button, Input } from "@cham-lang/ui/components/atoms";
import { getAuthService } from "@cham-lang/ui/adapters";
import { AuthResponse } from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";

interface AuthFormProps {
  onSuccess: (response: AuthResponse) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && !username)) {
      showAlert(t("auth.fillAllFields") || "Please fill in all fields", {
        variant: "error",
      });
      return;
    }

    setLoading(true);
    const authService = getAuthService();

    try {
      let response: AuthResponse;

      if (isLogin) {
        response = await authService.login(email, password);
        showAlert(t("auth.loginSuccess") || "Logged in successfully", {
          variant: "success",
        });
      } else {
        response = await authService.register(username, email, password);
        showAlert(t("auth.registerSuccess") || "Account created successfully", {
          variant: "success",
        });
      }

      onSuccess(response);
    } catch (error) {
      console.error("Auth error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      showAlert(errorMessage, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            isLogin
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("auth.login") || "Log In"}
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            !isLogin
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("auth.register") || "Sign Up"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              {t("auth.username") || "Username"}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  t("auth.usernamePlaceholder") || "Choose a username"
                }
                className="pl-9"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {t("auth.email") || "Email"}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder") || "Enter your email"}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {t("auth.password") || "Password"}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                t("auth.passwordPlaceholder") || "Enter your password"
              }
              className="pl-9"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          icon={isLogin ? LogIn : UserPlus}
        >
          {loading
            ? t("common.loading") || "Processing..."
            : isLogin
              ? t("auth.loginButton") || "Log In"
              : t("auth.registerButton") || "Create Account"}
        </Button>
      </form>
    </div>
  );
};
