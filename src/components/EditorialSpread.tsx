import { Hero } from "./Hero";
import { MembershipPriorities } from "./MembershipPriorities";
import { PlatformFeatures } from "./PlatformFeatures";
import { PortalProductPreview } from "./PortalProductPreview";
import { ModernGolfer } from "./ModernGolfer";
import { EditorialImagery } from "./EditorialImagery";

/** Hero, society positioning, platform pillars, product preview, modern golfer, editorial imagery. */
export function EditorialSpread() {
  return (
    <div className="editorial-spread">
      <Hero />
      <MembershipPriorities />
      <PortalProductPreview />
      <PlatformFeatures />
      <ModernGolfer />
      <EditorialImagery />
    </div>
  );
}
