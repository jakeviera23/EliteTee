import { Navbar } from "../components/Navbar";
import { EditorialSpread } from "../components/EditorialSpread";
import { HowMembershipWorks } from "../components/HowMembershipWorks";
import { MemberStandards } from "../components/MemberStandards";
import { WhatEliteTeeIsNot } from "../components/WhatEliteTeeIsNot";
import { RequestIntroduction } from "../components/RequestIntroduction";
import { Footer } from "../components/Footer";

export function Home() {
  return (
    <>
      <Navbar />
      <main>
        <EditorialSpread />
        <HowMembershipWorks />
        <MemberStandards />
        <WhatEliteTeeIsNot />
        <RequestIntroduction />
      </main>
      <Footer />
    </>
  );
}
