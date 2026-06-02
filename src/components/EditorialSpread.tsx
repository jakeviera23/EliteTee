import { Hero } from "./Hero";
import { WhatMembersReceive } from "./WhatMembersReceive";
import { RealIntroductionExamples } from "./RealIntroductionExamples";
import { MemberIntroductionExamples } from "./MemberIntroductionExamples";
import { EditorialImagery } from "./EditorialImagery";
import { HostRegions } from "./HostRegions";

/** Hero, value proposition, then editorial imagery. */
export function EditorialSpread() {
  return (
    <div className="editorial-spread">
      <Hero />
      <WhatMembersReceive />
      <RealIntroductionExamples />
      <MemberIntroductionExamples />
      <EditorialImagery />
      <HostRegions />
    </div>
  );
}
