'use client';

import { SettingsCard } from '@/components/settings/settings-card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { trpc } from '@/providers/query-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { LockIcon } from '@/components/icons/icons';

export default function CredentialsSettingsPage() {
    const { data: credentials, refetch } = useQuery(trpc.credentials.list.queryOptions());
    const { mutateAsync: saveCredential } = useMutation(trpc.credentials.save.mutationOptions());
    const { mutateAsync: deleteCredential } = useMutation(trpc.credentials.delete.mutationOptions());

    const [provider, setProvider] = useState('');
    const [key, setKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!provider || !key) return;
        try {
            setIsSaving(true);
            await saveCredential({ name: provider, value: key });
            setProvider('');
            setKey('');
            await refetch();
        } catch (e) {
            console.error('Failed to save credential', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCredential({ id });
            await refetch();
        } catch (e) {
            console.error('Failed to delete credential', e);
        }
    };

    return (
        <div className="flex h-full w-full flex-col">
            <SettingsCard
                title="Credentials"
                description="Manage your API keys for multiple LLM providers safely."
            >
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Config Key (e.g. OPENAI_API_KEY)</label>
                            <Input
                                placeholder="Enter secret name"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">Secret Value</label>
                            <Input
                                type="password"
                                placeholder="sk-..."
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleSave} disabled={!provider || !key || isSaving} className="w-full md:w-auto">
                            {isSaving ? 'Saving...' : 'Save Key'}
                        </Button>
                    </div>

                    <div className="mt-8 space-y-4">
                        <h3 className="text-sm font-medium">Saved Credentials</h3>
                        {!credentials?.length && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No credentials saved yet.</p>
                        )}
                        <div className="space-y-2">
                            {credentials?.map((cred) => (
                                <div key={cred.id} className="flex items-center justify-between rounded-md border p-3 dark:border-[#252525]">
                                    <div className="flex items-center gap-2">
                                        <LockIcon className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium text-sm">{cred.name}</span>
                                        {cred.isSet && (
                                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                                                Configured
                                            </span>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cred.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                        Delete
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}
