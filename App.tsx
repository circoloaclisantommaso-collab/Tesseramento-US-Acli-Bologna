import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, BookOpen, Download } from 'lucide-react';
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

function App() {
    const [tesserati, setTesserati] = useLocalStorage<Tesserato[]>('tesserati', [{...DEFAULT_TESSERATO, id: Date.now() + Math.random()}]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportErrors, setExportErrors] = useState<ValidationError[]>([]);
    const [aiSettings, setAiSettings] = useLocalStorage<AISettings>('ai_settings', DEFAULT_AI_SETTINGS);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ''; // Mostra il prompt di conferma del browser
        };

        const handleUnload = () => {
            // Svuota i campi e rimuove le chiavi API quando l'utente conferma l'uscita
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

    const handleAddTesserato = () => {
        const newTesserato = { ...DEFAULT_TESSERATO, id: Date.now() + Math.random() };
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
                // Use a non-blocking way to notify or just return
                console.warn('Aggiungi almeno un altro tesserato per copiare i dati.');
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
            
            return prev.map((t, i) => {
                if (i === 0) return t;
                return { ...t, ...datiTesseramento };
            });
        });
    };

    const handleResetAll = () => {
        if (isConfirmingReset) {
            setTesserati([{ ...DEFAULT_TESSERATO, id: Date.now() + Math.random() }]);
            setExpandedIndex(0);
            setIsConfirmingReset(false);
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
                     setTesserati(enriched);
                     setExpandedIndex(0);
                } else {
                    alert('Nessun dato valido trovato nel file.');
                }
            } catch (error: any) {
                alert(`Errore durante l'importazione: ${error.message}`);
            } finally {
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleAIFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!aiSettings.geminiKey && !aiSettings.openaiKey && !aiSettings.anthropicKey) {
                alert("Per favore, configura prima la tua chiave API nelle impostazioni AI.");
                setIsAISettingsOpen(true);
                if (aiFileInputRef.current) aiFileInputRef.current.value = '';
                return;
            }

            setIsImportingAI(true);
            try {
                const { importTesseratiWithAI } = await import('./utils/aiImporter');
                const imported = await importTesseratiWithAI(file, aiSettings);
                if (imported.length > 0) {
                     const enriched = await enrichTesseratiData(imported);
                     setTesserati(enriched);
                     setExpandedIndex(0);
                     alert(`Importati ${imported.length} tesserati con successo tramite AI.`);
                } else {
                    alert('Nessun dato valido trovato nel file tramite AI.');
                }
            } catch (error: any) {
                alert(`Errore durante l'importazione con AI: ${error.message}`);
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
            alert('Nessun tesserato da esportare.');
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
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-800 flex items-center gap-3">
                            Tesseramento Us-Acli Bologna
                            <button 
                                onClick={() => setIsManualOpen(true)}
                                className="text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 p-1.5 rounded-full"
                                title="Manuale Utente"
                            >
                                <BookOpen className="w-6 h-6" />
                            </button>
                        </h1>
                        <p className="text-sm text-gray-500">By F. Manfredi</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handleResetAll}
                            className={`${isConfirmingReset ? 'bg-red-800' : 'bg-red-600'} text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors`}
                            title="Cancella tutti i dati e ricomincia da zero"
                        >
                            {isConfirmingReset ? 'Conferma Svuota' : 'Svuota Tutto'}
                        </button>
                         <button
                            onClick={handleCopyDatiTesseramento}
                            className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                            title="Copia i Dati Tesseramento dal primo tesserato a tutti gli altri"
                        >
                            Copia Dati Tesseramento
                        </button>
                        <button
                            onClick={handleExport}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 border-2 border-black focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="Esporta i dati in un file CSV"
                        >
                            <Download className="w-5 h-5" />
                            Esporta CSV
                        </button>
                         <button
                            onClick={triggerFileImport}
                            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Importa File
                        </button>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={triggerAIFileImport}
                                disabled={isImportingAI}
                                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-l-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center"
                                title="Importa da PDF, Immagini o Testo usando l'Intelligenza Artificiale"
                            >
                                {isImportingAI ? 'Analisi AI...' : 'Importa con AI'}
                            </button>
                            <button
                                onClick={() => setIsAISettingsOpen(true)}
                                className="bg-indigo-700 text-white p-2 rounded-r-lg hover:bg-indigo-800 transition-colors flex items-center justify-center"
                                title="Impostazioni AI"
                            >
                                <Settings className="w-5 h-5" />
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
            <main className="container mx-auto p-4 md:p-8">
                <div className="space-y-6">
                    {tesserati.map((tesserato, index) => (
                        <div key={tesserato.id || index} id={`tesserato-${index}`}>
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
                    ))}
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