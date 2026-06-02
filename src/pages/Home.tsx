import { Navbar } from "../components/Navbar";
import { EditorialSpread } from "../components/EditorialSpread";
import { WhatEliteTeeIsNot } from "../components/WhatEliteTeeIsNot";
import { WhatItIs } from "../components/WhatItIs";
import { HowMembershipWorks } from "../components/HowMembershipWorks";
import { MembershipPriorities } from "../components/MembershipPriorities";
import { MemberStandards } from "../components/MemberStandards";
import { RequestIntroductionOverview } from "../components/RequestIntroductionOverview";
import { RequestIntroduction } from "../components/RequestIntroduction";
import { Footer } from "../components/Footer";

export function Home() {
  return (
    <>
      <Navbar />
      <main>
        <EditorialSpread />
        <WhatEliteTeeIsNot />
        <WhatItIs />
        <HowMembershipWorks />
        <MembershipPriorities />
        <MemberStandards />
        <RequestIntroductionOverview />
        <RequestIntroduction />
      </main>
      <Footer />
    </>
  );
}
