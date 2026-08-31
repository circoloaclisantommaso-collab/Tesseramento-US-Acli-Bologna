
import { Tesserato } from '../types';

// Basic validation for Italian Codice Fiscale (16 alphanumeric characters)
export const validateCodiceFiscale = (cf: string): boolean => {
    if (!cf) return true; // Allow empty
    const cfRegex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
    return cfRegex.test(cf);
};

export interface ValidationError {
    tesseratoIndex: number;
    tesseratoName: string;
    missingFields: string[];
}

export const validateTesseratiForExport = (tesserati: Tesserato[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    tesserati.forEach((t, index) => {
        const missingFields: string[] = [];

        if (!t.classeTesseramento) missingFields.push('Classe Tesseramento');
        if (!t.tipoTesseramento || t.tipoTesseramento.length === 0) missingFields.push('Tipo Tesseramento');
        if (!t.dataInizio) missingFields.push('Data Inizio');
        if (!t.dataFine) missingFields.push('Data Fine');
        if (!t.discipline || t.discipline.length === 0) missingFields.push('Discipline');
        
        if (!t.nome?.trim()) missingFields.push('Nome');
        if (!t.cognome?.trim()) missingFields.push('Cognome');
        if (!t.codiceFiscale?.trim()) missingFields.push('Codice Fiscale');
        if (!t.sesso) missingFields.push('Sesso');
        if (!t.dataNascita) missingFields.push('Data di Nascita');
        if (!t.comuneNascita?.trim()) missingFields.push('Comune di Nascita');
        
        if (!t.comuneResidenza?.trim()) missingFields.push('Comune di Residenza');
        if (!t.capResidenza?.trim()) missingFields.push('CAP di Residenza');
        if (!t.indirizzoResidenza?.trim()) missingFields.push('Indirizzo di Residenza');
        
        if (t.marketingUsa === null) missingFields.push('Marketing USAcli');
        if (t.marketingPartners === null) missingFields.push('Marketing Partners USAcli');
        if (t.profilazioneUsa === null) missingFields.push('Profilazione USAcli');
        if (t.profilazionePartners === null) missingFields.push('Profilazione Partners USAcli');

        if (missingFields.length > 0) {
            const name = t.nome || t.cognome ? `${t.nome} ${t.cognome}`.trim() : `Tesserato ${index + 1}`;
            errors.push({
                tesseratoIndex: index,
                tesseratoName: name,
                missingFields
            });
        }
    });

    return errors;
};
