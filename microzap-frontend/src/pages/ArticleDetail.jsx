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
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";

function ArticleDetail(props) {
  const { id } = useParams();
  const article = articles.find((a) => a.id === parseInt(id)) || {};
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Zustand für Initialprüfung
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [error, setError] = useState(null);

  const isPremiumArticle = article.type === "premium";
  const teaser = article.fullContent?.substring(0, 100) + "...";

  const handleBackToHome = () => {
    navigate("/");
  };

  // Funktion zum Überprüfen des Premium-Status
  const checkPremiumStatus = async () => {
    try {
      if (isAuthenticated) {
        const response = await axios.get("http://localhost:3001/user-info", {
          withCredentials: true,
        });
        const data = response.data;
        setIsPremiumUser(data.status === "premium");
        console.log("Premium status checked:", data.status);
      } else {
        setIsPremiumUser(false);
      }
    } catch (err) {
      console.error("Error checking premium status:", err);
      setError("Fehler beim Abrufen des Premium-Status");
      toaster.create({
        title: "Fehler",
        description: "Fehler beim Abrufen des Premium-Status",
        type: "error",
      });
    } finally {
      setInitialLoading(false); // Prüfung abgeschlossen
    }
  };

  // Prüfung beim Laden der Seite
  useEffect(() => {
    checkPremiumStatus();

    // Prüfen, ob der Artikel bereits bezahlt wurde (für nicht-Premium-Nutzer)
    if (!isPremiumUser && isPremiumArticle) {
      const paidArticles = JSON.parse(
        localStorage.getItem("paidArticles") || "[]"
      );
      const existingEntry = paidArticles.find(
        (item) => item.id === id.toString()
      );
      if (existingEntry) {
        setIsUnlocked(true); // Setze isUnlocked, wenn bereits bezahlt
      }
    }
  }, [id, isAuthenticated, isPremiumArticle, isPremiumUser]);

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
      <Button variant={"outline"} size={"xs"} onClick={handleBackToHome}>
        Zurück
      </Button>
      <Box h={"5"}></Box>
      <Heading size="lg">{article.title}</Heading>
      <Text fontSize="sm" color="gray.500" mt={1}>
        {article.date} | {article.author}
      </Text>
      <Badge colorScheme={!isPremiumArticle ? "green" : "yellow"} mt={2}>
        {article.type.toUpperCase()}
      </Badge>
      {isPurchased() && <Badge colorScheme="gray">GEKAUFT</Badge>}
      {error && (
        <Text color="red.500" mt={2}>
          {error}
        </Text>
      )}
      {isPremiumArticle && !isPremiumUser && !isUnlocked ? (
        <>
          <Text mt={4}>{teaser}</Text>
          <PaymentComponent
            articleId={id}
            isPremium={isPremiumArticle}
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
