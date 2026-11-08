# Integrazione Nativa Google Gemini con Chiave di Sistema per Importazione AI

Implementazione dell'importazione intelligente dei tesserati alimentata direttamente da Google Gemini (modello gemini-3.8-flash) tramite backend server-side dedicato con la chiave API associata all'account di sistema, eliminando qualsiasi configurazione o richiesta manuale di token all'utente.

## Decisioni Approvate e Revisione Utente

> [!IMPORTANT]
> **Scelte confermate dall'utente nella fase preliminare:**
> - **Autenticazione Gemini trasparente**: Viene utilizzata direttamente la chiave API di sistema presente nell'ambiente (`GEMINI_API_KEY`), senza richiedere all'utente di reperire o incollare token manuali.
> - **Flusso one-click immediato**: Cliccando su "Importa con AI" l'utente seleziona direttamente il documento; l'elaborazione viene avviata istantaneamente senza popup bloccanti.
> - **Supporto documentale omni-canale**: Pieno supporto all'elaborazione multimodale di file Excel (`.xlsx`, `.xls`), elenchi `.csv`, documenti PDF scansionati e immagini/fotografie di moduli cartacei di iscrizione.

---

## 1. Panoramica e Concetto Chiave

- **Cosa fa**: Consente ai segretari e dirigenti delle società sportive US Acli Bologna di importare elenchi tesserati da qualsiasi fonte (fogli di calcolo grezzi, elenchi esportati da altri gestionali, PDF di riepilogo o foto di cartacei compilati a mano) semplicemente caricando il file. Il sistema estrae i campi tesserato (nome, cognome, codice fiscale, date, indirizzi, discipline, quote e consensi) e li integra nell'elenco tesserati con normalizzazione automatica dei CAP e dei Comuni.
- **Destinatari**: Addetti al tesseramento US Acli che desiderano velocizzare l'inserimento senza dover inserire credenziali o configurazioni complesse.
- **Valore Principale**: Rimozione completa dell'attrito iniziale (zero API keys da inserire, zero barriere tecniche) e massima accuratezza nell'estrazione dati grazie al modello multimodale `gemini-3.8-flash`.

---

## 2. Esperienza Utente e Design Visivo

- **Flusso Utente**:
  1. L'utente clicca sul pulsante primario **"Importa con AI"** nella barra superiore o nel pannello azioni.
  2. Si apre direttamente il selettore file nativo con supporto a `.xlsx, .xls, .csv, .pdf, .png, .jpg, .jpeg, .webp`.
  3. Durante la lettura, compare un dialog di elaborazione fluido e discreto con indicatore di progresso ("Analisi del documento con Gemini...", "Estrazione dati anagrafici e normalizzazione...").
  4. I tesserati estratti vengono aggiunti all'elenco esistente (modalità append sicura, senza cancellare i dati già inseriti) e arricchiti con il calcolo automatico di CAP, Comuni e Codici Fiscali.
  5. Una notifica di successo conferma il numero esatto di tesserati aggiunti.
- **Trattamento Impostazioni AI**:
  - Il pulsante o pannello impostazioni viene semplificato: segnala con badge verde che Gemini è attivo e pronto all'uso con la licenza dell'ambiente di lavoro.
  - Vengono mantenute solo opzionalmente le configurazioni per provider terzi (OpenAI / Claude) per utenti esperti con proprie chiavi, ma Gemini di sistema rimane la scelta primaria e predefinita.
- **Stile e Gerarchia Visiva**:
  - Palette colori coordinata con lo standard dell'app (blu istituzionale, superfici neutre pulite, tipografia leggibile).
  - Feedback interattivo con transizioni veloci ($\le 200\text{ms}$) e messaggi di errore chiari nel caso in cui un file risulti illeggibile o corrotto.

---

## 3. Decisioni Tecniche e Trade-Off

- **Architettura Full-Stack con Express & Dev Middleware**:
  - *Approccio Scelto*: Creazione di un server Express (`server.ts`) che gestisce le chiamate server-side a `@google/genai` e monta i middleware di Vite per lo sviluppo (`npm run dev` tramite `tsx server.ts`).
  - *Motivazione*: Protegge la chiave API di sistema mantenendola esclusivamente sul backend (`process.env.GEMINI_API_KEY`) e rispetta le linee guida architetturali di Google AI Studio Build.
- **Modello Gemini 3.8 Flash**:
  - *Approccio Scelto*: Utilizzo di `gemini-3.8-flash` con estrazione strutturata in formato JSON (`responseMimeType: "application/json"`).
  - *Motivazione*: Elevatissima velocità di risposta, eccellente comprensione multimodale (visione per foto e scansioni PDF) e output JSON rigoroso per la validazione automatica.
- **Compatibilità e Fallback per Provider Esterni**:
  - *Approccio Scelto*: Il sistema privilegia sempre la route `/api/ai/import` con Gemini server-side. Se l'utente imposta esplicitamente un provider alternativo come OpenAI/Anthropic nel client, la chiamata gestirà il payload corrispondente.

---

## 4. Architettura Tecnica e Strategia Dati

### Schema Architetturale e Flusso Dati

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React / Vite)                   │
│                                                              │
│  [Pulsante "Importa con AI"] ──> Selezione File              │
│               │                                              │
│               ▼                                              │
│  Base64 / Multipart Payload                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │ POST /api/ai/import-tesserati
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                Backend Server (Express / server.ts)          │
│                                                              │
│  1. Ricezione file (Excel, CSV, PDF, Immagine)               │
│  2. Inizializzazione SDK: new GoogleGenAI({                  │
│       apiKey: process.env.GEMINI_API_KEY                     │
│     })                                                       │
│  3. Invocazione modello: gemini-3.8-flash                     │
│  4. Estrazione JSON strutturato dei tesserati                │
│  5. Restituzione array normalizzato                          │
└───────────────────────┬──────────────────────────────────────┘
                        │ Response JSON: { tesserati: [...] }
                        ▼
┌──────────────────────────────────────────────────────────────┐
│             Frontend Post-Processing & State                │
│                                                              │
│  1. enrichTesseratiData() (CAP, Codici Fiscali, Comuni)      │
│  2. Append allo stato globale dei tesserati                  │
│  3. Feedback visivo di completamento                         │
└──────────────────────────────────────────────────────────────┘
```

### Componenti e Modifiche Previste

1. **`server.ts`**:
   - Server Express con supporto a `express.json({ limit: '50mb' })`.
   - Endpoint `POST /api/ai/import-tesserati` che chiama `ai.models.generateContent` con `gemini-3.8-flash` e `apiKey: process.env.GEMINI_API_KEY`.
   - Integrazione di `vite.createServer` in modalità development e `express.static` in produzione.
2. **`metadata.json`**:
   - Aggiunta della capability `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` come richiesto dai vincoli di sistema.
3. **`package.json`**:
   - Aggiunta di `express`, `tsx` e `@types/express`.
   - Aggiornamento dello script dev (`tsx server.ts`) e start (`node server.ts`).
4. **`utils/aiImporter.ts`**:
   - Aggiornamento della logica per inviare i file alla route `/api/ai/import-tesserati` con fallback automatico e gestione fluida di tutti i tipi di mime.
5. **`components/AISettingsModal.tsx` & `App.tsx`**:
   - Mostrare Gemini come attivo di default ("Pronto all'uso con l'account corrente").
   - Selezione immediata del file al click su "Importa con AI", senza chiedere token all'utente.
