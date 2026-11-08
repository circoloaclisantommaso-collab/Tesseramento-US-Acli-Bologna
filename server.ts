import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client with telemetry header
const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Chiave GEMINI_API_KEY non trovata nell'ambiente dell'applicazione.");
    }
    return new GoogleGenAI({
        apiKey,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
    });
};

import { normalizeCittadinanza } from './utils/cittadinanzaUtils';

const EXTRACTION_PROMPT = `
Estrai i dati di tutti i tesserati presenti in questo file o documento (testo, tabella, PDF o immagine modulo).
Restituisci ESCLUSIVAMENTE un JSON valido con una singola proprietà root "tesserati", contenente un array di oggetti tesserato.

REGOLA FONDAMENTALE SULLA CITTADINANZA (nazioneCittadinanza):
- Nel campo "nazioneCittadinanza" inserisci SEMPRE E SOLO il NOME DELLO STATO SOVRANO in lettere maiuscole (es. 'ITALIA', 'ROMANIA', 'MAROCCO', 'ALBANIA', 'FRANCIA', 'GERMANIA', 'SPAGNA', 'UCRAINA', 'SENEGAL', 'PERU', 'CINA', 'BRASILE', 'ARGENTINA', ecc.).
- NON inserire MAI la derivazione, demotico o aggettivo di nazionalità (MAI 'italiana', 'italiano', 'rumena', 'rumeno', 'marocchino', 'marocchina', 'albanese', 'francese', 'tedesco', 'ucraina', ecc.).
- Se nel testo, tabella o documento trovi un aggettivo/derivazione o indicazione di nazionalità (es. "Italiana", "Rumena", "Marocchino", "Albanese"), RAGIONA ed estrai SEMPRE il nome dello Stato corrispondente ("ITALIA", "ROMANIA", "MAROCCO", "ALBANIA").
- Se la persona è nata in Italia o ha codice fiscale italiano e non è indicata altra cittadinanza, imposta 'ITALIA'.

REGOLA FONDAMENTALE SULLE DATE (dataNascita, dataInizio, dataFine):
- In Italia le date nei documenti, tabelle e moduli sono SEMPRE scritte in formato GIORNO/MESE/ANNO (GG/MM/AAAA, es. '04/11/1985' = 4 Novembre 1985, NON 11 Aprile; '02/05/1990' = 2 Maggio 1990).
- FAI MASSIMA ATTENZIONE A NON INVERTIRE IL GIORNO E IL MESE!
- Quando converti la data nel formato richiesto YYYY-MM-DD:
  * Esempio: '04/11/1985' (4 Novembre 1985) DEVE diventare '1985-11-04' (ANNO=1985, MESE=11, GIORNO=04).
  * Esempio: '12/03/1990' (12 Marzo 1990) DEVE diventare '1990-03-12' (ANNO=1990, MESE=03, GIORNO=12).
  * Esempio: '01/09/2000' (1 Settembre 2000) DEVE diventare '2000-09-01'.
- Se è presente il Codice Fiscale, verifica SEMPRE che la data di nascita (mese e giorno) coincida con quanto codificato nel Codice Fiscale (mese: A=01, B=02, C=03, D=04, E=05, H=06, L=07, M=08, P=09, R=10, S=11, T=12; giorno posizioni 9-10 con -40 per donne).

Campi richiesti per ciascun tesserato (se deducibili dal documento, altrimenti ometti o imposta default sensati):
- classeTesseramento: 'SILVbase' o 'SILVbr' (se non specificato, usa 'SILVbase')
- tipoTesseramento: array di codici tra 'AAG', 'APR', 'DIR', 'TEC', 'UDG', 'AFT', 'AFO' (es. ['AAG'])
- dataInizio: data in formato YYYY-MM-DD
- dataFine: data in formato YYYY-MM-DD
- discipline: array di stringhe con i nomi delle discipline sportive (es. ['CALCIO', 'GINNASTICA'])
- nazioneCittadinanza: NOME DELLO STATO SOVRANO per esteso (es. 'ITALIA', 'ROMANIA', 'MAROCCO', 'ALBANIA')
- codiceFiscale: stringa di 16 caratteri alfanumerici maiuscoli
- cognome: stringa
- nome: stringa
- dataNascita: data in formato YYYY-MM-DD (attenzione: anno-mese-giorno derivante da GG/MM/AAAA)
- sesso: 'M' o 'F'
- nazioneNascita: stringa (es. 'ITALIA')
- comuneNascita: stringa con il comune di nascita (o nazione estera)
- indirizzoResidenza: stringa (via, piazza, civico)
- capResidenza: stringa di 5 cifre (es. '40121')
- comuneResidenza: stringa con il comune di residenza
- disabilita: array di stringhe tra 'F', 'SNV', 'SNU', 'IR', 'AD'
- marketingUsa: booleano (default false)
- marketingPartners: booleano (default false)
- profilazioneUsa: booleano (default false)
- profilazionePartners: booleano (default false)

Esempio di output atteso:
{
  "tesserati": [
    {
      "nome": "MARIO",
      "cognome": "ROSSI",
      "codiceFiscale": "RSSMRA80A01A944X",
      "dataNascita": "1980-01-01",
      "sesso": "M",
      "comuneNascita": "BOLOGNA",
      "nazioneNascita": "ITALIA",
      "nazioneCittadinanza": "ITALIA",
      "indirizzoResidenza": "VIA INDIPENDENZA 1",
      "comuneResidenza": "BOLOGNA",
      "capResidenza": "40121",
      "discipline": ["CALCIO"]
    }
  ]
}
`;

// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        hasGeminiKey: !!process.env.GEMINI_API_KEY
    });
});

// Robust content generator with model fallback and retry for high demand / 503 spikes
async function generateContentWithFallback(
    ai: GoogleGenAI,
    contents: any,
    config: any
): Promise<string> {
    const candidateModels = [
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite'
    ];

    let lastError: any = null;

    for (const model of candidateModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents,
                    config
                });

                if (response && response.text) {
                    return response.text;
                }
            } catch (err: any) {
                lastError = err;
                const errMsg = err?.message || String(err);
                const isTransient = errMsg.includes('503') || 
                                    errMsg.includes('UNAVAILABLE') || 
                                    errMsg.includes('high demand') ||
                                    errMsg.includes('429') ||
                                    errMsg.includes('RESOURCE_EXHAUSTED');

                console.warn(`[Gemini Fallback] Modello ${model} (tentativo ${attempt + 1}) non disponibile:`, errMsg.slice(0, 160));

                if (!isTransient) {
                    // Non-transient error, move directly to next candidate model
                    break;
                }

                if (attempt === 0) {
                    // Wait 600ms before retrying same model
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }
        }
    }

    const rawMsg = lastError?.message || String(lastError || 'Errore sconosciuto');
    if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        throw new Error("I server di Google Gemini stanno attualmente registrando un picco temporaneo di richieste (503). Si prega di riprovare tra qualche istante.");
    }
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("Quota di richieste Google Gemini temporaneamente esaurita. Riprova tra poco.");
    }

    throw new Error(rawMsg);
}

// Primary Gemini Import endpoint
app.post('/api/ai/import-tesserati', async (req, res) => {
    try {
        const { fileData, mimeType, rawData, fileName } = req.body;

        const ai = getGeminiClient();

        let contents: any;

        if (rawData && Array.isArray(rawData) && rawData.length > 0) {
            // Excel/CSV table data
            contents = {
                parts: [
                    { text: EXTRACTION_PROMPT },
                    { text: `Dati tabellari estratti dal file ${fileName || 'dati.xlsx'}:\n` + JSON.stringify(rawData) }
                ]
            };
        } else if (fileData) {
            // Document / Image / PDF in base64
            contents = {
                parts: [
                    {
                        inlineData: {
                            data: fileData,
                            mimeType: mimeType || 'application/pdf',
                        }
                    },
                    { text: EXTRACTION_PROMPT }
                ]
            };
        } else {
            return res.status(400).json({
                success: false,
                error: 'Nessun dato o file fornito per l\'elaborazione.'
            });
        }

        const rawText = await generateContentWithFallback(ai, contents, {
            responseMimeType: 'application/json',
        });

        const cleanJson = (rawText || '{"tesserati": []}').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        let parsed: any;
        try {
            parsed = JSON.parse(cleanJson);
        } catch {
            return res.status(500).json({
                success: false,
                error: 'Risposta del modello AI non in formato JSON valido.',
                rawResponse: rawText
            });
        }

        const rawTesserati = Array.isArray(parsed) ? parsed : (parsed.tesserati || []);
        const tesserati = rawTesserati.map((t: any) => ({
            ...t,
            nazioneCittadinanza: normalizeCittadinanza(t.nazioneCittadinanza || t.cittadinanza || 'ITALIA')
        }));

        return res.json({
            success: true,
            tesserati
        });

    } catch (err: any) {
        console.error('Errore durante l\'importazione con Gemini:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Errore imprevisto durante l\'elaborazione con Gemini.'
        });
    }
});

async function startServer() {
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
            res.sendFile(path.resolve(distPath, 'index.html'));
        });
    } else {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server attivo su http://0.0.0.0:${PORT}`);
    });
}

startServer();
