import { Hero } from "./Hero";
import { EditorialImagery } from "./EditorialImagery";
import { HostRegions } from "./HostRegions";

/** Single visual unit: hero + membership grid read as one magazine spread. */
export function EditorialSpread() {
  return (
    <div className="editorial-spread">
      <Hero />
      <EditorialImagery />
      <HostRegions />
    </div>
  );
}
