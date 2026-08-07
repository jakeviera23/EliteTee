import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { HomeWhatEliteTeeDoes } from "../components/HomeWhatEliteTeeDoes";
import { HomeInsideEliteTee } from "../components/HomeInsideEliteTee";
import { HomeWhyItExists } from "../components/HomeWhyItExists";
import { HomeEarlyNetwork } from "../components/HomeEarlyNetwork";
import { RequestIntroduction } from "../components/RequestIntroduction";
import { HomeCtaBand } from "../components/HomeCtaBand";
import { Footer } from "../components/Footer";

export function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HomeWhatEliteTeeDoes />
        <HomeInsideEliteTee />
        <HomeWhyItExists />
        <HomeEarlyNetwork />
        <RequestIntroduction />
        <HomeCtaBand />
      </main>
      <Footer />
    </>
  );
}
