import { Hero } from "./Hero";
import { WhatMembersReceive } from "./WhatMembersReceive";
import { MemberIntroductionExamples } from "./MemberIntroductionExamples";
import { EditorialImagery } from "./EditorialImagery";

/** Hero, value proposition, then editorial imagery. */
export function EditorialSpread() {
  return (
    <div className="editorial-spread">
      <Hero />
      <WhatMembersReceive />
      <MemberIntroductionExamples />
      <EditorialImagery />
    </div>
  );
}
