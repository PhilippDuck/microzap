// src/pages/ArticleDetail.jsx
import { useParams, useNavigate } from "react-router";
import {
  Box,
  Heading,
  Text,
  Button,
  Badge,
  Image,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { articles } from "../data/articles";
import PaymentComponent from "../components/PaymentComponent";

function ArticleDetail(props) {
  const { id } = useParams();
  const article = articles.find((a) => a.id === parseInt(id)) || {};
  const navigate = useNavigate();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Zustand für Initialprüfung

  const isPremium = article.type === "premium";
  const teaser = article.fullContent?.substring(0, 100) + "...";

  const handleBackToHome = () => {
    navigate("/");
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
      }
    } catch (err) {
      console.error("Fehler beim Überprüfen der Zahlung:", err.message);
    } finally {
      setInitialLoading(false); // Prüfung abgeschlossen
    }
  };

  // Prüfung beim Laden der Seite
  useEffect(() => {
    const storedHash = localStorage.getItem(id);
    if (storedHash) {
      checkPayment(storedHash); // Prüfe den gespeicherten Hash
    } else {
      setInitialLoading(false); // Kein Hash, sofort rendern
    }
  }, [id]);

  // Rendern mit Spinner während der Initialprüfung
  if (initialLoading) {
    return (
      <Center height="100vh">
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="xl"
        />
      </Center>
    );
  }

  // Prüfe, ob der Artikel im localStorage als gekauft markiert ist
  const isPurchased = () => {
    const paidArticles = JSON.parse(
      localStorage.getItem("paidArticles") || "[]"
    );
    return paidArticles.some((item) => item.id === id.toString());
  };

  return (
    <Box maxW={"4xl"}>
      {" "}
      {/* maxW statt width für Konsistenz */}
      <Button variant={"outline"} size={"xs"} onClick={handleBackToHome}>
        Zurück
      </Button>
      <Box h={"5"}></Box>
      <Heading size="lg">{article.title}</Heading>
      <Text fontSize="sm" color="gray.500" mt={1}>
        {article.date} | {article.author}
      </Text>
      <Badge colorPalette={!isPremium ? "green" : "yellow"} mt={2}>
        {article.type.toUpperCase()}
      </Badge>
      {isPurchased() && <Badge colorPalette="grey">GEKAUFT</Badge>}
      {isPremium && !isUnlocked ? (
        <>
          <Text mt={4}>{teaser}</Text>
          <PaymentComponent
            articleId={id}
            isPremium={isPremium}
            onUnlock={() => setIsUnlocked(true)}
          />
        </>
      ) : (
        <Text mt={4}>{article.fullContent}</Text>
      )}
    </Box>
  );
}

export default ArticleDetail;
