import { useState } from "react";
import { Library } from "@/pages/Library";
import { Editor } from "@/pages/Editor";

export type Route = { name: "library" } | { name: "editor"; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "library" });

  if (route.name === "editor") {
    return <Editor id={route.id} onBack={() => setRoute({ name: "library" })} />;
  }
  return <Library onOpen={(id) => setRoute({ name: "editor", id })} />;
}
