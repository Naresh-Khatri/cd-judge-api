import { BookOpen } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
      <div className="text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Documentation</h3>
        <p>API references and guides coming soon.</p>
      </div>
    </div>
  );
}
