import { Tesserato } from '../types';

export const exportToCsv = (data: Tesserato[], filename: string) => {
    const headers = [
        "Classe tesseramento", "Tipo tesseramento", "Data Inizio", "Data Fine",
        "Discipline", "Matricola", "Nazione cittadinanza", "Codice Fiscale",
        "Cognome", "Nome", "Data di nascita", "Sesso", "Nazione nascita",
        "Comune di nascita", "Indirizzo residenza", "Cap residenza",
        "Comune di residenza", "Marketing USAcli", "Marketing Partners USAcli",
        "Profilazione USAcli", "Profilazione Partners USAcli", "Disabilità"
    ];

    const formatItalianDate = (isoDate: string) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

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
        formatItalianDate(t.dataNascita),
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
