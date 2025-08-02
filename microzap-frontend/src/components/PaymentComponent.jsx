// src/components/PaymentComponent.jsx
import { useState, useEffect } from "react";
import { Text, Button, Image, Spinner, Box } from "@chakra-ui/react";
import { FaBitcoin } from "react-icons/fa";

function PaymentComponent(props) {
  const { articleId, isPremium, onUnlock } = props;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [paymentHash, setPaymentHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [price, setPrice] = useState(10); // Standardpreis, wird vom Server überschrieben

  // Funktion zum Abrufen des Preises vom Server
  const fetchPrice = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/get-price?articleId=${articleId}`
      );
      const data = await response.json();
      if (response.ok) {
        setPrice(data.amount || 10); // Fallback auf 10 Satoshis
      } else {
        throw new Error(data.error || "Fehler beim Abrufen des Preises");
      }
    } catch (err) {
      setError("Fehler beim Abrufen des Preises: " + err.message);
    }
  };

  // Funktion zum Erstellen einer Rechnung
  const createInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3001/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "article", articleId }),
      });
      const data = await response.json();
      if (response.ok) {
        setInvoice(data.paymentRequest);
        setQrCode(data.qrCode);
        setPaymentHash(data.paymentHash);
      } else {
        throw new Error(data.error || "Fehler beim Erstellen der Rechnung");
      }
    } catch (err) {
      setError("Fehler beim Erstellen der Rechnung: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funktion zum Überprüfen der Zahlung
  const checkPayment = async (hash) => {
    try {
      const response = await fetch(
        `http://localhost:3001/check-payment/${hash}`
      );
      const data = await response.json();
      if (data.paid) {
        setIsUnlocked(true);
        setInvoice(null);
        setQrCode(null);
        setPaymentHash(null);
        // Speichere in JSON-Struktur
        const paidArticles = JSON.parse(
          localStorage.getItem("paidArticles") || "[]"
        );
        const existingEntry = paidArticles.find(
          (item) => item.id === articleId
        );
        const timestamp = new Date().toISOString();
        if (!existingEntry) {
          paidArticles.push({ id: articleId, hash, paidDate: timestamp });
          localStorage.setItem("paidArticles", JSON.stringify(paidArticles));
        }
        if (onUnlock) onUnlock();
      } else {
        // Entferne ungültige Einträge
        const paidArticles = JSON.parse(
          localStorage.getItem("paidArticles") || "[]"
        );
        const existingEntry = paidArticles.find((item) => item.hash === hash);
        if (existingEntry) {
          const updatedArticles = paidArticles.filter(
            (item) => item.hash !== hash
          );
          localStorage.setItem("paidArticles", JSON.stringify(updatedArticles));
        }
      }
    } catch (err) {
      setError("Fehler beim Überprüfen der Zahlung: " + err.message);
    }
  };

  // Effekt zum Laden des Preises und Prüfen des Kaufs beim Mount
  useEffect(() => {
    fetchPrice(); // Preis beim Laden holen

    // Prüfen, ob der Artikel bereits bezahlt wurde
    const paidArticles = JSON.parse(
      localStorage.getItem("paidArticles") || "[]"
    );
    const existingEntry = paidArticles.find((item) => item.id === articleId);
    if (existingEntry) {
      checkPayment(existingEntry.hash); // Überprüfe den gespeicherten Hash beim Laden
    }

    let interval;
    if (paymentHash && !isUnlocked) {
      interval = setInterval(() => checkPayment(paymentHash), 1000); // Alle 1 Sekunde prüfen
    }
    return () => clearInterval(interval); // Cleanup
  }, [paymentHash, isUnlocked, articleId]);

  // Rendern
  if (isUnlocked) return null; // Wenn entsperrt, nichts rendern
  return (
    <>
      {qrCode ? (
        <Box>
          <Text mt={2}>Scanne den QR-Code mit deiner Lightning-Wallet:</Text>
          <Image src={qrCode} alt="Payment QR Code" rounded={10} />
          {error && (
            <Text color="red.500" mt={2}>
              {error}
            </Text>
          )}
        </Box>
      ) : (
        <Button
          mt={4}
          colorPalette="yellow"
          onClick={createInvoice}
          isLoading={loading}
          isDisabled={loading}
          spinnerPlacement="start"
        >
          {loading ? (
            <>
              <Spinner size="sm" mr={2} />
              erstelle QR-Code
            </>
          ) : (
            <>
              <FaBitcoin />
              Artikel kaufen ({price} Sat)
            </>
          )}
        </Button>
      )}
    </>
  );
}

export default PaymentComponent;
