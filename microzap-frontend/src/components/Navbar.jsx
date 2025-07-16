// src/components/Navbar.jsx
import { Box, Flex, Heading, Button } from "@chakra-ui/react";

function Navbar(props) {
  return (
    <Box bg="primary" p={4} top={0} left={0} right={0} zIndex={10}>
      <Flex
        maxW="container.lg"
        mx="auto"
        align="center"
        justify="space-between"
      >
        <Heading size="2xl" color="white">
          MicroZap
        </Heading>{" "}
        {/* Titel – passe ggf. an */}
        <Flex gap={4}>
          <Button
            variant="outline"
            colorScheme="whiteAlpha"
            colorPalette={"yellow"}
          >
            Get Premium
          </Button>
          <Button variant="outline" colorScheme="whiteAlpha">
            Profil
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;
