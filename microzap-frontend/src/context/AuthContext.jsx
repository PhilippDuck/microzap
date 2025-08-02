import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toaster } from "@/components/ui/toaster";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [k1, setK1] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAuthCode = async () => {
    setLoading(true);
    setError(null);
    setLoginSuccess(false);
    try {
      const response = await axios.get("http://localhost:3001/lnurl-auth", {
        withCredentials: true,
      });
      const data = response.data;
      setQrCode(data.qrCode);
      setK1(data.k1);
    } catch (err) {
      setError(err.message || "Fehler beim Abrufen des Auth-Codes");
      toaster.create({
        title: "Fehler",
        description: err.message || "Fehler beim Abrufen des Auth-Codes",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    await fetchAuthCode();
  };

  const logout = async () => {
    try {
      /*       await axios.post(
        "http://localhost:3001/logout",
        {},
        { withCredentials: true }
      ); */
      setIsAuthenticated(false);
      setQrCode(null);
      setK1(null);
      setLoginSuccess(false);
      toaster.create({
        title: "Logout erfolgreich",
        description: "Du hast dich erfolgreich ausgeloggt.",
        type: "success",
      });
    } catch (err) {
      console.error("Logout failed:", err);
      toaster.create({
        title: "Fehler",
        description: "Logout fehlgeschlagen",
        type: "error",
      });
    }
  };

  // Polling useEffect
  useEffect(() => {
    let pollTimer;
    if (k1 && !loginSuccess) {
      pollTimer = setInterval(async () => {
        try {
          // Lese paidArticles aus localStorage
          const paidArticles =
            JSON.parse(localStorage.getItem("paidArticles")) || [];

          // Sende POST-Request mit paidArticles im Body
          const response = await axios.post(
            `http://localhost:3001/login-status/${k1}`,
            { paidArticles },
            { withCredentials: true }
          );
          const data = response.data;
          if (data.status === "success") {
            // Speichere paidArticles aus der Response in localStorage
            if (Array.isArray(data.paidArticles)) {
              localStorage.setItem(
                "paidArticles",
                JSON.stringify(data.paidArticles)
              );
            } else {
              console.warn(
                "Invalid paidArticles format in response:",
                data.paidArticles
              );
            }

            setLoginSuccess(true);
            setIsAuthenticated(true);
            setQrCode(null);
            setK1(null);
            setLoginSuccess(false);
            toaster.create({
              title: "Login erfolgreich",
              description:
                "Du hast dich erfolgreich mit deiner Lightning Wallet eingeloggt.",
              type: "success",
            });
          } else if (data.status === "not_found") {
            setError("k1 nicht gefunden oder abgelaufen");
            toaster.create({
              title: "Problem beim Einloggen",
              description: "k1 nicht gefunden oder abgelaufen",
              type: "error",
            });
          }
        } catch (err) {
          setError("Fehler beim Überprüfen des Login-Status");
          toaster.create({
            title: "Fehler",
            description: "Fehler beim Überprüfen des Login-Status",
            type: "error",
          });
        }
      }, 3000);
    }

    const timeout = setTimeout(() => {
      if (pollTimer) {
        setError("Login-Versuch abgelaufen");
        toaster.create({
          title: "Fehler",
          description: "Login-Versuch abgelaufen",
          type: "error",
        });
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollTimer);
      clearTimeout(timeout);
    };
  }, [k1, loginSuccess]);

  // Status-Check bei App-Start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await axios.get("http://localhost:3001/auth/status", {
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
