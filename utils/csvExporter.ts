import { Tesserato } from '../types';
import { formatItalianDate, parseItalianDate } from './dateUtils';
import { validateCodiceFiscale } from './validation';
import { decodeOmocodia } from './codiceFiscaleParser';

/**
 * Garantisce che la data di nascita sia SEMPRE esportata nel formato italiano GG/MM/AAAA (DD/MM/YYYY).
 * Se è presente un Codice Fiscale valido, verifica e riconcilia giorno e mese rispetto al CF
 * per prevenire qualsiasi inversione MM/GG derivante da importazioni o conversioni errate.
 */
export const formatBirthDateForExport = (t: Tesserato): string => {
    const cf = (t.codiceFiscale || '').trim().toUpperCase();
    if (cf.length === 16 && validateCodiceFiscale(cf)) {
        const monthMap: Record<string, string> = {
            A: '01', B: '02', C: '03', D: '04', E: '05', H: '06',
            L: '07', M: '08', P: '09', R: '10', S: '11', T: '12'
        };
        const cfMonthChar = cf.charAt(8);
        const cfMonth = monthMap[cfMonthChar];
        const rawDay = decodeOmocodia(cf.substring(9, 11));
        let cfDayNum = parseInt(rawDay, 10);
        if (!isNaN(cfDayNum)) {
            if (cfDayNum > 40) cfDayNum -= 40;
            if (cfDayNum >= 1 && cfDayNum <= 31 && cfMonth) {
                const cfDay = String(cfDayNum).padStart(2, '0');
                
                // Ricava l'anno completo a 4 cifre da dataNascita se disponibile
                let year = '';
                if (t.dataNascita) {
                    const iso = parseItalianDate(t.dataNascita);
                    if (iso && iso.includes('-')) {
                        year = iso.split('-')[0];
                    }
                }
                if (!year) {
                    const cfYearStr = decodeOmocodia(cf.substring(6, 8));
                    const yr = parseInt(cfYearStr, 10);
                    if (!isNaN(yr)) {
                        const curYr = new Date().getFullYear() % 100;
                        year = String(yr > curYr ? 1900 + yr : 2000 + yr);
                    }
                }
                if (year) {
                    return `${cfDay}/${cfMonth}/${year}`;
                }
            }
        }
    }

    // Se il CF non è presente o non valido, formatItalianDate garantisce GG/MM/AAAA
    return formatItalianDate(t.dataNascita);
};

export const exportToCsv = (data: Tesserato[], filename: string) => {
    const headers = [
        "Classe tesseramento", "Tipo tesseramento", "Data Inizio", "Data Fine",
        "Discipline", "Matricola", "Nazione cittadinanza", "Codice Fiscale",
        "Cognome", "Nome", "Data di nascita", "Sesso", "Nazione nascita",
        "Comune di nascita", "Indirizzo residenza", "Cap residenza",
        "Comune di residenza", "Marketing USAcli", "Marketing Partners USAcli",
        "Profilazione USAcli", "Profilazione Partners USAcli", "Disabilità"
    ];

    const formatPrivacy = (value: boolean | null): string => {
        if (value === true) return 'S';
        if (value === false) return 'N';
        return '';
    };

    const rows = data.map(t => [
        t.classeTesseramento,
        t.tipoTesseramento.join('|'),
        t.dataInizio ? formatItalianDate(t.dataInizio) : '',
        t.dataFine ? formatItalianDate(t.dataFine) : '',
        t.discipline.join('|'),
        '', // Matricola (vuota)
        t.nazioneCittadinanza,
        t.codiceFiscale.toUpperCase(),
        t.cognome,
        t.nome,
        formatBirthDateForExport(t),
        t.sesso,
        t.nazioneNascita,
        t.comuneNascita,
        t.indirizzoResidenza,
        t.capResidenza,
        t.comuneResidenza,
        formatPrivacy(t.marketingUsa),
        formatPrivacy(t.marketingPartners),
        formatPrivacy(t.profilazioneUsa),
        formatPrivacy(t.profilazionePartners),
        t.disabilita.join('|'),
    ].map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(';'));

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
