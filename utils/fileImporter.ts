import { Tesserato, Sesso } from '../types';
import { DEFAULT_TESSERATO, getTodayDate } from '../constants';
import { COMUNI_E_CAP, getCapForComune, capToComuniMap } from '../comuniECap';
import { parseItalianDate } from './dateUtils';
import { normalizeCittadinanza } from './cittadinanzaUtils';
import { generateUniqueId } from './idUtils';

// These will be global variables from the script tags in index.html
declare var Papa: any;
declare var XLSX: any;

// A map from possible header names to Tesserato keys.
// Keys are lowercased for case-insensitive matching to support variations.
const HEADER_MAP: { [key: string]: keyof Tesserato } = {
    // Variations for 'classeTesseramento'
    'classe tesseramento': 'classeTesseramento',
    'classe': 'classeTesseramento',
    'classe_tesseramento': 'classeTesseramento',

    // Variations for 'tipoTesseramento'
    'tipo tesseramento': 'tipoTesseramento',
    'tipo': 'tipoTesseramento',
    'tipo_tesseramento': 'tipoTesseramento',

    // Variations for 'dataInizio'
    'data inizio': 'dataInizio',
    'inizio validità': 'dataInizio',
    'data_inizio': 'dataInizio',
    'inizio': 'dataInizio',

    // Variations for 'dataFine'
    'data fine': 'dataFine',
    'scadenza': 'dataFine',
    'fine validità': 'dataFine',
    'data_fine': 'dataFine',
    'fine': 'dataFine',
    
    // Variations for 'discipline'
    'discipline': 'discipline',
    'disciplina': 'discipline',
    
    // Variations for 'nazioneCittadinanza'
    'nazione cittadinanza': 'nazioneCittadinanza',
    'cittadinanza': 'nazioneCittadinanza',
    'nazione_cittadinanza': 'nazioneCittadinanza',
    
    // Variations for 'codiceFiscale'
    'codice fiscale': 'codiceFiscale',
    'codice_fiscale': 'codiceFiscale',
    'cf': 'codiceFiscale',
    'cod. fisc.': 'codiceFiscale',
    'cod.fisc.': 'codiceFiscale',
    'codice fisc': 'codiceFiscale',
    
    'cognome': 'cognome',
    'nome': 'nome',
    
    // Variations for 'dataNascita'
    'data di nascita': 'dataNascita',
    'data nascita': 'dataNascita',
    'data_nascita': 'dataNascita',
    'data_di_nascita': 'dataNascita',
    'datanascita': 'dataNascita',
    'nato il': 'dataNascita',
    'nato/a il': 'dataNascita',
    'data': 'dataNascita',
    'dt nascita': 'dataNascita',
    'dt. nascita': 'dataNascita',
    'data nasc': 'dataNascita',
    'data nasc.': 'dataNascita',
    'birth date': 'dataNascita',
    'birthdate': 'dataNascita',
    'd.o.b.': 'dataNascita',
    'dob': 'dataNascita',

    // Variations for 'sesso'
    'sesso': 'sesso',
    'genere': 'sesso',
    'sex': 'sesso',
    'gender': 'sesso',
    
    // Variations for 'nazioneNascita'
    'nazione nascita': 'nazioneNascita',
    'nazione di nascita': 'nazioneNascita',
    'nazione_nascita': 'nazioneNascita',
    'stato nascita': 'nazioneNascita',
    'stato di nascita': 'nazioneNascita',
    
    // Variations for 'comuneNascita'
    'comune di nascita': 'comuneNascita',
    'comune nascita': 'comuneNascita',
    'comune_nascita': 'comuneNascita',
    'luogo di nascita': 'comuneNascita',
    'luogo nascita': 'comuneNascita',
    'luogo_nascita': 'comuneNascita',

    // Variations for 'indirizzoResidenza'
    'indirizzo residenza': 'indirizzoResidenza',
    'indirizzo': 'indirizzoResidenza',
    'indirizzo_residenza': 'indirizzoResidenza',
    'via': 'indirizzoResidenza',

    // Variations for 'capResidenza'
    'cap residenza': 'capResidenza',
    'cap': 'capResidenza',
    'cap_residenza': 'capResidenza',
    'c.a.p.': 'capResidenza',
    
    // Variations for 'comuneResidenza'
    'comune di residenza': 'comuneResidenza',
    'comune residenza': 'comuneResidenza',
    'comune_residenza': 'comuneResidenza',
    'città residenza': 'comuneResidenza',
    'città': 'comuneResidenza',
    'citta': 'comuneResidenza',
    'citta residenza': 'comuneResidenza',
    
    'marketing usacli': 'marketingUsa',
    'marketing usa': 'marketingUsa',
    'marketing partners usacli': 'marketingPartners',
    'marketing partner': 'marketingPartners',
    'profilazione usacli': 'profilazioneUsa',
    'profilazione usa': 'profilazioneUsa',
    'profilazione partners usacli': 'profilazionePartners',
    'profilazione partner': 'profilazionePartners',
    
    // Variations for 'disabilita'
    'disabilità': 'disabilita',
    'disabilita': 'disabilita',
};


const normalizeHeader = (header: string) => header.toLowerCase().trim();

