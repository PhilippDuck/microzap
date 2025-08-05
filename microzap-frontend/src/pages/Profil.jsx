import { Box, Heading, Text, VStack, Button } from "@chakra-ui/react";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router";

function Profile() {
  const { isAuthenticated, logout, deleteAccount } = useContext(AuthContext);
  const [walletId, setWalletId] = useState(null);
  const [accountStatus, setAccountStatus] = useState("free");
  const [premiumEnd, setPremiumEnd] = useState(null);
  const [premiumStart, setPremiumStart] = useState(null); // Neu: Für die 24h-Überprüfung
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWithdrawQR, setShowWithdrawQR] = useState(false); // Neu: Steuert die Anzeige des QR-Codes
  const [withdrawLnurl, setWithdrawLnurl] = useState(null); // Neu: Speichert die LNURL für Withdraw (optional, falls benötigt)
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // Neu: Speichert die QR-Code-URL vom Backend
  const navigate = useNavigate();

  const fetchUserInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        const response = await axios.get("http://localhost:3001/user-info", {
          withCredentials: true,
        });

        const data = response.data;
        console.log(data);
        setWalletId(data.walletId);
        setAccountStatus(data.status);
        setPremiumEnd(
          data.premiumEnd
            ? new Date(data.premiumEnd).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null
        );
        setPremiumStart(
          data.premiumStart
            ? new Date(data.premiumStart).toISOString() // Speichere als ISO-String für Berechnungen
            : null
        );
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
      setError("Fehler beim Abrufen der Profilinformationen");
      toaster.create({
        title: "Fehler",
        description: "Fehler beim Abrufen der Profilinformationen",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [isAuthenticated]);

  const handleDeleteAccount = () => {
    deleteAccount(); // Rufe die deleteAccount-Funktion aus AuthContext auf
    navigate("/"); // Weiterleitung zur Startseite
  };

  const handleRefund = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3001/initiate-premium-refund",
        {},
        { withCredentials: true }
      );
      setWithdrawLnurl(response.data.lnurl); // Optional: Falls du die LNURL noch brauchst
      setQrCodeUrl(response.data.qrCodeUrl); // Angenommen, Backend sendet { lnurl: "lnurl1...", qrCodeUrl: "data:image/png;base64,..." oder eine URL }
      setShowWithdrawQR(true);
      toaster.create({
        title: "Erfolg",
        description:
          "Scan den QR-Code mit deiner Wallet, um das Geld zurückzuholen.",
        type: "success",
      });
    } catch (err) {
      console.error("Error initiating refund:", err);
      toaster.create({
        title: "Fehler",
        description: "Fehler beim Initiieren der Rückerstattung",
        type: "error",
      });
    }
  };

  // Polling für Withdraw-Status nach Anzeige des QR-Codes
  useEffect(() => {
    if (!showWithdrawQR) return;

    const checkWithdrawStatus = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/check-withdraw-status",
          {
            withCredentials: true,
          }
        );
        if (response.data.withdrawn) {
          await fetchUserInfo(); // Aktualisiere Profil-Daten
          setShowWithdrawQR(false);
          toaster.create({
            title: "Erfolg",
            description: "Rückerstattung abgeschlossen, Premium deaktiviert.",
            type: "success",
          });
        }
      } catch (err) {
        console.error("Error checking withdraw status:", err);
      }
    };

    const intervalId = setInterval(checkWithdrawStatus, 3000);

    return () => clearInterval(intervalId);
  }, [showWithdrawQR]);

  // Überprüfung, ob Rückerstattung möglich (weniger als 24 Stunden seit Premium-Start)
  const isRefundPossible =
    isAuthenticated &&
    accountStatus === "premium" &&
    premiumStart &&
    Date.now() - new Date(premiumStart).getTime() < 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

  if (error) {
    return (
      <Box maxW="container.lg" mx="auto" p={4}>
        <VStack spacing={4} align="start">
          <Heading size="xl">Dein Profil</Heading>
          <Text color="red.500">{error}</Text>
          <Button variant="outline" size="xs" onClick={() => navigate("/")}>
            Zurück
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box maxW="container.lg" mx="auto" p={4}>
      <Button variant="outline" size="xs" onClick={() => navigate("/")}>
        Zurück
      </Button>
      <Box h="5" />
      <VStack spacing={4} align="start">
        <Heading size="xl">Dein Profil</Heading>
        {!isAuthenticated && (
          <Text>Bitte logge dich ein, um dein Profil zu sehen.</Text>
        )}
        {loading ? (
          <Text>Lade Profilinformationen...</Text>
        ) : (
          <>
            <Text>
              <strong>Wallet ID:</strong> {walletId || "Nicht verfügbar"}
            </Text>
            <Text>
              <strong>Account Status:</strong> {accountStatus}
            </Text>
            {accountStatus === "premium" && premiumEnd && (
              <Text>
                <strong>Premium läuft bis:</strong> {premiumEnd}
              </Text>
            )}
            {isRefundPossible && (
              <>
                <Text>
                  Du kannst dein Premium innerhalb der ersten 24 Stunden
                  kündigen und das Geld zurückholen.
                </Text>
                <Button
                  colorPalette="green"
                  variant="solid"
                  onClick={handleRefund}
                >
                  Geld zurückholen und Premium kündigen
                </Button>
              </>
            )}
            {showWithdrawQR && qrCodeUrl && (
              <VStack spacing={4} align="center" mt={4}>
                <Text>
                  Scan diesen QR-Code mit deiner Lightning-Wallet, um die
                  Rückerstattung durchzuführen:
                </Text>
                <img
                  src={qrCodeUrl}
                  alt="Withdraw QR Code"
                  style={{ width: "256px", height: "256px" }}
                />
                <Text>Überprüfe den Status automatisch...</Text>{" "}
                {/* Aktualisierter Text */}
              </VStack>
            )}
            <Button
              colorPalette="red"
              variant="outline"
              onClick={handleDeleteAccount}
            >
              Account löschen
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
}

export default Profile;
