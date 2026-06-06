import { Navbar } from "../components/Navbar";
import { EditorialSpread } from "../components/EditorialSpread";
import { WhatEliteTeeIsNot } from "../components/WhatEliteTeeIsNot";
import { HowMembershipWorks } from "../components/HowMembershipWorks";
import { MembershipPriorities } from "../components/MembershipPriorities";
import { MemberStandards } from "../components/MemberStandards";
import { RequestIntroduction } from "../components/RequestIntroduction";
import { Footer } from "../components/Footer";

export function Home() {
  return (
    <>
      <Navbar />
      <main>
        <EditorialSpread />
        <WhatEliteTeeIsNot />
        <HowMembershipWorks />
        <MembershipPriorities />
        <MemberStandards />
        <RequestIntroduction />
      </main>
      <Footer />
    </>
  );
}
