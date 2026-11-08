import React, { useState, useEffect } from 'react';
import { X, Sparkles, Info, CheckCircle2 } from 'lucide-react';

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Impostazioni Importazione AI
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Motore di Intelligenza Artificiale
                        </label>
                        <select
                            value={localSettings.provider}
                            onChange={(e) => setLocalSettings({ ...localSettings, provider: e.target.value as AIProvider })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="gemini">Google Gemini (Consigliato - Chiave Account Inclusa)</option>
                            <option value="openai">OpenAI (Richiede chiave personale)</option>
                            <option value="anthropic">Anthropic (Richiede chiave personale)</option>
                        </select>
                    </div>

                    {localSettings.provider === 'gemini' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span>Gemini 3.8 Flash Attivo & Configurato</span>
                            </div>
                            <p className="text-xs text-emerald-800 leading-relaxed">
                                L'importazione con Gemini utilizza direttamente la licenza e la chiave API associata all'account dell'applicazione. Non devi inserire alcuna chiave né effettuare configurazioni manuali.
                            </p>
                            <div className="pt-2 text-xs text-emerald-700 border-t border-emerald-200/60 flex items-center justify-between">
                                <span>Formati supportati:</span>
                                <span className="font-medium">Excel, CSV, PDF, Immagini</span>
                            </div>
                        </div>
                    )}

                    {localSettings.provider === 'openai' && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex items-start gap-2">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>Per utilizzare OpenAI, inserisci la tua chiave API personale. I dati rimangono salvati solo nel tuo browser.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Chiave API OpenAI</label>
                                <input
                                    type="password"
                                    value={localSettings.openaiKey}
                                    onChange={(e) => setLocalSettings({ ...localSettings, openaiKey: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Disponibile su <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">OpenAI Platform</a>.
                                </p>
                            </div>
                        </div>
                    )}

                    {localSettings.provider === 'anthropic' && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex items-start gap-2">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>Per utilizzare Anthropic Claude, inserisci la tua chiave API personale.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Chiave API Anthropic</label>
                                <input
                                    type="password"
                                    value={localSettings.anthropicKey}
                                    onChange={(e) => setLocalSettings({ ...localSettings, anthropicKey: e.target.value })}
                                    placeholder="sk-ant-..."
                                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Disponibile su <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Anthropic Console</a>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                        Chiudi
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-xs"
                    >
                        Conferma
                    </button>
                </div>
            </div>
        </div>
    );
};
