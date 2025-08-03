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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isAuthenticated) {
          const response = await axios.get("http://localhost:3001/user-info", {
            withCredentials: true,
          });
          const data = response.data;
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

    fetchUserInfo();
  }, [isAuthenticated]);

  const handleDeleteAccount = () => {
    deleteAccount(); // Rufe die deleteAccount-Funktion aus AuthContext auf
    navigate("/"); // Weiterleitung zur Startseite
  };

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
