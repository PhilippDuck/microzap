// src/components/ArticleCard.jsx
import {
  Card,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Flex,
  Badge,
  Text,
} from "@chakra-ui/react"; // Adjusted imports for Anatomy API

function ArticleCard(props) {
  const { article } = props;
  const {
    title,
    description = "No description available",
    date,
    author,
    image = "/fallback-image.jpg",
    type,
  } = article; // Destructure with fallbacks

  return (
    <Card.Root width="flex" shadow="md" borderRadius="md" overflow="hidden">
      <Card.Header>
        <Card.Title mt={2}>{title}</Card.Title>
      </Card.Header>{" "}
      <Card.Body>
        <Card.Description>
          <Text fontSize="sm" color="gray.600">
            {description}
          </Text>
        </Card.Description>
        <Flex justify="space-between" align="center" mt={2}>
          <Text fontSize="sm" color="gray.500">
            {date}
          </Text>
          <Badge colorPalette={type === "free" ? "green" : "yellow"}>
            {type.toUpperCase()}
          </Badge>
        </Flex>
      </Card.Body>
      <Card.Footer justifyContent="flex-end">
        <Button variant="outline" size="sm">
          View
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}

export default ArticleCard;
