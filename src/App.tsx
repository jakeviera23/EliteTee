import { Navbar } from "./components/Navbar";
import { EditorialSpread } from "./components/EditorialSpread";
import { WhatItIs } from "./components/WhatItIs";
import { HowMembershipWorks } from "./components/HowMembershipWorks";
import { MemberStandards } from "./components/MemberStandards";
import { RequestIntroduction } from "./components/RequestIntroduction";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <EditorialSpread />
        <WhatItIs />
        <HowMembershipWorks />
        <MemberStandards />
        <RequestIntroduction />
      </main>
      <Footer />
    </>
  );
}
