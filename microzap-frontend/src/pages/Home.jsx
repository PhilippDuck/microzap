// src/pages/Home.jsx
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import ArticleCard from "@/components/ArticelCard";
import { articles } from "../data/articles";

const Home = () => {
  return (
    <Box maxW={"8xl"}>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default Home;
