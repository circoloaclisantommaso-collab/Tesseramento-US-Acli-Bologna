import { Sesso, Tesserato } from '../types';
import CodiceFiscale from 'codice-fiscale-js';
import { validateCodiceFiscale } from './validation';
import { parseItalianDate } from './dateUtils';
import { COMUNI_E_CAP, getCapForComune, capToComuniMap } from '../comuniECap';
import { normalizeCittadinanza } from './cittadinanzaUtils';
import { Comune as CfComune } from 'codice-fiscale-js/src/comune.js';

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
export const decodeOmocodia = (str: string): string => {
    const omocodiaMap: { [key: string]: string } = {
        'L': '0', 'M': '1', 'N': '2', 'P': '3', 'Q': '4',
        'R': '5', 'S': '6', 'T': '7', 'U': '8', 'V': '9'
    };
    return str.split('').map(char => omocodiaMap[char] || char).join('');
};

function getLuogoNascita(codice: string): { comuneNascita: string; nazioneNascita: string } | null {
    // 1. Prova con la classe Comune di codice-fiscale-js (archivio completo con oltre 13.000 comuni italiani e stati esteri Z...)
    try {
        const c = CfComune.GetByCC(codice);
        if (c && c.nome) {
            const isForeign = codice.startsWith('Z') || c.prov === 'EE';
            return {
                comuneNascita: c.nome.toUpperCase(),
                nazioneNascita: isForeign ? c.nome.toUpperCase() : 'ITALIA'
            };
        }
    } catch {
        // prosegui con i fallback locali se non trovato
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

        const nazione = (tesserato.nazioneNascita || 'ITALIA').trim().toUpperCase();
        const isForeign = nazione !== 'ITALIA';
        const rawBirthplace = isForeign ? nazione : tesserato.comuneNascita.trim();

        // 1. Tentativo con il nome del luogo fornito
        try {
            const cf = new CodiceFiscale({
                name: tesserato.nome.trim(),
                surname: tesserato.cognome.trim(),
                gender: tesserato.sesso,
                day: day,
                month: month,
                year: year,
                birthplace: rawBirthplace,
                birthplaceProvincia: isForeign ? 'EE' : undefined
            });

            if ((cf as any).code) {
                return (cf as any).code.toUpperCase();
            }
        } catch {
            // Se fallisce, proviamo variazioni note (es. accenti apostrofati, alias comuni)
        }

        if (!isForeign) {
            const variants = [
                rawBirthplace.replace(/ì/gi, "i'").replace(/à/gi, "a'").replace(/è/gi, "e'").replace(/é/gi, "e'").replace(/ò/gi, "o'").replace(/ù/gi, "u'"),
                rawBirthplace.replace(/i'/gi, "ì").replace(/a'/gi, "à").replace(/e'/gi, "è").replace(/o'/gi, "ò").replace(/u'/gi, "ù"),
                rawBirthplace.toLowerCase().includes("reggio emilia") ? "Reggio nell'Emilia" : null,
                rawBirthplace.toLowerCase().includes("forli") ? "Forli'" : null
            ].filter((v): v is string => !!v && v !== rawBirthplace);

            for (const variant of variants) {
                try {
                    const cfVar = new CodiceFiscale({
                        name: tesserato.nome.trim(),
                        surname: tesserato.cognome.trim(),
                        gender: tesserato.sesso,
                        day: day,
                        month: month,
                        year: year,
                        birthplace: variant,
                        birthplaceProvincia: undefined
                    });
                    if ((cfVar as any).code) {
                        return (cfVar as any).code.toUpperCase();
                    }
                } catch {
                    // prova prossima variante
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
};

export const enrichTesseratiData = async (tesserati: Tesserato[]): Promise<Tesserato[]> => {
    await loadLuoghiData();
    return Promise.all(tesserati.map(async (t) => {
        const updated = { ...t };

        // Normalizzazione e pulizia stringhe iniziale
        updated.nome = (updated.nome || '').trim();
        updated.cognome = (updated.cognome || '').trim();
        updated.codiceFiscale = (updated.codiceFiscale || '').trim().toUpperCase();
        updated.comuneNascita = (updated.comuneNascita || '').trim();
        updated.comuneResidenza = (updated.comuneResidenza || '').trim();

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

        // Default privacy and citizenship settings
        if (updated.marketingUsa === null) updated.marketingUsa = true;
        if (updated.marketingPartners === null) updated.marketingPartners = true;
        if (updated.profilazioneUsa === null) updated.profilazioneUsa = true;
        if (updated.profilazionePartners === null) updated.profilazionePartners = true;
        
        // Normalizza la cittadinanza: sempre nome dello Stato sovrano (es. ITALIA, MAROCCO, ROMANIA), mai derivazioni
        updated.nazioneCittadinanza = normalizeCittadinanza(updated.nazioneCittadinanza);

        // 1. Estrai Dati dal Codice Fiscale
        if (updated.codiceFiscale && typeof updated.codiceFiscale === 'string') {
            updated.codiceFiscale = updated.codiceFiscale.trim().toUpperCase();
            if (validateCodiceFiscale(updated.codiceFiscale)) {
                try {
                    const parsedData = await parseCodiceFiscale(updated.codiceFiscale);
                    if (parsedData) {
                        // Imposta la data se vuota o se giorno e mese erano invertiti (formato MM/GG errato)
                        if (parsedData.dataNascita) {
                            if (!updated.dataNascita || updated.dataNascita === '') {
                                updated.dataNascita = parsedData.dataNascita;
                            } else {
                                const cfParts = parsedData.dataNascita.split('-');
                                const currParts = parseItalianDate(updated.dataNascita).split('-');
                                if (cfParts.length === 3 && currParts.length === 3) {
                                    // Se l'anno coincide e mese e giorno sono scambiati
                                    if (currParts[0] === cfParts[0] && currParts[1] === cfParts[2] && currParts[2] === cfParts[1]) {
                                        updated.dataNascita = parsedData.dataNascita;
                                    }
                                }
                            }
                        }
                        if (parsedData.sesso && (!updated.sesso || (updated.sesso as string) === '')) {
                            updated.sesso = parsedData.sesso as Sesso;
                        }
                        if (parsedData.comuneNascita && (!updated.comuneNascita || updated.comuneNascita === '')) {
                            updated.comuneNascita = parsedData.comuneNascita.toUpperCase();
                        }
                        if (parsedData.nazioneNascita && (!updated.nazioneNascita || updated.nazioneNascita === '' || updated.nazioneNascita === 'ITALIA')) {
                            updated.nazioneNascita = parsedData.nazioneNascita.toUpperCase();
                        }
                    }
                } catch (e) {
                    console.error("Errore durante l'estrazione dei dati dal CF", e);
                }
            }
        }

        // 2. Calcola Codice Fiscale se mancante ma abbiamo i dati necessari
        if (!updated.codiceFiscale || !validateCodiceFiscale(updated.codiceFiscale)) {
            const generatedCf = generateCodiceFiscale({
                ...updated,
                nome: (updated.nome || '').trim().toUpperCase(),
                cognome: (updated.cognome || '').trim().toUpperCase(),
                comuneNascita: (updated.comuneNascita || '').trim().toUpperCase(),
                nazioneNascita: (updated.nazioneNascita || 'ITALIA').trim().toUpperCase()
            });
            if (generatedCf) {
                updated.codiceFiscale = generatedCf;
            }
        }

        // 3. CAP di Residenza: Se c'è il comune di residenza ma manca il CAP di residenza, assegnalo in automatico
        if (updated.comuneResidenza && (!updated.capResidenza || !updated.capResidenza.trim())) {
            const autoCap = getCapForComune(updated.comuneResidenza);
            if (autoCap) {
                updated.capResidenza = autoCap;
            }
        }

        // 4. Inverso: Se c'è il CAP ma manca il Comune (spesso capita in import)
        if (updated.capResidenza && (!updated.comuneResidenza || !updated.comuneResidenza.trim())) {
            const possibleComuni = capToComuniMap.get(updated.capResidenza);
            if (possibleComuni && possibleComuni.length === 1) {
                updated.comuneResidenza = possibleComuni[0];
            }
        }

        return updated;
    }));
};

