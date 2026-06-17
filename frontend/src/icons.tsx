import { Award, Sprout, Flower2, TreePine, Trophy, Leaf } from "lucide-react";

export function PlantIcon({ name, className = "" }: { name: string; className?: string }) {
  const shared = `stroke-[1.7] ${className}`;
  if (name === "seed") return <Sprout className={shared} />;
  if (name === "sprout") return <Leaf className={shared} />;
  if (name === "plant") return <Flower2 className={shared} />;
  if (name === "tree") return <TreePine className={shared} />;
  if (name === "pine") return <TreePine className={shared} />;
  if (name === "trophy") return <Trophy className={shared} />;
  if (name === "wilt") return <Flower2 className={`${shared} text-berry`} />;
  if (name === "wilt-heavy") return <Flower2 className={`${shared} text-berry opacity-70`} />;
  if (name === "dead") return <Award className={`${shared} text-soil opacity-60`} />;
  return <Sprout className={shared} />;
}
