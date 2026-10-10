import { PageTransition } from "@/components/PageTransition";
import { BuilderPage } from "@/components/builder/BuilderPage";

export default function Home() {
  return (
    <PageTransition>
      <main>
        <BuilderPage />
      </main>
    </PageTransition>
  );
}
