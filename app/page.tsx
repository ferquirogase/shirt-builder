import { PageTransition } from "@/components/PageTransition";
import { BuilderPage } from "@/components/builder/BuilderPage";

export default function Home() {
  return (
    <main>
      <PageTransition>
        <BuilderPage />
      </PageTransition>
    </main>
  );
}
