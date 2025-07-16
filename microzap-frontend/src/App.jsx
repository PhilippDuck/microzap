import Navbar from "./components/Navbar";
import Home from "./Home";
import { Center } from "@chakra-ui/react";

function App() {
  return (
    <>
      <Navbar />
      <Center>
        {" "}
        <Home />
      </Center>
    </>
  );
}

export default App;
