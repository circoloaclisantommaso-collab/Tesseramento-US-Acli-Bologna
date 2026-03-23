import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Tesserato, ClasseTesseramento, TipoTesseramento, Sesso, Disabilita } from '../types';
import { DEFAULT_TESSERATO, getTodayDate } from '../constants';
import { COMUNI_E_CAP } from '../comuniECap';
import { parseCsv, parseXlsx } from './fileImporter';
import { AISettings } from '../components/AISettingsModal';

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
    
    const prompt = `
    Estrai i dati di tutti i tesserati presenti in questo file o testo.
    Restituisci un oggetto JSON con una singola chiave "tesserati" che contiene un array di oggetti, dove ogni oggetto rappresenta un tesserato.
    Cerca di dedurre i campi mancanti o di normalizzarli secondo i formati richiesti.
    
    Regole per i campi:
    - classeTesseramento: 'SILVbase' o 'SILVbr'
    - tipoTesseramento: array di stringhe tra 'AAG', 'APR', 'DIR', 'TEC', 'UDG', 'AFT', 'AFO'
    - dataInizio: formato YYYY-MM-DD
    - dataFine: formato YYYY-MM-DD
    - discipline: array di stringhe (nomi delle discipline sportive)
    - nazioneCittadinanza: stringa (es. 'ITALIA')
    - codiceFiscale: stringa di 16 caratteri alfanumerici maiuscoli
    - cognome: stringa
    - nome: stringa
    - dataNascita: formato YYYY-MM-DD
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
    Esempio di output:
    {
      "tesserati": [
        { "nome": "Mario", "cognome": "Rossi" }
      ]
    }
    `;

    let jsonStr = "";

    if (settings.provider === 'gemini') {
        if (!settings.geminiKey) throw new Error("Chiave API Gemini mancante. Configurala nelle impostazioni.");
        const ai = new GoogleGenAI({ apiKey: settings.geminiKey });
        
        let contents: any;
        if (lowerCaseFileName.endsWith('.csv') || lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
            let rawData: any[];
            if (lowerCaseFileName.endsWith('.csv')) {
                rawData = await parseCsv(file);
            } else {
                rawData = await parseXlsx(file);
            }
            contents = {
                parts: [
                    { text: prompt },
                    { text: "Dati estratti dal file:\n" + JSON.stringify(rawData) }
                ]
            };
        } else {
            const base64Data = await fileToBase64(file);
            const mimeType = file.type || 'application/octet-stream';
            contents = {
                parts: [
                    { inlineData: { data: base64Data, mimeType: mimeType } },
                    { text: prompt },
                ],
            };
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: contents,
            config: {
                responseMimeType: "application/json",
            },
        });
        jsonStr = response.text?.trim() || '{"tesserati": []}';

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
                { role: "system", content: prompt },
                { role: "user", content: "Dati estratti dal file:\n" + JSON.stringify(rawData) }
            ];
        } else {
            if (file.type.startsWith('image/')) {
                const base64Data = await fileToBase64(file);
                messages = [
                    { role: "system", content: prompt },
                    { role: "user", content: [
                        { type: "text", text: "Estrai i dati da questa immagine." },
                        { type: "image_url", image_url: { url: `data:${file.type};base64,${base64Data}` } }
                    ]}
                ];
            } else {
                throw new Error("OpenAI supporta solo file CSV, Excel o Immagini in questa modalità. Per i PDF usa Gemini o Anthropic.");
            }
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" },
        });
        jsonStr = response.choices[0].message.content || '{"tesserati": []}';

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
            system: prompt,
            messages: [
                { role: "user", content: content }
            ],
        });
        
        const textBlock = response.content.find(c => c.type === 'text');
        jsonStr = textBlock && textBlock.type === 'text' ? textBlock.text : '{"tesserati": []}';
    }

    // Clean up markdown formatting if present
    jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

    let parsedData: any = { tesserati: [] };
    try {
        parsedData = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse AI response", e);
        console.log("Raw response:", jsonStr);
        throw new Error("L'AI ha restituito un formato non valido.");
    }

    const tesseratiArray = Array.isArray(parsedData) ? parsedData : (parsedData.tesserati || []);

    // Pre-compute map from CAP to comuni for efficient lookup
    const capToComuniMap = new Map<string, string[]>();
    COMUNI_E_CAP.forEach(comune => {
        comune.cap.forEach(cap => {
            if (!capToComuniMap.has(cap)) {
                capToComuniMap.set(cap, []);
            }
            capToComuniMap.get(cap)!.push(comune.nome);
        });
    });

    const importedTesserati: Tesserato[] = tesseratiArray.map((data: any) => {
        const capFromFile = String(data.capResidenza || '').trim();
        const comuneFromFile = String(data.comuneResidenza || '').trim();

        let finalCap = capFromFile;
        let finalComune = comuneFromFile;

        if (capFromFile) {
            const possibleComuni = capToComuniMap.get(capFromFile);
            if (possibleComuni && possibleComuni.length === 1) {
                finalComune = possibleComuni[0];
            }
        } else if (comuneFromFile) {
            const comuneData = COMUNI_E_CAP.find(c => c.nome.toUpperCase() === comuneFromFile.toUpperCase());
            if (comuneData && comuneData.cap.length === 1) {
                finalCap = comuneData.cap[0];
            }
        }

        return {
            ...DEFAULT_TESSERATO,
            ...data,
            dataInizio: data.dataInizio || getTodayDate(),
            tipoTesseramento: Array.isArray(data.tipoTesseramento) ? data.tipoTesseramento : [],
            discipline: Array.isArray(data.discipline) ? data.discipline : [],
            disabilita: Array.isArray(data.disabilita) ? data.disabilita : [],
            capResidenza: finalCap,
            comuneResidenza: finalComune,
            nazioneCittadinanza: data.nazioneCittadinanza || 'ITALIA',
            marketingUsa: true,
            marketingPartners: true,
            profilazioneUsa: true,
            profilazionePartners: true,
            id: Date.now() + Math.random(),
        } as Tesserato;
    });

    return importedTesserati;
};
