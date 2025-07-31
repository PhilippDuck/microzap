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
  VStack,
  Text,
  Spinner,
  Center,
  DialogRootProvider,
  useDialog,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";

function Navbar(props) {
  const dialog = useDialog(); // Dialog-Hook initialisieren
  const [qrCode, setQrCode] = useState(null);
  const [k1, setK1] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userId")
  );

  const fetchAuthCode = async () => {
    console.log("fetchAuthCode gestartet");
    setLoading(true);
    setError(null);
    setLoginSuccess(false);
    try {
      const response = await fetch("http://localhost:3001/lnurl-auth");
      const data = await response.json();
      console.log("Fetch Response:", data);
      if (response.ok) {
        setQrCode(data.qrCode);
        setK1(data.k1);
      } else {
        throw new Error(data.error || "Fehler beim Abrufen des Auth-Codes");
      }
    } catch (err) {
      setError(err.message);
      console.error("Fetch-Fehler:", err);
    } finally {
      setLoading(false);
      console.log("fetchAuthCode abgeschlossen");
    }
  };

  // Innerhalb des Polling useEffect
  useEffect(() => {
    let pollTimer;

    if (dialog.open && k1 && !loginSuccess) {
      console.log("Polling gestartet für k1:", k1);
      pollTimer = setInterval(async () => {
        try {
          const response = await fetch(
            `http://localhost:3001/login-status/${k1}`
          );
          const data = await response.json();
          console.log("Login Status Response:", data);
          if (data.status === "success") {
            setLoginSuccess(true);
            // Verzögere das Schließen des Dialogs und setIsLoggedIn
            setTimeout(() => {
              console.log("Schließe Dialog nach erfolgreichem Login");
              setIsLoggedIn(true); // Jetzt erst isLoggedIn setzen
              setQrCode(null);
              setK1(null);
              setLoginSuccess(false);
            }, 5000); // 5 Sekunden Verzögerung
          } else if (data.status === "not_found") {
            setError("k1 nicht gefunden oder abgelaufen");
          }
        } catch (err) {
          console.error("Polling-Fehler:", err);
          setError("Fehler beim Überprüfen des Login-Status");
        }
      }, 3000);
    }

    // Cleanup: Polling stoppen bei Timeout (5 Minuten) oder wenn Dialog geschlossen wird
    const timeout = setTimeout(() => {
      if (pollTimer) {
        console.log("Polling gestoppt wegen Timeout");
        setError("Login-Versuch abgelaufen");
        dialog.onClose(); // Dialog schließen bei Timeout
      }
    }, 5 * 60 * 1000);

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        console.log("Polling-Cleanup ausgeführt");
      }
      clearTimeout(timeout);
    };
  }, [dialog.open, k1, loginSuccess, dialog.onClose]);

  // Fetch Auth Code nur, wenn Dialog geöffnet wird
  useEffect(() => {
    console.log(
      "Dialog Zustand:",
      dialog.open,
      "qrCode:",
      qrCode,
      "loading:",
      loading,
      "error:",
      error,
      "loginSuccess:",
      loginSuccess
    );
    if (dialog.open && !qrCode && !loading && !error && !loginSuccess) {
      console.log("Starte fetchAuthCode wegen dialog.open:", dialog.open);
      fetchAuthCode();
    }
  }, [dialog.open]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setQrCode(null);
    setK1(null);
    setLoginSuccess(false);
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
            colorPalette="yellow"
          >
            Get Premium
          </Button>
          <Button variant="outline" colorScheme="whiteAlpha">
            Profil
          </Button>

          {isLoggedIn ? (
            <Button
              variant="outline"
              colorScheme="whiteAlpha"
              onClick={handleLogout}
            >
              Logout
            </Button>
          ) : (
            <DialogRootProvider value={dialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  colorScheme="whiteAlpha"
                  onClick={() => {
                    console.log("Login-Button geklickt");

                    setError(null);
                    setQrCode(null);
                    setK1(null);
                    setLoginSuccess(false);
                  }}
                >
                  Login
                </Button>
              </DialogTrigger>
              <Portal>
                <DialogBackdrop />
                <DialogPositioner>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Login mit Bitcoin Lightning Wallet
                      </DialogTitle>
                      <DialogCloseTrigger asChild>
                        <CloseButton size="sm" />
                      </DialogCloseTrigger>
                    </DialogHeader>
                    <DialogBody
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                    >
                      {loading ? (
                        <Spinner size="lg" />
                      ) : error ? (
                        <>
                          <Text color="red.500">{error}</Text>
                          <Button
                            mt={4}
                            variant="solid"
                            onClick={fetchAuthCode}
                          >
                            Retry
                          </Button>
                        </>
                      ) : loginSuccess ? (
                        <Center>
                          <VStack>
                            <FaCheckCircle size="256px" color="green" />
                            <Heading mt={4} color="green.500">
                              Login erfolgreich!
                            </Heading>
                          </VStack>
                        </Center>
                      ) : qrCode ? (
                        <>
                          <Text textAlign="center">
                            Scanne diesen Code mit deiner Lightning Wallet um
                            dich einzuloggen:
                          </Text>
                          <Image
                            src={qrCode}
                            alt="Auth QR Code"
                            mx="auto"
                            maxW="512px"
                            mt={4}
                            rounded={10}
                          />
                        </>
                      ) : (
                        <Text>Preparing authentication...</Text>
                      )}
                    </DialogBody>
                    <DialogFooter>
                      <DialogCloseTrigger asChild>
                        <CloseButton size="sm" />
                      </DialogCloseTrigger>
                    </DialogFooter>
                  </DialogContent>
                </DialogPositioner>
              </Portal>
            </DialogRootProvider>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;
