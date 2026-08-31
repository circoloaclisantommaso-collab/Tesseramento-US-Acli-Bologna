import { Sesso, Tesserato } from '../types';
import CodiceFiscale from 'codice-fiscale-js';
import { validateCodiceFiscale } from './validation';
import { parseItalianDate } from './dateUtils';
import { COMUNI_E_CAP } from '../comuniECap';

let COMUNI: { nome: string; codice: string }[] = [];
let STATI_ESTERI: { nome: string; codice: string }[] = [];
let dataLoaded = false;

async function loadLuoghiData() {
    if (dataLoaded) return;
    try {
        const module = await import('../luoghiNascita');
        COMUNI = module.COMUNI || [];
        STATI_ESTERI = module.STATI_ESTERI || [];
        dataLoaded = true;
    } catch (e) {
        console.error("Failed to load place of birth data", e);
    }
}

// Mappa omocodia (sostituzione di numeri con lettere secondo la normativa)
const decodeOmocodia = (str: string): string => {
    const omocodiaMap: { [key: string]: string } = {
        'L': '0', 'M': '1', 'N': '2', 'P': '3', 'Q': '4',
        'R': '5', 'S': '6', 'T': '7', 'U': '8', 'V': '9'
    };
    return str.split('').map(char => omocodiaMap[char] || char).join('');
};

function getLuogoNascita(codice: string): { comuneNascita: string; nazioneNascita: string } | null {
    // 1. Prova con la libreria integrata codice-fiscale-js
    try {
        const comuneFromLib = (CodiceFiscale as any).utils?.birthplaceFields ? null : null;
        if ((CodiceFiscale as any).Comune?.GetByCC) {
            const c = (CodiceFiscale as any).Comune.GetByCC(codice);
            if (c && c.nome) {
                const isForeign = codice.startsWith('Z');
                return {
                    comuneNascita: c.nome.toUpperCase(),
                    nazioneNascita: isForeign ? c.nome.toUpperCase() : 'ITALIA'
                };
            }
        }
    } catch {
        // ignora errore se libreria non ha il metodo
    }

    // 2. Prova con gli stati esteri o comuni in luoghiNascita
    if (codice.startsWith('Z')) {
        const stato = STATI_ESTERI.find(s => s.codice === codice);
        if (stato) {
            return { comuneNascita: stato.nome.toUpperCase(), nazioneNascita: stato.nome.toUpperCase() };
        }
    } else {
        const comune = COMUNI.find(c => c.codice === codice);
        if (comune) {
            return { comuneNascita: comune.nome.toUpperCase(), nazioneNascita: 'ITALIA' };
        }
    }

    return null;
}

