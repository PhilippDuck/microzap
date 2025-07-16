// src/pages/Home.jsx
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import ArticleCard from "./components/ArticelCard";

// Static article data for prototype (hardcoded)
const articles = [
  {
    id: 1,
    title: "Bitcoin Basics",
    description:
      "An introduction to the world of Bitcoin and its fundamentals.",
    date: "2025-07-16",
    author: "Satoshi Nakamoto",
    image: "/path/to/image1.jpg", // Replace with actual image path or URL
    type: "free",
  },
  {
    id: 2,
    title: "Lightning Network Deep Dive",
    description:
      "Exploring the scalability solutions provided by Lightning Network.",
    date: "2025-07-15",
    author: "Joseph Poon",
    image: "/path/to/image2.jpg",
    type: "premium",
  },
  {
    id: 3,
    title: "Lightning Network Deep Dive",
    description:
      "Exploring the scalability solutions provided by Lightning Network.",
    date: "2025-07-15",
    author: "Joseph Poon",
    image: "/path/to/image2.jpg",
    type: "premium",
  },
  {
    id: 4,
    title: "Lightning Network Deep Dive",
    description:
      "Exploring the scalability solutions provided by Lightning Network.",
    date: "2025-07-15",
    author: "Joseph Poon",
    image: "/path/to/image2.jpg",
    type: "premium",
  },
  {
    id: 5,
    title: "Lightning Network Deep Dive",
    description:
      "Exploring the scalability solutions provided by Lightning Network.",
    date: "2025-07-15",
    author: "Joseph Poon",
    image: "/path/to/image2.jpg",
    type: "premium",
  },
  {
    id: 6,
    title: "Lightning Network Deep Dive",
    description:
      "Exploring the scalability solutions provided by Lightning Network.",
    date: "2025-07-15",
    author: "Joseph Poon",
    image: "/path/to/image2.jpg",
    type: "free",
  },
  // Add more articles as needed
];

const Home = () => {
  return (
    <Box p={6} maxW="container.lg" mx="auto">
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default Home;
