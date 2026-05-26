import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { WhatItIs } from "./components/WhatItIs";
import { EditorialImagery } from "./components/EditorialImagery";
import { HowEliteTeeWorks } from "./components/HowEliteTeeWorks";
import { HostRegions } from "./components/HostRegions";
import { MembershipPriorities } from "./components/MembershipPriorities";
import { MemberStandards } from "./components/MemberStandards";
import { ClosingCta } from "./components/ClosingCta";
import { RequestIntroduction } from "./components/RequestIntroduction";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <EditorialImagery />
        <HostRegions />
        <WhatItIs />
        <HowEliteTeeWorks />
        <MembershipPriorities />
        <MemberStandards />
        <ClosingCta />
        <RequestIntroduction />
      </main>
      <Footer />
    </>
  );
}
