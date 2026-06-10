import { Navbar } from "../components/Navbar";
import { EditorialSpread } from "../components/EditorialSpread";
import { HowMembershipWorks } from "../components/HowMembershipWorks";
import { MemberStandards } from "../components/MemberStandards";
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
        <RequestIntroduction />
      </main>
      <Footer />
    </>
  );
}
