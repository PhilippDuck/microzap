import { Link } from "react-router"; // Add this import
import { Box, Flex, Heading, Button } from "@chakra-ui/react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import LoginDialog from "./LoginDialog";

function Navbar(props) {
  const { isAuthenticated, logout } = useContext(AuthContext);

  return (
    <Box bg="primary" p={4} top={0} left={0} right={0} zIndex={10}>
      <Flex
        maxW="container.lg"
        mx="auto"
        align="center"
        justify="space-between"
      >
        <Heading size="2xl">MicroZap</Heading>
        <Flex gap={4}>
          <Button
            as={Link}
            to="/getpremium"
            variant="outline"
            colorScheme="whiteAlpha"
            colorPalette="yellow"
          >
            Get Premium
          </Button>

          {isAuthenticated ? (
            <>
              {" "}
              <Button
                as={Link}
                to="/profile"
                variant="outline"
                colorScheme="whiteAlpha"
              >
                Profil
              </Button>
              <Button variant="outline" colorPalette="red" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <LoginDialog />
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;
