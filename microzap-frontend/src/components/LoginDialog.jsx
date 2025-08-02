import {
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
  Center,
  DialogRootProvider,
  useDialog,
  Button,
  Heading,
} from "@chakra-ui/react";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext"; // Passe den Pfad an
import { MdLogin } from "react-icons/md";

function LoginDialog() {
  const dialog = useDialog();
  const { qrCode, loading, error, loginSuccess, login } =
    useContext(AuthContext);

  // Starte Login, wenn Dialog geöffnet wird
  useEffect(() => {
    if (dialog.open && !qrCode && !loading && !error && !loginSuccess) {
      login(); // Rufe Context-Login auf
    }
  }, [dialog.open, qrCode, loading, error, loginSuccess, login]);

  return (
    <DialogRootProvider value={dialog}>
      <DialogTrigger asChild>
        <Button variant="outline" colorScheme="whiteAlpha">
          <MdLogin />
          Login
        </Button>
      </DialogTrigger>
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login mit Bitcoin Lightning Wallet</DialogTitle>
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
                  <Button mt={4} variant="solid" onClick={login}>
                    Retry
                  </Button>
                </>
              ) : qrCode ? (
                <>
                  <Text textAlign="center">
                    Scanne diesen Code mit deiner Lightning Wallet um dich
                    einzuloggen:
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
  );
}

export default LoginDialog;
