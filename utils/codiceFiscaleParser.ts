import { Sesso, Tesserato } from '../types';
import CodiceFiscale from 'codice-fiscale-js';
import { validateCodiceFiscale } from './validation';

let COMUNI: { nome: string; codice: string }[] = [];
let STATI_ESTERI: { nome: string; codice: string }[] = [];
let dataLoaded = false;

async function loadLuoghiData() {
    if (dataLoaded) return;
    try {
        const module = await import('../luoghiNascita');
        COMUNI = module.COMUNI;
        STATI_ESTERI = module.STATI_ESTERI;
        dataLoaded = true;
    } catch (e) {
        console.error("Failed to load place of birth data", e);
    }
}

function getLuogoNascita(codice: string): { comuneNascita: string; nazioneNascita: string; } | null {
    if (codice.startsWith('Z')) {
        const stato = STATI_ESTERI.find(s => s.codice === codice);
        return stato ? { comuneNascita: stato.nome, nazioneNascita: stato.nome } : null;
    } else {
        const comune = COMUNI.find(c => c.codice === codice);
        return comune ? { comuneNascita: comune.nome, nazioneNascita: 'Italia' } : null;
    }
}

export const parseCodiceFiscale = async (cf: string): Promise<{ dataNascita: string; sesso: Sesso; comuneNascita: string; nazioneNascita: string; } | null> => {
    const cfUpper = cf.toUpperCase();
    if (cfUpper.length !== 16) return null;

    await loadLuoghiData();

    // Helper per gestire l'omocodia (sostituzione di numeri con lettere)
    const decodeOmocodia = (str: string): string => {
        const omocodiaMap: { [key: string]: string } = {
            'L': '0', 'M': '1', 'N': '2', 'P': '3', 'Q': '4',
            'R': '5', 'S': '6', 'T': '7', 'U': '8', 'V': '9'
        };
        return str.split('').map(char => omocodiaMap[char] || char).join('');
    };

    try {
        const yearStr = decodeOmocodia(cfUpper.substring(6, 8));
        let year = parseInt(yearStr, 10);
        const currentYear = new Date().getFullYear() % 100;
        year += (year > currentYear) ? 1900 : 2000;

        const monthMap: { [key: string]: number } = { A: 0, B: 1, C: 2, D: 3, E: 4, H: 5, L: 6, M: 7, P: 8, R: 9, S: 10, T: 11 };
        const monthChar = cfUpper.substring(8, 9);
        const month = monthMap[monthChar];
        if (month === undefined) return null;

        const dayStr = decodeOmocodia(cfUpper.substring(9, 11));
        let day = parseInt(dayStr, 10);
        let sesso: Sesso;

        if (day > 40) {
            day -= 40;
            sesso = Sesso.F;
        } else {
            sesso = Sesso.M;
        }

        const date = new Date(Date.UTC(year, month, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
             return null; 
        }

        const dataNascita = date.toISOString().split('T')[0];

        // Il codice luogo è formato da 1 lettera e 3 numeri (che potrebbero essere stati sostituiti per omocodia)
        const codiceLuogo = cfUpper.substring(11, 12) + decodeOmocodia(cfUpper.substring(12, 15));
        const luogo = getLuogoNascita(codiceLuogo);

        if (!luogo) {
            console.warn(`Place of birth code not found: ${codiceLuogo}`);
            return null;
        }

        return { dataNascita, sesso, ...luogo, };
    } catch (error) {
        console.error("Error parsing codice fiscale:", error);
        return null;
    }
};

export const generateCodiceFiscale = (tesserato: Partial<Tesserato>): string | null => {
    try {
        if (!tesserato.nome || !tesserato.cognome || !tesserato.sesso || !tesserato.dataNascita || !tesserato.comuneNascita) {
            return null;
        }

        const [year, month, day] = tesserato.dataNascita.split('-').map(Number);
        if (!year || !month || !day) return null;

        const cf = new CodiceFiscale({
            name: tesserato.nome,
            surname: tesserato.cognome,
            gender: tesserato.sesso,
            day: day,
            month: month,
            year: year,
            birthplace: tesserato.nazioneNascita && tesserato.nazioneNascita !== 'Italia' ? tesserato.nazioneNascita : tesserato.comuneNascita,
            birthplaceProvincia: tesserato.nazioneNascita && tesserato.nazioneNascita !== 'Italia' ? 'EE' : undefined
        });

        return cf.code;
    } catch (e) {
        // Silently fail if data is incomplete or birthplace is not found
        return null;
    }
};

export const enrichTesseratiData = async (tesserati: Tesserato[]): Promise<Tesserato[]> => {
    return Promise.all(tesserati.map(async (t) => {
        let updated = { ...t };

        // 1. Estrai Dati: Se c'è un codice fiscale valido, estrai i dati
        if (updated.codiceFiscale && validateCodiceFiscale(updated.codiceFiscale)) {
            try {
                const parsedData = await parseCodiceFiscale(updated.codiceFiscale);
                if (parsedData) {
                    updated = { ...updated, ...parsedData };
                }
            } catch (e) {
                console.error("Errore durante l'estrazione dei dati dal CF", e);
            }
        }

        // 2. Calcola: Se mancano dati ma abbiamo il necessario per calcolare il CF, lo calcoliamo
        // (o se il CF era mancante e ora abbiamo i dati estratti/importati)
        if (!updated.codiceFiscale) {
            const generatedCf = generateCodiceFiscale(updated);
            if (generatedCf) {
                updated.codiceFiscale = generatedCf;
            }
        }

        return updated;
    }));
};
