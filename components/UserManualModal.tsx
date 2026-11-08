import React from 'react';
import { X, BookOpen, Trash2, Copy, Download, Upload, Sparkles, Settings, PlusCircle } from 'lucide-react';

interface UserManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b bg-blue-50">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-800">
                        <BookOpen className="w-6 h-6" />
                        Manuale Utente
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6 text-gray-700">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Benvenuto!</h3>
                        <p>
                            Questa applicazione ti permette di compilare, gestire ed esportare i dati dei tesserati 
                            per l'US Acli Bologna in modo semplice e veloce. Tutti i dati rimangono al sicuro sul tuo computer.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Cosa fanno i pulsanti?</h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="mt-1 bg-red-100 p-1.5 rounded text-red-600 flex-shrink-0"><Trash2 className="w-4 h-4" /></div>
                                <div>
                                    <strong>Svuota Tutto:</strong> Cancella tutti i tesserati inseriti e ripristina l'applicazione allo stato iniziale. Richiede una doppia conferma per evitare errori.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 bg-yellow-100 p-1.5 rounded text-yellow-600 flex-shrink-0"><Copy className="w-4 h-4" /></div>
                                <div>
                                    <strong>Copia Dati Tesseramento:</strong> Copia i dati generali (Classe, Tipo, Date e Discipline) dal <em>primo tesserato in alto</em> a tutti gli altri presenti nella lista. Molto comodo per inserimenti multipli dello stesso corso!
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 bg-blue-100 p-1.5 rounded text-blue-600 flex-shrink-0"><Download className="w-4 h-4" /></div>
                                <div>
                                    <strong>Esporta CSV:</strong> Genera e scarica il file CSV formattato correttamente, pronto per essere caricato sul portale ufficiale US Acli.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 bg-green-100 p-1.5 rounded text-green-600 flex-shrink-0"><Upload className="w-4 h-4" /></div>
                                <div>
                                    <strong>Importa File:</strong> Permette di caricare un file CSV o Excel esistente per riempire automaticamente i campi.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 bg-indigo-100 p-1.5 rounded text-indigo-600 flex-shrink-0"><Sparkles className="w-4 h-4" /></div>
                                <div>
                                    <strong>Importa con AI:</strong> Utilizza l'Intelligenza Artificiale per leggere e interpretare dati da file PDF, immagini o tabelle. Riconosce e converte automaticamente la cittadinanza nel nome ufficiale dello Stato sovrano (es. <em>ITALIA</em>, <em>ROMANIA</em>, <em>MAROCCO</em>), eliminando aggettivi o derivazioni.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 bg-gray-200 p-1.5 rounded text-gray-700 flex-shrink-0"><Settings className="w-4 h-4" /></div>
                                <div>
                                    <strong>Impostazioni AI (Ingranaggio):</strong> Qui puoi inserire la tua chiave API personale (Gemini, OpenAI o Anthropic) necessaria per abilitare l'importazione intelligente.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 bg-blue-800 p-1.5 rounded text-white flex-shrink-0"><PlusCircle className="w-4 h-4" /></div>
                                <div>
                                    <strong>+ Aggiungi Tesserato:</strong> Aggiunge una nuova scheda vuota in fondo alla pagina per inserire manualmente un'altra persona.
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-md font-semibold text-blue-900 mb-1">Sicurezza e Privacy</h3>
                        <p className="text-sm text-blue-800">
                            Per garantire la massima sicurezza, quando chiudi o ricarichi questa pagina, 
                            <strong> tutti i dati inseriti e le chiavi API verranno eliminati automaticamente</strong>. 
                            Ricordati di esportare il CSV prima di uscire!
                        </p>
                    </section>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        Ho capito
                    </button>
                </div>
            </div>
        </div>
    );
};
