import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, BookOpen, Download, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Tesserato, TesseratoField } from './types';
import { DEFAULT_TESSERATO } from './constants';
import { TesseratoForm } from './components/TesseratoForm';
import useLocalStorage from './hooks/useLocalStorage';
import { importTesseratiFromFile } from './utils/fileImporter';
import { exportToCsv } from './utils/csvExporter';
import { enrichTesseratiData } from './utils/codiceFiscaleParser';
import { AISettingsModal, AISettings, DEFAULT_AI_SETTINGS } from './components/AISettingsModal';
import { UserManualModal } from './components/UserManualModal';
import { ExportValidationModal } from './components/ExportValidationModal';
import { validateTesseratiForExport, ValidationError } from './utils/validation';
import { generateUniqueId } from './utils/idUtils';

function App() {
    const [tesserati, setTesserati] = useLocalStorage<Tesserato[]>('tesserati', [{...DEFAULT_TESSERATO, id: generateUniqueId()}]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportErrors, setExportErrors] = useState<ValidationError[]>([]);
    const [aiSettings, setAiSettings] = useLocalStorage<AISettings>('ai_settings', DEFAULT_AI_SETTINGS);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        const handleUnload = () => {
            localStorage.removeItem('tesserati');
            localStorage.removeItem('ai_settings');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('unload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleUnload);
        };
    }, []);

    // Ensure all loaded tesserati have unique IDs (recovering cleanly from any existing localStorage duplicates)
    useEffect(() => {
        const seenIds = new Set<string | number>();
        let hasDuplicateOrMissing = false;
        const sanitized = tesserati.map(t => {
            if (!t.id || seenIds.has(t.id)) {
                hasDuplicateOrMissing = true;
                return { ...t, id: generateUniqueId() };
            }
            seenIds.add(t.id);
            return t;
        });

        if (hasDuplicateOrMissing) {
            setTesserati(sanitized);
        }
    }, []);

    const handleAddTesserato = () => {
        const newTesserato = { ...DEFAULT_TESSERATO, id: generateUniqueId() };
        setTesserati(prev => [...prev, newTesserato]);
        setExpandedIndex(tesserati.length);
    };

    const handleRemoveTesserato = (index: number) => {
        setTesserati(prev => prev.filter((_, i) => i !== index));
        if (expandedIndex === index) {
            setExpandedIndex(null);
        } else if (expandedIndex !== null && expandedIndex > index) {
            setExpandedIndex(expandedIndex - 1);
        }
    };

    const handleUpdateTesserato = useCallback((index: number, field: TesseratoField, value: any) => {
        setTesserati(prev => {
            const newTesserati = [...prev];
            const tesseratoToUpdate = { ...newTesserati[index] };
            (tesseratoToUpdate as any)[field] = value;
            newTesserati[index] = tesseratoToUpdate;
            return newTesserati;
        });
    }, [setTesserati]);
    
    const handleBulkUpdateTesserato = useCallback((index: number, updates: Partial<Tesserato>) => {
        setTesserati(prev => {
            const newTesserati = [...prev];
            newTesserati[index] = { ...newTesserati[index], ...updates };
            return newTesserati;
        });
    }, [setTesserati]);

    const handleHeaderClick = (index: number) => {
        setExpandedIndex(prev => prev === index ? null : index);
    };

    const handleCopyDatiTesseramento = () => {
        setTesserati(prev => {
            if (prev.length <= 1) {
                setNotification({
                    type: 'info',
                    message: 'Aggiungi almeno un altro tesserato per poter copiare i dati di tesseramento.'
                });
                return prev;
            }
            
            const firstTesserato = prev[0];
            const datiTesseramento = {
                classeTesseramento: firstTesserato.classeTesseramento,
                tipoTesseramento: Array.isArray(firstTesserato.tipoTesseramento) ? [...firstTesserato.tipoTesseramento] : [],
                dataInizio: firstTesserato.dataInizio,
                dataFine: firstTesserato.dataFine,
                discipline: Array.isArray(firstTesserato.discipline) ? [...firstTesserato.discipline] : [],
            };
            
            setNotification({
                type: 'success',
                message: 'Dati tesseramento del primo tesserato copiati su tutti gli altri.'
            });

            return prev.map((t, i) => {
                if (i === 0) return t;
                return { ...t, ...datiTesseramento };
            });
        });
    };

    const handleResetAll = () => {
        if (isConfirmingReset) {
            setTesserati([{ ...DEFAULT_TESSERATO, id: generateUniqueId() }]);
            setExpandedIndex(0);
            setIsConfirmingReset(false);
            setNotification({
                type: 'info',
                message: 'Elenco tesserati azzerato.'
            });
        } else {
            setIsConfirmingReset(true);
            setTimeout(() => setIsConfirmingReset(false), 3000);
        }
    };
    
    const [isImportingAI, setIsImportingAI] = useState(false);
    const aiFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const imported = await importTesseratiFromFile(file);
                if (imported.length > 0) {
                    const enriched = await enrichTesseratiData(imported);
                    setTesserati(prev => {
                        const filteredPrev = prev.filter(t => t.nome || t.cognome || t.codiceFiscale);
                        const existingIds = new Set(filteredPrev.map(t => t.id));
                        const uniqueEnriched = enriched.map(t => ({
                            ...t,
                            id: (!t.id || existingIds.has(t.id)) ? generateUniqueId() : t.id
                        }));
                        return [...filteredPrev, ...uniqueEnriched];
                    });
                    setExpandedIndex(tesserati.length);
                    setNotification({
                        type: 'success',
                        message: `Importati ${imported.length} tesserati con successo dal file.`
                    });
                } else {
                    setNotification({
                        type: 'error',
                        message: 'Nessun dato valido trovato nel file.'
                    });
                }
            } catch (error: any) {
                setNotification({
                    type: 'error',
                    message: `Errore durante l'importazione: ${error.message}`
                });
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleAIFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Per Gemini, la chiave è integrata nel sistema!
            // Per OpenAI o Anthropic, verifichiamo che la chiave sia stata inserita se l'utente li ha scelti
            if (aiSettings.provider === 'openai' && !aiSettings.openaiKey) {
                setNotification({
                    type: 'error',
                    message: 'Per utilizzare OpenAI, inserisci la tua chiave API personale nelle impostazioni AI.'
                });
                setIsAISettingsOpen(true);
                if (aiFileInputRef.current) aiFileInputRef.current.value = '';
                return;
            }

            if (aiSettings.provider === 'anthropic' && !aiSettings.anthropicKey) {
                setNotification({
                    type: 'error',
                    message: 'Per utilizzare Anthropic, inserisci la tua chiave API personale nelle impostazioni AI.'
                });
                setIsAISettingsOpen(true);
                if (aiFileInputRef.current) aiFileInputRef.current.value = '';
                return;
            }

            setIsImportingAI(true);
            try {
                const { importTesseratiWithAI } = await import('./utils/aiImporter');
                const imported = await importTesseratiWithAI(file, aiSettings);
                if (imported.length > 0) {
                    setTesserati(prev => {
                        const filteredPrev = prev.filter(t => t.nome || t.cognome || t.codiceFiscale);
                        const existingIds = new Set(filteredPrev.map(t => t.id));
                        const uniqueImported = imported.map(t => ({
                            ...t,
                            id: (!t.id || existingIds.has(t.id)) ? generateUniqueId() : t.id
                        }));
                        return [...filteredPrev, ...uniqueImported];
                    });
                    setExpandedIndex(tesserati.length);
                    setNotification({
                        type: 'success',
                        message: `Aggiunti con successo ${imported.length} tesserati tramite Google Gemini.`
                    });
                } else {
                    setNotification({
                        type: 'error',
                        message: 'Nessun tesserato valido trovato nel documento tramite AI.'
                    });
                }
            } catch (error: any) {
                let msg = error?.message || "Errore imprevisto durante l'elaborazione del file.";
                if (typeof msg === 'string' && (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE'))) {
                    msg = "I server di Google Gemini sono temporaneamente sovraccarichi di richieste (503). Si prega di riprovare tra qualche istante.";
                }
                setNotification({
                    type: 'error',
                    message: `Errore durante l'importazione con AI: ${msg}`
                });
            } finally {
                setIsImportingAI(false);
                if (aiFileInputRef.current) {
                    aiFileInputRef.current.value = '';
                }
            }
        }
    };

    const triggerFileImport = () => {
        fileInputRef.current?.click();
    };

    const triggerAIFileImport = () => {
        aiFileInputRef.current?.click();
    };

    const handleExport = () => {
        if (tesserati.length === 0) {
            setNotification({
                type: 'error',
                message: 'Nessun tesserato da esportare.'
            });
            return;
        }
        
        const errors = validateTesseratiForExport(tesserati);
        if (errors.length > 0) {
            setExportErrors(errors);
            setIsExportModalOpen(true);
        } else {
            exportToCsv(tesserati, 'tesserati.csv');
        }
    };

    const handleProceedExport = () => {
        setIsExportModalOpen(false);
        exportToCsv(tesserati, 'tesserati.csv');
    };

    const handleFixErrors = (index: number) => {
        setIsExportModalOpen(false);
        setExpandedIndex(index);
        setTimeout(() => {
            document.getElementById(`tesserato-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-xs border-b border-gray-200 sticky top-0 z-30">
                <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-3">
                            Tesseramento Us-Acli Bologna
                            <button 
                                onClick={() => setIsManualOpen(true)}
                                className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 p-1.5 rounded-full"
                                title="Manuale Utente"
                            >
                                <BookOpen className="w-5 h-5" />
                            </button>
                        </h1>
                        <p className="text-xs text-gray-500">Gestione tesserati & esportazione per Portale US Acli</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleResetAll}
                            className={`${isConfirmingReset ? 'bg-red-800' : 'bg-red-600'} text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-red-700 transition-colors`}
                            title="Cancella tutti i dati e ricomincia da zero"
                        >
                            {isConfirmingReset ? 'Conferma Svuota' : 'Svuota Tutto'}
                        </button>
                        <button
                            onClick={handleCopyDatiTesseramento}
                            className="bg-amber-500 text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-amber-600 transition-colors"
                            title="Copia i Dati Tesseramento dal primo tesserato a tutti gli altri"
                        >
                            Copia Dati Tesseramento
                        </button>
                        <button
                            onClick={handleExport}
                            className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-semibold py-2 px-4 text-sm rounded-lg hover:from-blue-800 hover:to-indigo-800 transition-all shadow-xs flex items-center gap-1.5"
                            title="Esporta i dati in un file CSV conforme"
                        >
                            <Download className="w-4 h-4" />
                            Esporta CSV
                        </button>
                        <button
                            onClick={triggerFileImport}
                            className="bg-emerald-600 text-white font-semibold py-2 px-3 text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                            title="Importa da file CSV o Excel standard"
                        >
                            Importa File
                        </button>
                        <div className="flex items-center">
                            <button
                                onClick={triggerAIFileImport}
                                disabled={isImportingAI}
                                className="bg-indigo-600 text-white font-semibold py-2 px-3.5 text-sm rounded-l-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center gap-1.5 shadow-xs"
                                title="Importa con Google Gemini da Excel, CSV, PDF o Foto"
                            >
                                <Sparkles className="w-4 h-4 text-indigo-200" />
                                {isImportingAI ? 'Analisi Gemini...' : 'Importa con AI'}
                            </button>
                            <button
                                onClick={() => setIsAISettingsOpen(true)}
                                className="bg-indigo-700 text-white p-2 text-sm rounded-r-lg hover:bg-indigo-800 transition-colors flex items-center justify-center border-l border-indigo-600"
                                title="Impostazioni AI & Provider"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileImport}
                            className="hidden"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        />
                        <input
                            type="file"
                            ref={aiFileInputRef}
                            onChange={handleAIFileImport}
                            className="hidden"
                            accept=".csv, .pdf, image/png, image/jpeg, image/webp, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        />
                    </div>
                </div>
            </header>

            {/* Banner elaborazione AI */}
            {isImportingAI && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4 border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                        <div>
                            <h3 className="font-bold text-gray-900 text-base">Analisi con Google Gemini in corso</h3>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                Lettura del documento, estrazione dati anagrafici, calcolo codici fiscali e associazione automatica dei CAP...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifica Toast */}
            {notification && (
                <div className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl shadow-xl border flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                        : notification.type === 'error'
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-blue-50 border-blue-300 text-blue-900'
                }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs md:text-sm font-medium leading-relaxed">{notification.message}</div>
                    <button 
                        onClick={() => setNotification(null)} 
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <main className="container mx-auto p-4 md:p-8">
                <div className="space-y-6">
                    {tesserati.map((tesserato, index) => {
                        const rowKey = tesserato.id ? `tesserato-${tesserato.id}` : `tesserato-idx-${index}`;
                        return (
                            <div key={rowKey} id={`tesserato-${index}`}>
                                <TesseratoForm
                                    tesserato={tesserato}
                                    index={index}
                                    onUpdate={handleUpdateTesserato}
                                    onBulkUpdate={handleBulkUpdateTesserato}
                                    onRemove={handleRemoveTesserato}
                                    total={tesserati.length}
                                    isExpanded={expandedIndex === index}
                                    onHeaderClick={() => handleHeaderClick(index)}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8 text-center">
                    <button
                        onClick={handleAddTesserato}
                        className="bg-blue-800 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-900 transition-colors shadow-lg text-lg"
                    >
                        + Aggiungi Tesserato
                    </button>
                </div>
            </main>
            
            <AISettingsModal 
                isOpen={isAISettingsOpen} 
                onClose={() => setIsAISettingsOpen(false)} 
                settings={aiSettings} 
                onSave={setAiSettings} 
            />
            
            <UserManualModal 
                isOpen={isManualOpen} 
                onClose={() => setIsManualOpen(false)} 
            />

            <ExportValidationModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onProceed={handleProceedExport}
                onFix={handleFixErrors}
                errors={exportErrors}
            />
        </div>
    );
}

export default App;