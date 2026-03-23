import React, { useState, useEffect } from 'react';
import { X, Key, Info } from 'lucide-react';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AISettings {
    provider: AIProvider;
    geminiKey: string;
    openaiKey: string;
    anthropicKey: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
    provider: 'gemini',
    geminiKey: '',
    openaiKey: '',
    anthropicKey: '',
};

interface AISettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AISettings;
    onSave: (settings: AISettings) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState<AISettings>(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Impostazioni AI
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-start gap-2">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>
                            Per utilizzare l'importazione tramite Intelligenza Artificiale, devi configurare la tua chiave API personale. 
                            I dati vengono salvati solo localmente sul tuo browser.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider AI</label>
                        <select
                            value={localSettings.provider}
                            onChange={(e) => setLocalSettings({ ...localSettings, provider: e.target.value as AIProvider })}
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="gemini">Google Gemini (Consigliato)</option>
                            <option value="openai">OpenAI (ChatGPT)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                        </select>
                    </div>

                    {localSettings.provider === 'gemini' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chiave API Google Gemini</label>
                            <input
                                type="password"
                                value={localSettings.geminiKey}
                                onChange={(e) => setLocalSettings({ ...localSettings, geminiKey: e.target.value })}
                                placeholder="AIzaSy..."
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Ottieni una chiave gratuita su <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
                            </p>
                        </div>
                    )}

                    {localSettings.provider === 'openai' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chiave API OpenAI</label>
                            <input
                                type="password"
                                value={localSettings.openaiKey}
                                onChange={(e) => setLocalSettings({ ...localSettings, openaiKey: e.target.value })}
                                placeholder="sk-..."
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Ottieni una chiave su <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>.
                            </p>
                        </div>
                    )}

                    {localSettings.provider === 'anthropic' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chiave API Anthropic</label>
                            <input
                                type="password"
                                value={localSettings.anthropicKey}
                                onChange={(e) => setLocalSettings({ ...localSettings, anthropicKey: e.target.value })}
                                placeholder="sk-ant-..."
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Ottieni una chiave su <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a>.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        Salva Impostazioni
                    </button>
                </div>
            </div>
        </div>
    );
};
