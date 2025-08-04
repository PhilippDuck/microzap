import { useState, useEffect } from "react";
import { Text, Button, Image, Spinner, Box } from "@chakra-ui/react";
import { FaBitcoin } from "react-icons/fa";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router";
import { toaster } from "@/components/ui/toaster";

function GetPremium() {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [paymentHash, setPaymentHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [price, setPrice] = useState(null); // Initial null, dynamisch laden

  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        if (isAuthenticated) {
          const response = await axios.get("http://localhost:3001/user-info", {
            withCredentials: true,
          });
          const data = response.data;
          setIsPremium(data.status === "premium");
        }
      } catch (err) {
        console.error("Error checking premium status:", err);
        setError("Fehler beim Abrufen des Premium-Status");
        toaster.create({
          title: "Fehler",
          description: "Fehler beim Abrufen des Premium-Status",
          type: "error",
        });
      }
    };
    const fetchPrice = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/get-price?articleId=premium",
          { withCredentials: true }
        );
        const data = response.data;
        setPrice(data.amount);
        console.log("Fetched price for premium:", data.amount);
      } catch (err) {
        console.error("Error fetching price:", err);
        setPrice(100); // Fallback auf 100 Satoshis
        setError("Fehler beim Abrufen des Preises, Fallback auf 100 Sat");
        toaster.create({
          title: "Warnung",
          description: "Fehler beim Abrufen des Preises, Fallback auf 100 Sat",
          type: "warning",
        });
      }
    };
    if (isAuthenticated) {
      checkPremiumStatus();
      fetchPrice();
    }
  }, [isAuthenticated]);

  const createPremiumInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Creating premium invoice for articleId: premium");
      const response = await axios.post(
        "http://localhost:3001/create-invoice",
        { type: "premium", articleId: "premium" },
        { withCredentials: true }
      );
      console.log("Full response:", response); // Logge die gesamte Response
      if (response.status === 200) {
        // Prüfe spezifisch auf 201
        const data = response.data;
        console.log("Invoice data:", data);
        if (data.paymentRequest && data.paymentHash && data.qrCode) {
          setInvoice(data.paymentRequest);
          setQrCode(data.qrCode);
          setPaymentHash(data.paymentHash);
        } else {
          throw new Error("Ungültige Antwortdaten von /create-invoice");
        }
      } else {
        throw new Error(`Unerwarteter Statuscode: ${response.status}`);
      }
    } catch (err) {
      console.error(
        "Error creating invoice:",
        err.response ? err.response.data : err.message
      );
      setError(
        `Fehler beim Erstellen der Premium-Rechnung: ${
          err.response?.data?.error || err.message
        }`
      );
      toaster.create({
        title: "Fehler",
        description: `Fehler beim Erstellen der Premium-Rechnung: ${
          err.response?.data?.error || err.message
        }`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPayment = async (hash) => {
    try {
      console.log("Checking payment for hash:", hash);
      const response = await axios.get(
        `http://localhost:3001/check-payment/${hash}?type=premium`,
        { withCredentials: true }
      );
      const data = response.data;
      console.log("Payment check response:", data);
      if (data.paid) {
        setIsPremium(true);
        setInvoice(null);
        setQrCode(null);
        setPaymentHash(null);
        toaster.create({
          title: "Premium aktiviert",
          description: "Dein Premium-Zugang wurde erfolgreich aktiviert!",
          type: "success",
        });
      }
    } catch (err) {
      console.error(
        "Error checking payment:",
        err.response ? err.response.data : err.message
      );
      setError(
        "Fehler beim Überprüfen der Premium-Zahlung: " +
          (err.response?.data?.error || err.message)
      );
      toaster.create({
        title: "Fehler",
        description: "Fehler beim Überprüfen der Premium-Zahlung",
        type: "error",
      });
    }
  };

  useEffect(() => {
    let interval;
    if (paymentHash && !isPremium) {
      interval = setInterval(() => checkPayment(paymentHash), 3000); // Alle 1 Sekunde prüfen
    }
    return () => clearInterval(interval); // Cleanup
  }, [paymentHash, isPremium]);

  if (isPremium) {
    return (
      <Box>
        <Text>Du hast bereits einen Premium-Zugang.</Text>
        <Button variant="outline" size="xs" onClick={() => navigate("/")}>
          Zurück
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button variant="outline" size="xs" onClick={() => navigate("/")}>
        Zurück
      </Button>
      <Box h="5px" />
      {error && <Text color="red.500">{error}</Text>}
      {!isAuthenticated ? (
        <Text>Bitte logge dich ein, um Premium zu kaufen.</Text>
      ) : loading ? (
        <Box>
          <Spinner size="sm" />
          <Text>Erstelle Rechnung...</Text>
        </Box>
      ) : qrCode ? (
        <Box>
          <Text>Scanne den QR-Code mit deiner Lightning-Wallet:</Text>
          <Image
            src={qrCode}
            alt="Premium Payment QR Code"
            style={{ borderRadius: "10px" }}
          />
        </Box>
      ) : (
        <Button
          colorScheme="yellow"
          leftIcon={<FaBitcoin />}
          onClick={createPremiumInvoice}
          isLoading={loading}
          isDisabled={loading}
        >
          Premium kaufen ({price || 100} Sat)
        </Button>
      )}
    </Box>
  );
}

export default GetPremium;
