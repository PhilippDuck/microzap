import { Box, Flex, Heading, Button } from "@chakra-ui/react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext"; // Passe den Pfad an
import LoginDialog from "./LoginDialog"; // Passe den Pfad an
import { FaRegUser } from "react-icons/fa";
import { MdLogout, MdOutlineDiamond } from "react-icons/md";

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
          <Button variant="outline" colorPalette="yellow">
            <MdOutlineDiamond /> Get Premium
          </Button>

          {isAuthenticated ? (
            <>
              <Button variant="outline">
                <FaRegUser />
                Profil
              </Button>
              <Button variant="outline" colorPalette="red" onClick={logout}>
                <MdLogout />
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