// FIX: Made the function more robust to handle string representations of booleans like "TRUE" or "FALSE".
// Changed parameter type to 'any' to robustly handle various input types from file parsers (e.g., number, string, boolean).
const parsePrivacy = (value: any): boolean | null => {
    if (typeof value === 'boolean' || value === null) return value;
    const upperVal = String(value).trim().toUpperCase();
    if (upperVal === 'S' || upperVal === 'TRUE' || upperVal === 'SI' || upperVal === 'SÌ' || upperVal === '1') return true;
    if (upperVal === 'N' || upperVal === 'FALSE' || upperVal === 'NO' || upperVal === '0') return false;
    return null;
};

const processRow = (rawRow: any, headerMapping: { [key: string]: keyof Tesserato }): Partial<Tesserato> => {
    const tesserato: Partial<Tesserato> = {};
    for (const rawHeader in rawRow) {
        const normalizedHeader = normalizeHeader(rawHeader);
        const tesseratoField = headerMapping[normalizedHeader];
        if (tesseratoField) {
            let value = rawRow[rawHeader];
            
            switch (tesseratoField) {
                case 'dataInizio':
                case 'dataFine':
                case 'dataNascita':
                    value = parseItalianDate(value);
                    break;
                case 'marketingUsa':
                case 'marketingPartners':
                case 'profilazioneUsa':
                case 'profilazionePartners':
                    value = parsePrivacy(value);
                    break;
                case 'tipoTesseramento':
                case 'discipline':
                case 'disabilita':
                    value = typeof value === 'string' ? value.split('|').map(s => s.trim()).filter(Boolean) : [];
                    break;
                case 'codiceFiscale':
                    value = typeof value === 'string' ? value.toUpperCase().trim() : '';
                    break;
                case 'sesso':
                     // FIX: Refactored sesso parsing to be more robust.
                     const s = String(value ?? '').trim().toUpperCase();
                     value = s === 'M' || s === 'MASCHIO' || s === 'MALE' ? Sesso.M : (s === 'F' || s === 'FEMMINA' || s === 'FEMALE' ? Sesso.F : '');
                     break;
                default:
                    // FIX: Ensure all other fields are converted to string to avoid type mismatches
                    // when a cell contains a boolean or number by mistake.
                    value = String(value ?? '').trim();
            }
            (tesserato as any)[tesseratoField] = value;
        }
    }
    return tesserato;
};

export const parseCsv = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                if (results.errors && results.errors.length) {
                    reject(new Error('Errore durante il parsing del CSV: ' + results.errors[0].message));
                } else {
                    resolve(results.data);
                }
            },
            error: (error: any) => {
                reject(new Error('Errore nel file CSV: ' + error.message));
            }
        });
    });
};

export const parseXlsx = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: 'yyyy-mm-dd' });
                resolve(json);
            } catch (err: any) {
                reject(new Error('Errore durante la lettura del file Excel: ' + err.message));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const importTesseratiFromFile = async (file: File): Promise<Tesserato[]> => {
    let rawData: any[];
    const lowerCaseFileName = file.name.toLowerCase();

    if (lowerCaseFileName.endsWith('.csv')) {
        rawData = await parseCsv(file);
    } else if (lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
        rawData = await parseXlsx(file);
    } else {
        throw new Error('Formato file non supportato. Usare .csv o .xlsx');
    }

    if (!rawData || rawData.length === 0) {
        return [];
    }

    const firstRow = rawData[0];
    const detectedHeaderMapping: { [key: string]: keyof Tesserato } = {};
    for (const rawHeader in firstRow) {
        const normalized = normalizeHeader(rawHeader);
        if (HEADER_MAP[normalized]) {
            detectedHeaderMapping[normalized] = HEADER_MAP[normalized];
        }
    }
    
    if (Object.keys(detectedHeaderMapping).length === 0) {
        throw new Error("Intestazioni di colonna non riconosciute. Assicurarsi che il file contenga intestazioni come 'Codice Fiscale', 'Nome', 'Cognome', ecc.");
    }

    const importedTesserati = rawData
        .map(row => {
            const processedData = processRow(row, detectedHeaderMapping);
            if (!processedData.codiceFiscale && !processedData.nome && !processedData.cognome) {
                return null; // Skip empty rows
            }
            
            const capFromFile = String(processedData.capResidenza || '').trim();
            const comuneFromFile = String(processedData.comuneResidenza || '').trim();

            let finalCap = capFromFile;
            let finalComune = comuneFromFile;

            if (capFromFile) {
                // Priority to CAP: If a CAP exists in the file, use it to find the definitive comune if not set.
                if (!finalComune) {
                    const possibleComuni = capToComuniMap.get(capFromFile);
                    if (possibleComuni && possibleComuni.length === 1) {
                        finalComune = possibleComuni[0];
                    }
                }
            } else if (comuneFromFile) {
                // No CAP in file: If a comune exists, assign the CAP automatically.
                const autoCap = getCapForComune(comuneFromFile);
                if (autoCap) {
                    finalCap = autoCap;
                }
            }

            if (finalComune && !finalCap) {
                const autoCap = getCapForComune(finalComune);
                if (autoCap) {
                    finalCap = autoCap;
                }
            }
            
            return {
                ...DEFAULT_TESSERATO,
                ...processedData,
                dataInizio: processedData.dataInizio || getTodayDate(),
                capResidenza: finalCap,
                comuneResidenza: finalComune,
                nazioneCittadinanza: normalizeCittadinanza(processedData.nazioneCittadinanza || 'ITALIA'),
                id: generateUniqueId(),
            } as Tesserato;
        })
        .filter((t): t is Tesserato => t !== null);

    return importedTesserati;
};
