// src/components/Navbar.jsx
import {
  Box,
  Flex,
  Heading,
  Button,
  Dialog,
  DialogTrigger,
  Portal,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  CloseButton,
  Image,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";

function Navbar(props) {
  const [isOpen, setIsOpen] = useState(false); // Manuelles Zustandsmanagement
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userId")
  ); // Prüfe localStorage auf userId

  const fetchAuthCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3001/lnurl-auth");
      const data = await response.json();
      console.log("Fetch Response:", data); // Debug-Log
      if (response.ok) {
        setQrCode(data.qrCode);
      } else {
        throw new Error(data.error || "Fehler beim Abrufen des Auth-Codes");
      }
    } catch (err) {
      setError(err.message);
      console.error("Fetch-Fehler:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !qrCode && !error && !loading) {
      fetchAuthCode(); // Starte Fetch nur, wenn Dialog offen ist und noch kein Ergebnis
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("userId"); // Entferne userId beim Logout
    setIsLoggedIn(false);
  };

  // Mock: Simuliere erfolgreichen Login (ersetze mit tatsächlicher Logik)
  const handleAuthSuccess = () => {
    const userId = "mockUserId"; // Ersetze mit tatsächlicher userId aus Callback
    localStorage.setItem("userId", userId);
    setIsLoggedIn(true);
    setIsOpen(false); // Schließe manuell
    setQrCode(null); // Zurücksetzen nach Erfolg
  };

  return (
    <Box bg="primary" p={4} top={0} left={0} right={0} zIndex={10}>
      <Flex
        maxW="container.lg"
        mx="auto"
        align="center"
        justify="space-between"
      >
        <Heading size="2xl">MicroZap</Heading>
        <Flex gap={4}>
          <Button
            variant="outline"
            colorScheme="whiteAlpha"
            colorPalette={"yellow"}
          >
            Get Premium
          </Button>
          <Button variant="outline" colorScheme="whiteAlpha">
            Profil
          </Button>

          <Dialog.Root placement={"center"}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                colorScheme="whiteAlpha"
                onClick={fetchAuthCode}
              >
                Login
              </Button>
            </DialogTrigger>
            <Portal>
              <DialogBackdrop />
              <DialogPositioner>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Login with LNURL Auth</DialogTitle>
                    <DialogCloseTrigger asChild>
                      <CloseButton size="sm" />
                    </DialogCloseTrigger>
                  </DialogHeader>
                  <DialogBody>
                    {loading ? (
                      <Text>Loading Auth Code...</Text>
                    ) : error ? (
                      <Text color="red.500">{error}</Text>
                    ) : qrCode ? (
                      <>
                        <Text>
                          Scan this QR Code with your Lightning Wallet to
                          authenticate:
                        </Text>
                        <Image
                          src={qrCode}
                          alt="Auth QR Code"
                          mx="auto"
                          mt={4}
                          rounded={10}
                        />
                      </>
                    ) : (
                      <Text>Preparing authentication...</Text> // Platzhalter, während fetch läuft
                    )}
                  </DialogBody>

                  <Dialog.CloseTrigger asChild>
                    <CloseButton size="sm" />
                  </Dialog.CloseTrigger>
                </DialogContent>
              </DialogPositioner>
            </Portal>
          </Dialog.Root>
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;
