/**
 * Utility per la gestione, parsing e formattazione robusta delle date.
 * Supporta formati italiani (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY),
 * seriali Excel numerici, oggetti Date JS, formati ISO (YYYY-MM-DD) e timestamp.
 */

/**
 * Converte qualsiasi rappresentazione di data in formato ISO 'YYYY-MM-DD'
 * utilizzabile negli input HTML5 <input type="date"> e compatibile con il modello dati.
 */
export const parseItalianDate = (dateInput: any): string => {
    if (dateInput === null || dateInput === undefined || dateInput === '') {
        return '';
    }

    // 1. Se è già un oggetto Date valido
    if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return '';
        // Date create da parser Excel o UTC: preserva la data solare
        const isUtcMidnight = dateInput.getUTCHours() === 0 && dateInput.getUTCMinutes() === 0;
        const y = isUtcMidnight ? dateInput.getUTCFullYear() : dateInput.getFullYear();
        const m = String((isUtcMidnight ? dateInput.getUTCMonth() : dateInput.getMonth()) + 1).padStart(2, '0');
        const d = String(isUtcMidnight ? dateInput.getUTCDate() : dateInput.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 2. Se è un numero (seriale Excel) o stringa puramente numerica (es. 31245)
    if (typeof dateInput === 'number' || (typeof dateInput === 'string' && /^\d{4,6}$/.test(dateInput.trim()))) {
        const num = typeof dateInput === 'number' ? dateInput : parseInt(dateInput.trim(), 10);
        // Seriale Excel (da ~1900 a 2099 sono compresi tra 1 e 73050)
        if (num > 0 && num < 100000) {
            // Excel leap year bug adjustment (offset 25569 days between 1900-01-01 and 1970-01-01)
            const utcDays = num - 25569;
            const date = new Date(Math.round(utcDays * 86400 * 1000));
            if (!isNaN(date.getTime())) {
                const y = date.getUTCFullYear();
                const m = String(date.getUTCMonth() + 1).padStart(2, '0');
                const d = String(date.getUTCDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
        }
    }

    const str = String(dateInput).trim();
    if (!str) return '';

    // Se contiene spazio o 'T', estrai la parte iniziale (la data vera e propria)
    const cleanedStr = str.split(/[ T]/)[0].trim();

    // 3. Formato ISO YYYY-MM-DD o YYYY/MM/DD o YYYY.MM.DD
    const isoMatch = cleanedStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
        const y = isoMatch[1];
        let m = isoMatch[2].padStart(2, '0');
        let d = isoMatch[3].padStart(2, '0');
        // Se il mese estratto è > 12 e il giorno <= 12, era stato salvato YYYY-DD-MM (inversione)
        if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
            const temp = m;
            m = d;
            d = temp;
        }
        return `${y}-${m}-${d}`;
    }

    // 4. Formato Italiano o standard europeo DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const itMatch = cleanedStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (itMatch) {
        let d = itMatch[1].padStart(2, '0');
        let m = itMatch[2].padStart(2, '0');
        let y = itMatch[3];
        if (y.length === 2) {
            const currentYearTwoDigits = new Date().getFullYear() % 100;
            const yNum = parseInt(y, 10);
            y = String(yNum > currentYearTwoDigits ? 1900 + yNum : 2000 + yNum);
        }
        // Se il secondo numero è > 12 e il primo <= 12 (formato americano MM/DD/YYYY capitato per errore):
        // correggilo scambiando giorno e mese
        if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
            const temp = d;
            d = m;
            m = temp;
        }
        return `${y}-${m}-${d}`;
    }

    // 5. Tentativo con Date.parse per altri formati standard
    try {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    } catch {
        // ignora errore
    }

    return '';
};

/**
 * Converte una data (ISO o qualsiasi formato valido) nel formato italiano GG/MM/AAAA (DD/MM/YYYY) per esportazione CSV
 */
export const formatItalianDate = (dateInput: any): string => {
    const iso = parseItalianDate(dateInput);
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
        let [y, m, d] = parts;
        if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
            const temp = m;
            m = d;
            d = temp;
        }
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return '';
};
