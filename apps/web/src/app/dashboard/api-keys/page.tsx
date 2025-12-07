"use client";

import { useState } from "react";
import {
  Copy,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { cn } from "@acme/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@acme/ui/alert-dialog";
import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { INITIAL_KEYS } from "../../../lib/mock-data";
import { ApiKey } from "../../../lib/types";

export default function ApiKeysView() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const newKey: ApiKey = {
      id: Math.random().toString(36).substr(2, 9),
      name: newKeyName,
      prefix: `sk_live_${Math.random().toString(36).substr(2, 5)}...`,
      createdAt: new Date().toISOString().split("T")[0] ?? "",
      lastUsed: "Never",
      status: "active",
    };

    setKeys([newKey, ...keys]);
    setNewKeyName("");
    setIsCreateModalOpen(false);
  };

  const handleRevokeKey = (id: string) => {
    setKeys(
      keys.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k)),
    );
    setRevokeKeyId(null);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground text-sm">
            Manage the keys used to authenticate your requests.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-lg"
        >
          <Plus size={18} />
          Create New Key
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card flex w-full gap-3 self-start rounded-xl border p-2 md:w-auto">
        <div className="relative flex-1 md:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Filter keys..."
            className="bg-muted/50 w-full border-none pl-10"
          />
        </div>
        <Button variant="ghost" size="icon">
          <RefreshCw size={18} />
        </Button>
      </div>

      {/* Keys Table */}
      <Card className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b text-xs font-medium tracking-wider uppercase">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Token</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Last Used</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium">{key.name}</div>
                    <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {key.id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-muted-foreground bg-muted flex w-fit items-center gap-2 rounded-md border px-2 py-1 font-mono text-sm">
                      {key.prefix}
                      <button
                        onClick={() => copyToClipboard(key.prefix, key.id)}
                        className="text-muted-foreground hover:text-foreground ml-2 transition-colors"
                      >
                        {copiedId === key.id ? (
                          <span className="text-xs text-emerald-500">
                            Copied
                          </span>
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-sm">
                    {key.createdAt}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-sm">
                    {key.lastUsed}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        key.status === "active"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 dark:bg-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {key.status === "active" ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-60 transition-opacity group-hover:opacity-100">
                      {key.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRevokeKeyId(key.id)}
                          className="text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Enter a name for this key to identify its usage later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKey}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  autoFocus
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. CI/CD Pipeline"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newKeyName.trim()}>
                Create Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Key Confirmation */}
      <AlertDialog
        open={!!revokeKeyId}
        onOpenChange={() => setRevokeKeyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the API key. Any applications using this key will
              no longer be able to authenticate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeKeyId && handleRevokeKey(revokeKeyId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
