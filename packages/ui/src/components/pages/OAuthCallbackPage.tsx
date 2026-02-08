/**
 * OAuth Callback Page
 * Handles the OAuth redirect and sends tokens back to the main window
 */

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription || error);

        // Send error to opener
        if (window.opener) {
          window.opener.postMessage(
            { type: "oauth_callback", error: errorDescription || error },
            window.location.origin,
          );
        }
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Missing authorization code or state");
        return;
      }

      // Send code and state to opener
      if (window.opener) {
        window.opener.postMessage(
          { type: "oauth_callback", code, state },
          window.location.origin,
        );
        setStatus("success");
        setMessage("Authentication successful! You can close this window.");

        // Auto-close after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        setStatus("error");
        setMessage(
          "Unable to communicate with the main window. Please close this window and try again.",
        );
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-2xl max-w-sm w-full">
        {status === "processing" && (
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#667eea] rounded-full mx-auto mb-6 animate-spin" />
        )}

        {status === "success" && (
          <div className="w-20 h-20 rounded-full bg-emerald-500 mx-auto mb-6 flex items-center justify-center">
            <svg
              viewBox="0 0 52 52"
              className="w-12 h-12 stroke-white stroke-[3] fill-none"
            >
              <polyline points="14,26 22,34 38,18" />
            </svg>
          </div>
        )}

        {status === "error" && (
          <div className="w-20 h-20 rounded-full bg-red-500 mx-auto mb-6 flex items-center justify-center">
            <svg
              viewBox="0 0 52 52"
              className="w-12 h-12 stroke-white stroke-[3] fill-none"
            >
              <line x1="16" y1="16" x2="36" y2="36" />
              <line x1="36" y1="16" x2="16" y2="36" />
            </svg>
          </div>
        )}

        <h1 className="text-gray-800 dark:text-white text-2xl font-bold mb-3">
          {status === "processing" && "Processing..."}
          {status === "success" && "Success!"}
          {status === "error" && "Authentication Failed"}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-6">
          {message}
        </p>

        {status !== "processing" && (
          <button
            onClick={() => window.close()}
            className="w-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white border-none rounded-lg py-3.5 px-8 text-base font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          >
            Close Window
          </button>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-lg font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            Cham Lang
          </div>
          <p className="text-xs text-gray-400 mt-1">Adapt to Learn</p>
        </div>
      </div>
    </div>
  );
};
