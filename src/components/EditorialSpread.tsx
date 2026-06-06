import { Hero } from "./Hero";
import { WhatMembersReceive } from "./WhatMembersReceive";
import { MembershipPriorities } from "./MembershipPriorities";
import { MemberIntroductionExamples } from "./MemberIntroductionExamples";
import { EditorialImagery } from "./EditorialImagery";

/** Hero, value proposition, priorities, examples, then editorial imagery. */
export function EditorialSpread() {
  return (
    <div className="editorial-spread">
      <Hero />
      <WhatMembersReceive />
      <MembershipPriorities />
      <MemberIntroductionExamples />
      <EditorialImagery />
    </div>
  );
}
