import { Routes, Route } from "react-router";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import ArticleDetail from "./pages/ArticleDetail.jsx";
import Profile from "./pages/Profil.jsx";
import { Box, Center } from "@chakra-ui/react";

function App(props) {
  return (
    <>
      <Navbar />
      <Center p={"2"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          <Route path="/profile/" element={<Profile />} />
        </Routes>
      </Center>
    </>
  );
}

export default App;
