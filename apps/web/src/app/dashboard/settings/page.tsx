import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="text-muted-foreground flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <Settings className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <h3 className="text-lg font-medium">Settings</h3>
        <p>Global configuration coming soon.</p>
      </div>
    </div>
  );
}
