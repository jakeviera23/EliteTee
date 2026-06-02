import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { MemberDirectory } from "./pages/MemberDirectory";
import { RequestIntroductionPage } from "./pages/RequestIntroductionPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/directory" element={<MemberDirectory />} />
      <Route path="/request-introduction" element={<RequestIntroductionPage />} />
    </Routes>
  );
}
