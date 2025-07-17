// src/pages/ArticleDetail.jsx
import { useParams, useNavigate } from "react-router";
import { Box, Heading, Text, Button, Badge, Image } from "@chakra-ui/react";
import { useState } from "react";
import { articles } from "../data/articles";
import PaymentComponent from "../components/PaymentComponent";

function ArticleDetail(props) {
  const { id } = useParams();
  const article = articles.find((a) => a.id === parseInt(id)) || {};
  const navigate = useNavigate();

  const [isUnlocked, setIsUnlocked] = useState(false); // Zustand wird von PaymentComponent gesteuert

  const isPremium = article.type === "premium";
  const teaser = article.fullContent?.substring(0, 100) + "...";

  const handleBackToHome = () => {
    navigate("/");
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
      <Badge colorScheme={!isPremium ? "green" : "yellow"} mt={2}>
        {article.type.toUpperCase()}
      </Badge>
      {isPremium && !isUnlocked ? (
        <>
          <Text mt={4}>{teaser}</Text>
          <Box h={"10"}></Box>
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
