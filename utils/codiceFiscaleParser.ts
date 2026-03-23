import { Sesso, Tesserato } from '../types';
import CodiceFiscale from 'codice-fiscale-js';

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

    try {
        let year = parseInt(cfUpper.substring(6, 8), 10);
        const currentYear = new Date().getFullYear() % 100;
        year += (year > currentYear) ? 1900 : 2000;

        const monthMap: { [key: string]: number } = { A: 0, B: 1, C: 2, D: 3, E: 4, H: 5, L: 6, M: 7, P: 8, R: 9, S: 10, T: 11 };
        const monthChar = cfUpper.substring(8, 9);
        const month = monthMap[monthChar];
        if (month === undefined) return null;

        let day = parseInt(cfUpper.substring(9, 11), 10);
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

        const codiceLuogo = cfUpper.substring(11, 15);
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
