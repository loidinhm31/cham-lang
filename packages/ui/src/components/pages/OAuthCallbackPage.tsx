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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "48px 40px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        {status === "processing" && (
          <>
            <div
              style={{
                width: "60px",
                height: "60px",
                border: "4px solid #e5e7eb",
                borderTopColor: "#667eea",
                borderRadius: "50%",
                margin: "0 auto 24px",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>
              {`
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                            `}
            </style>
          </>
        )}

        {status === "success" && (
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#10b981",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 52 52"
              style={{
                width: "48px",
                height: "48px",
                stroke: "white",
                strokeWidth: 3,
                fill: "none",
              }}
            >
              <polyline points="14,26 22,34 38,18" />
            </svg>
          </div>
        )}

        {status === "error" && (
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#ef4444",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 52 52"
              style={{
                width: "48px",
                height: "48px",
                stroke: "white",
                strokeWidth: 3,
                fill: "none",
              }}
            >
              <line x1="16" y1="16" x2="36" y2="36" />
              <line x1="36" y1="16" x2="16" y2="36" />
            </svg>
          </div>
        )}

        <h1
          style={{
            color: "#1f2937",
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          {status === "processing" && "Processing..."}
          {status === "success" && "Success!"}
          {status === "error" && "Authentication Failed"}
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "16px",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          {message}
        </p>

        {status !== "processing" && (
          <button
            onClick={() => window.close()}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "14px 32px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Close Window
          </button>
        )}

        <div
          style={{
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Cham Lang
          </div>
          <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
            Adapt to Learn
          </p>
        </div>
      </div>
    </div>
  );
};
