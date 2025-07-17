// src/components/ArticleCard.jsx
import { useNavigate } from "react-router";
import { Card, Button, Flex, Badge, Text } from "@chakra-ui/react"; // Adjusted imports for Anatomy API

function ArticleCard(props) {
  const { article } = props;
  const {
    id,
    title,
    description = "No description available",
    date,
    author,
    image = "/fallback-image.jpg",
    type,
  } = article; // Destructure with fallbacks
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/article/${id}`);
  };

  return (
    <Card.Root
      width="flex"
      shadow="md"
      borderRadius="md"
      overflow="hidden"
      cursor="pointer"
      onClick={handleClick}
    >
      <Card.Header>
        <Card.Title mt={2}>{title}</Card.Title>
      </Card.Header>{" "}
      <Card.Body>
        <Card.Description>{description}</Card.Description>
        <Flex justify="space-between" align="center" mt={2}>
          <Text fontSize="sm" color="gray.500">
            {date}
          </Text>
          <Badge colorPalette={type === "free" ? "green" : "yellow"}>
            {type.toUpperCase()}
          </Badge>
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}

export default ArticleCard;
