import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Tesserato } from '../types';
import { DEFAULT_TESSERATO, getTodayDate } from '../constants';
import { getCapForComune, capToComuniMap } from '../comuniECap';
import { parseCsv, parseXlsx } from './fileImporter';
import { parseItalianDate } from './dateUtils';
import { AISettings } from '../components/AISettingsModal';
import { enrichTesseratiData } from './codiceFiscaleParser';
import { normalizeCittadinanza } from './cittadinanzaUtils';
import { generateUniqueId } from './idUtils';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const importTesseratiWithAI = async (file: File, settings: AISettings): Promise<Tesserato[]> => {
    const lowerCaseFileName = file.name.toLowerCase();
    
    const extractionPrompt = `
    Estrai i dati di tutti i tesserati presenti in questo file o testo.
    Restituisci un oggetto JSON con una singola chiave "tesserati" che contiene un array di oggetti, dove ogni oggetto rappresenta un tesserato.
    Cerca di dedurre i campi mancanti o di normalizzarli secondo i formati richiesti.
    
    REGOLA FONDAMENTALE SULLA CITTADINANZA (nazioneCittadinanza):
    - Nel campo "nazioneCittadinanza" inserisci SEMPRE E SOLO il NOME DELLO STATO SOVRANO in lettere maiuscole (es. 'ITALIA', 'ROMANIA', 'MAROCCO', 'ALBANIA', 'FRANCIA', 'GERMANIA', 'SPAGNA', 'UCRAINA', 'SENEGAL', 'PERU', 'CINA', 'BRASILE', 'ARGENTINA', ecc.).
    - NON inserire MAI la derivazione, demotico o aggettivo di nazionalità (MAI 'italiana', 'italiano', 'rumena', 'rumeno', 'marocchino', 'marocchina', 'albanese', 'francese', 'tedesco', 'ucraina', ecc.).
    - Se nel file o testo trovi una nazionalità o aggettivo (es. "Italiana", "Rumena", "Marocchino", "Albanese"), RAGIONA attentamente ed estrai SEMPRE il nome dello Stato sovrano corrispondente ("ITALIA", "ROMANIA", "MAROCCO", "ALBANIA").
    - Se la persona è nata in Italia o ha codice fiscale italiano e non è specificata altra nazionalità, la cittadinanza è 'ITALIA'.

    REGOLA FONDAMENTALE SULLE DATE (dataNascita, dataInizio, dataFine):
    - In Italia le date nei documenti, tabelle e moduli sono SEMPRE scritte in formato GIORNO/MESE/ANNO (GG/MM/AAAA, es. '04/11/1985' = 4 Novembre 1985, NON 11 Aprile; '02/05/1990' = 2 Maggio 1990).
    - FAI MASSIMA ATTENZIONE A NON INVERTIRE IL GIORNO E IL MESE!
    - Quando converti la data nel formato richiesto YYYY-MM-DD:
      * Esempio: '04/11/1985' (4 Novembre 1985) DEVE diventare '1985-11-04' (ANNO=1985, MESE=11, GIORNO=04).
      * Esempio: '12/03/1990' (12 Marzo 1990) DEVE diventare '1990-03-12' (ANNO=1990, MESE=03, GIORNO=12).
      * Esempio: '01/09/2000' (1 Settembre 2000) DEVE diventare '2000-09-01'.
    - Se è presente il Codice Fiscale, verifica SEMPRE che la data di nascita coincida con quanto codificato nel Codice Fiscale (mese e giorno).

    Regole per i campi:
    - classeTesseramento: 'SILVbase' o 'SILVbr'
    - tipoTesseramento: array di stringhe tra 'AAG', 'APR', 'DIR', 'TEC', 'UDG', 'AFT', 'AFO'
    - dataInizio: formato YYYY-MM-DD
    - dataFine: formato YYYY-MM-DD
    - discipline: array di stringhe (nomi delle discipline sportive)
    - nazioneCittadinanza: NOME DELLO STATO SOVRANO per esteso in maiuscolo (es. 'ITALIA', 'ROMANIA', 'MAROCCO', 'ALBANIA')
    - codiceFiscale: stringa di 16 caratteri alfanumerici maiuscoli
    - cognome: stringa
    - nome: stringa
    - dataNascita: formato YYYY-MM-DD (derivato da GG/MM/AAAA)
    - sesso: 'M' o 'F'
    - nazioneNascita: stringa
    - comuneNascita: stringa
    - indirizzoResidenza: stringa
    - capResidenza: stringa di 5 cifre
    - comuneResidenza: stringa
    - marketingUsa: booleano
    - marketingPartners: booleano
    - profilazioneUsa: booleano
    - profilazionePartners: booleano
    - disabilita: array di stringhe tra 'F', 'SNV', 'SNU', 'IR', 'AD'
    
    Restituisci ESATTAMENTE E SOLO un JSON valido, senza testo aggiuntivo o formattazione markdown.
    `;

    let rawTesseratiArray: any[] = [];

    // 1. Google Gemini via Server-Side API (Opzione predefinita con chiave di sistema)
    if (settings.provider === 'gemini') {
        const payload: {
            fileName: string;
            mimeType: string;
            rawData?: any[];
            fileData?: string;
        } = {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
        };

        if (lowerCaseFileName.endsWith('.csv') || lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
            if (lowerCaseFileName.endsWith('.csv')) {
                payload.rawData = await parseCsv(file);
            } else {
                payload.rawData = await parseXlsx(file);
            }
        } else {
            payload.fileData = await fileToBase64(file);
        }

        const response = await fetch('/api/ai/import-tesserati', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            let errMessage = errorJson.error || `Errore del server durante l'analisi con Gemini (${response.status})`;
            if (typeof errMessage === 'string' && (errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('UNAVAILABLE'))) {
                errMessage = "I server di Google Gemini sono temporaneamente sovraccarichi di richieste (503). Si prega di riprovare tra qualche istante.";
            } else if (typeof errMessage === 'string' && (errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED'))) {
                errMessage = "Quota o limite di richieste raggiunto per Google Gemini. Si prega di attendere qualche istante e riprovare.";
            }
            throw new Error(errMessage);
        }

        const data = await response.json();
        if (!data.success) {
            let errMessage = data.error || "Impossibile completare l'analisi con Gemini.";
            if (typeof errMessage === 'string' && (errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('UNAVAILABLE'))) {
                errMessage = "I server di Google Gemini sono temporaneamente sovraccarichi di richieste (503). Si prega di riprovare tra qualche istante.";
            }
            throw new Error(errMessage);
        }

        rawTesseratiArray = Array.isArray(data.tesserati) ? data.tesserati : [];

    } else if (settings.provider === 'openai') {
        if (!settings.openaiKey) throw new Error("Chiave API OpenAI mancante. Configurala nelle impostazioni.");
        const openai = new OpenAI({ apiKey: settings.openaiKey, dangerouslyAllowBrowser: true });
        
        let messages: any[] = [];
        if (lowerCaseFileName.endsWith('.csv') || lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
            let rawData: any[];
            if (lowerCaseFileName.endsWith('.csv')) {
                rawData = await parseCsv(file);
            } else {
                rawData = await parseXlsx(file);
            }
            messages = [
                { role: "system", content: extractionPrompt },
                { role: "user", content: "Dati estratti dal file:\n" + JSON.stringify(rawData) }
            ];
        } else {
            if (file.type.startsWith('image/')) {
                const base64Data = await fileToBase64(file);
                messages = [
                    { role: "system", content: extractionPrompt },
                    { role: "user", content: [
                        { type: "text", text: "Estrai i dati da questa immagine." },
                        { type: "image_url", image_url: { url: `data:${file.type};base64,${base64Data}` } }
                    ]}
                ];
            } else {
                throw new Error("OpenAI supporta solo file CSV, Excel o Immagini in questa modalità. Per i PDF usa Gemini.");
            }
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" },
        });
        const jsonStr = response.choices[0].message.content || '{"tesserati": []}';
        const parsed = JSON.parse(jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
        rawTesseratiArray = Array.isArray(parsed) ? parsed : (parsed.tesserati || []);

    } else if (settings.provider === 'anthropic') {
        if (!settings.anthropicKey) throw new Error("Chiave API Anthropic mancante. Configurala nelle impostazioni.");
        const anthropic = new Anthropic({ apiKey: settings.anthropicKey, dangerouslyAllowBrowser: true });
        
        let content: any[] = [];
        if (lowerCaseFileName.endsWith('.csv') || lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
            let rawData: any[];
            if (lowerCaseFileName.endsWith('.csv')) {
                rawData = await parseCsv(file);
            } else {
                rawData = await parseXlsx(file);
            }
            content = [
                { type: "text", text: "Dati estratti dal file:\n" + JSON.stringify(rawData) }
            ];
        } else {
            if (file.type.startsWith('image/')) {
                const base64Data = await fileToBase64(file);
                content = [
                    { type: "image", source: { type: "base64", media_type: file.type as any, data: base64Data } },
                    { type: "text", text: "Estrai i dati da questa immagine." }
                ];
            } else if (file.type === 'application/pdf') {
                const base64Data = await fileToBase64(file);
                content = [
                    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } } as any,
                    { type: "text", text: "Estrai i dati da questo documento." }
                ];
            } else {
                throw new Error("Formato file non supportato da Anthropic in questa modalità.");
            }
        }

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            system: extractionPrompt,
            messages: [
                { role: "user", content: content }
            ],
        });
        
        const textBlock = response.content.find(c => c.type === 'text');
        const jsonStr = textBlock && textBlock.type === 'text' ? textBlock.text : '{"tesserati": []}';
        const parsed = JSON.parse(jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
        rawTesseratiArray = Array.isArray(parsed) ? parsed : (parsed.tesserati || []);
    }

    const initialTesserati: Tesserato[] = rawTesseratiArray.map((data: any) => {
        const capFromFile = String(data.capResidenza || '').trim();
        const comuneFromFile = String(data.comuneResidenza || '').trim();

        let finalCap = capFromFile;
        let finalComune = comuneFromFile;

        if (capFromFile) {
            if (!finalComune) {
                const possibleComuni = capToComuniMap.get(capFromFile);
                if (possibleComuni && possibleComuni.length === 1) {
                    finalComune = possibleComuni[0];
                }
            }
        } else if (comuneFromFile) {
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
            ...data,
            nome: (data.nome || '').trim(),
            cognome: (data.cognome || '').trim(),
            codiceFiscale: (data.codiceFiscale || '').trim().toUpperCase(),
            dataInizio: parseItalianDate(data.dataInizio) || getTodayDate(),
            dataFine: parseItalianDate(data.dataFine) || '',
            dataNascita: parseItalianDate(data.dataNascita) || '',
            sesso: (data.sesso || '').toUpperCase(),
            comuneNascita: (data.comuneNascita || '').trim(),
            nazioneNascita: (data.nazioneNascita || 'ITALIA').trim(),
            tipoTesseramento: Array.isArray(data.tipoTesseramento) ? data.tipoTesseramento : ['AAG'],
            discipline: Array.isArray(data.discipline) ? data.discipline : [],
            disabilita: Array.isArray(data.disabilita) ? data.disabilita : [],
            capResidenza: finalCap,
            comuneResidenza: finalComune,
            nazioneCittadinanza: normalizeCittadinanza(data.nazioneCittadinanza || data.cittadinanza || 'ITALIA'),
            id: generateUniqueId(),
        } as Tesserato;
    });

    // Applica l'arricchimento e normalizzazione automatica (calcolo CF, decodifica da CF, CAP)
    return await enrichTesseratiData(initialTesserati);
};
