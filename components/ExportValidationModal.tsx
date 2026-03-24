import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ValidationError } from '../utils/validation';

interface ExportValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    onFix: (firstErrorIndex: number) => void;
    errors: ValidationError[];
}

export const ExportValidationModal: React.FC<ExportValidationModalProps> = ({
    isOpen,
    onClose,
    onProceed,
    onFix,
    errors
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Dati Mancanti
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-gray-700 mb-4">
                        Attenzione: alcuni campi obbligatori non sono stati compilati. 
                        Sei sicuro di voler procedere con l'esportazione?
                    </p>
                    
                    <div className="space-y-4">
                        {errors.map((error, idx) => (
                            <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-4">
                                <h3 className="font-bold text-red-800 mb-2">
                                    {error.tesseratoName} (Tesserato {error.tesseratoIndex + 1})
                                </h3>
                                <ul className="list-disc list-inside text-sm text-red-700 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {error.missingFields.map((field, fIdx) => (
                                        <li key={fIdx}>{field}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={() => onFix(errors[0]?.tesseratoIndex ?? 0)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Compila i Dati Mancanti
                    </button>
                    <button
                        onClick={onProceed}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Genera Comunque
                    </button>
                </div>
            </div>
        </div>
    );
};