export const parseCodiceFiscale = async (cf: string): Promise<{ dataNascita: string; sesso: Sesso; comuneNascita: string; nazioneNascita: string; } | null> => {
    if (!cf || typeof cf !== 'string') return null;
    const cfUpper = cf.trim().toUpperCase();
    if (cfUpper.length !== 16) return null;

    await loadLuoghiData();

    try {
        // Anno di nascita (posizioni 6 e 7, 0-indexed)
        const yearStr = decodeOmocodia(cfUpper.substring(6, 8));
        let year = parseInt(yearStr, 10);
        if (isNaN(year)) return null;

        const currentYear = new Date().getFullYear() % 100;
        year += (year > currentYear) ? 1900 : 2000;

        // Mese di nascita (posizione 8, 0-indexed)
        const monthMap: { [key: string]: number } = { A: 0, B: 1, C: 2, D: 3, E: 4, H: 5, L: 6, M: 7, P: 8, R: 9, S: 10, T: 11 };
        const monthChar = cfUpper.substring(8, 9);
        const month = monthMap[monthChar];
        if (month === undefined) return null;

        // Giorno e Sesso (posizioni 9 e 10, 0-indexed)
        const dayStr = decodeOmocodia(cfUpper.substring(9, 11));
        let rawDay = parseInt(dayStr, 10);
        if (isNaN(rawDay)) return null;

        let sesso: Sesso;
        let day: number;

        if (rawDay > 40) {
            day = rawDay - 40;
            sesso = Sesso.F;
        } else {
            day = rawDay;
            sesso = Sesso.M;
        }

        if (day < 1 || day > 31) return null;

        const date = new Date(Date.UTC(year, month, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
             return null; 
        }

        // Formattazione data YYYY-MM-DD
        const dataNascita = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Codice luogo nascita (posizioni 11-14: 1 lettera + 3 cifre eventualmente con omocodia)
        const codiceLuogo = cfUpper.substring(11, 12) + decodeOmocodia(cfUpper.substring(12, 15));
        const luogo = getLuogoNascita(codiceLuogo);

        // IMPORTANTE: anche se il comune di nascita non viene trovato nel dizionario locale,
        // la data di nascita e il sesso sono SEMPRE validi e devono essere caricati!
        return {
            dataNascita,
            sesso,
            comuneNascita: luogo ? luogo.comuneNascita : '',
            nazioneNascita: luogo ? luogo.nazioneNascita : 'ITALIA',
        };
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

        const isoDate = parseItalianDate(tesserato.dataNascita);
        if (!isoDate) return null;

        const [year, month, day] = isoDate.split('-').map(Number);
        if (!year || !month || !day) return null;

        const isForeign = tesserato.nazioneNascita && tesserato.nazioneNascita.toUpperCase() !== 'ITALIA';
        const cf = new CodiceFiscale({
            name: tesserato.nome.trim(),
            surname: tesserato.cognome.trim(),
            gender: tesserato.sesso,
            day: day,
            month: month,
            year: year,
            birthplace: isForeign ? tesserato.nazioneNascita : tesserato.comuneNascita.trim(),
            birthplaceProvincia: isForeign ? 'EE' : undefined
        });

        return cf.code ? cf.code.toUpperCase() : null;
    } catch (e) {
        // In caso di errore di calcolo silente
        return null;
    }
};

export const enrichTesseratiData = async (tesserati: Tesserato[]): Promise<Tesserato[]> => {
    return Promise.all(tesserati.map(async (t) => {
        let updated = { ...t };

        // Normalizza tutte le date esistenti
        if (updated.dataNascita) {
            updated.dataNascita = parseItalianDate(updated.dataNascita);
        }
        if (updated.dataInizio) {
            updated.dataInizio = parseItalianDate(updated.dataInizio);
        }
        if (updated.dataFine) {
            updated.dataFine = parseItalianDate(updated.dataFine);
        }

        // 1. Estrai Dati: Se c'è un codice fiscale valido, estrai i dati
        if (updated.codiceFiscale && validateCodiceFiscale(updated.codiceFiscale)) {
            try {
                const parsedData = await parseCodiceFiscale(updated.codiceFiscale);
                if (parsedData) {
                    // Imposta data nascita e sesso se estratti
                    if (parsedData.dataNascita) {
                        updated.dataNascita = parsedData.dataNascita;
                    }
                    if (parsedData.sesso) {
                        updated.sesso = parsedData.sesso;
                    }
                    if (parsedData.comuneNascita && !updated.comuneNascita) {
                        updated.comuneNascita = parsedData.comuneNascita;
                    }
                    if (parsedData.nazioneNascita && (!updated.nazioneNascita || updated.nazioneNascita === 'ITALIA')) {
                        updated.nazioneNascita = parsedData.nazioneNascita;
                    }
                }
            } catch (e) {
                console.error("Errore durante l'estrazione dei dati dal CF", e);
            }
        }

        // 2. Calcola: Se manca il CF ma abbiamo i dati anagrafici, calcoliamo il CF
        if (!updated.codiceFiscale) {
            const generatedCf = generateCodiceFiscale(updated);
            if (generatedCf) {
                updated.codiceFiscale = generatedCf;
            }
        }

        return updated;
    }));
};

