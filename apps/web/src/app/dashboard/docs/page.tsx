import { BookOpen } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="text-muted-foreground flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <h3 className="text-lg font-medium">Documentation</h3>
        <p>API references and guides coming soon.</p>
      </div>
    </div>
  );
}
