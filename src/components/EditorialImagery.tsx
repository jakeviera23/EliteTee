import { featureHeroes } from "../data/content";
import { HeroBand } from "./HeroBand";

export function EditorialImagery() {
  return (
    <>
      {featureHeroes.map((item) => (
        <HeroBand
          key={item.title}
          image={item.image}
          alt={item.alt}
          title={item.title}
          description={item.description}
        />
      ))}
    </>
  );
}
