import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toaster } from "@/components/ui/toaster";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [qrCode, setQrCode] = useState(null); // QR-Code im Context managen
  const [k1, setK1] = useState(null); // k1 im Context managen
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAuthCode = async () => {
    setLoading(true);
    setError(null);
    setLoginSuccess(false);
    try {
      const response = await axios.get("http://localhost:3001/lnurl-auth"); // Verwende Axios für Konsistenz
      const data = response.data;
      setQrCode(data.qrCode);
      setK1(data.k1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    await fetchAuthCode(); // Starte den Login-Prozess
    // Polling wird in useEffect gehandhabt
  };

  const logout = async () => {
    try {
      setIsAuthenticated(false);
      setQrCode(null);
      setK1(null);
      setLoginSuccess(false);
      // Optional: Backend-Cookie löschen, falls HTTP-Only
      toaster.create({
        title: "Logout erfolgreich",
        type: "success",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Polling useEffect (ähnlich wie in deinem Code, aber im Context)
  useEffect(() => {
    let pollTimer;
    if (k1 && !loginSuccess) {
      pollTimer = setInterval(async () => {
        try {
          const response = await axios.get(
            `http://localhost:3001/login-status/${k1}`,
            {
              withCredentials: true, // Wichtig für Cookies
            }
          );
          const data = response.data;
          if (data.status === "success") {
            setLoginSuccess(true);
            setIsAuthenticated(true);
            setQrCode(null);
            setK1(null);
            setLoginSuccess(false);
            toaster.create({
              title: "Login erfolgreich",
              type: "success",
            });
          } else if (data.status === "not_found") {
            setError("k1 nicht gefunden oder abgelaufen");
            toaster.create({
              title: "Problem beim einloggen",
              type: "error",
            });
          }
        } catch (err) {
          setError("Fehler beim Überprüfen des Login-Status");
        }
      }, 3000);
    }

    const timeout = setTimeout(() => {
      if (pollTimer) {
        setError("Login-Versuch abgelaufen");
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollTimer);
      clearTimeout(timeout);
    };
  }, [k1, loginSuccess]);

  // Status-Check bei App-Start
  useEffect(() => {
    console.log(" Auth Status");
    const checkAuthStatus = async () => {
      try {
        const res = await axios.get("/api/auth/status", {
          withCredentials: true,
        });
        setIsAuthenticated(res.data.isAuthenticated);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        qrCode,
        loading,
        error,
        loginSuccess,
      }}
    >
      <Toaster />
      {children}
    </AuthContext.Provider>
  );
};
