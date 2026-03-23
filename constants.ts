import { ClasseTesseramento, TipoTesseramento, Sesso, Disabilita, Tesserato } from './types';

export const CLASSE_TESSERAMENTO_OPTIONS = [
    {
        label: 'dal 01 maggio al 31 agosto',
        options: [
            { value: ClasseTesseramento.ESTbas, label: 'ESTIVA BASE (ESTbas)' },
            { value: ClasseTesseramento.ESTcal, label: 'ESTIVA CALCIO (ESTcal)' },
            { value: ClasseTesseramento.ESTcil, label: 'ESTIVA CICLISMO (ESTcil)' },
            { value: ClasseTesseramento.ESTomnia, label: 'ESTIVA OMNIA (ESTomnia)' },
        ]
    },
    {
        label: 'dal 01 gennaio al 31 dicembre',
        options: [
            { value: ClasseTesseramento.Frie, label: 'FRIENDLY (Frie)' },
            { value: ClasseTesseramento.GIOVbas, label: 'GIOVANI BASE (GIOVbas)' },
            { value: ClasseTesseramento.GIOVca, label: 'GIOVANI CALCIO (GIOVca)' },
            { value: ClasseTesseramento.GIOVci, label: 'GIOVANI CICLISMO (GIOVci)' },
            { value: ClasseTesseramento.GIOVomnia, label: 'GIOVANI OMNIA (GIOVomnia)' },
            { value: ClasseTesseramento.GOLDbas, label: 'GOLD BASE (GOLDbas)' },
            { value: ClasseTesseramento.GOLDbr, label: 'GOLD BASSO RISCHIO (GOLDbr)' },
            { value: ClasseTesseramento.GOLCA, label: 'GOLD CALCIO (GOLCA)' },
            { value: ClasseTesseramento.gocic, label: 'GOLD CICLISMO (gocic)' },
            { value: ClasseTesseramento.golss, label: 'GOLD SPORT SPECIALI (golss)' },
            { value: ClasseTesseramento.GOLDomnia, label: 'GOLD OMNIA (GOLDomnia)' },
            { value: ClasseTesseramento.PLAbas, label: 'PLATINUM BASE (PLAbas)' },
            { value: ClasseTesseramento.plabs, label: 'PLATINUM BASSO RISCHIO (plabs)' },
            { value: ClasseTesseramento.PLATca, label: 'PLATINUM CALCIO (PLATca)' },
            { value: ClasseTesseramento.PLAcc, label: 'PLATINUM CALCIO CC (PLAcc)' },
            { value: ClasseTesseramento.PLATci, label: 'PLATINUM CICLISMO (PLATci)' },
            { value: ClasseTesseramento.PLATss, label: 'PLATINUM SPORT SPECIALI (PLATss)' },
            { value: ClasseTesseramento.PLATomnia, label: 'PLATINUM OMNIA (PLATomnia)' },
            { value: ClasseTesseramento.SILVbase, label: 'SILVER BASE (SILVbase)' },
            { value: ClasseTesseramento.SILVbr, label: 'SILVER BASSO RISCHIO (SILVbr)' },
            { value: ClasseTesseramento.SILVca, label: 'SILVER CALCIO (SILVca)' },
            { value: ClasseTesseramento.SILVci, label: 'SILVER CICLISMO (SILVci)' },
            { value: ClasseTesseramento.SILVbrp, label: 'SILVER BASSO RISCHIO (SILVbrp)' },
            { value: ClasseTesseramento.SILVomnia, label: 'SILVER OMNIA (SILVomnia)' },
            { value: ClasseTesseramento.TESvolo, label: 'TESSERA VOLONTARIO (TESvolo)' },
            { value: ClasseTesseramento.GOLD_A, label: 'GOLD-A (GOLD-A)' },
            { value: ClasseTesseramento.PLA_A, label: 'PLATINUM-A (PLA-A)' },
            { value: ClasseTesseramento.SIL_A, label: 'SILVER-A (SIL-A)' },
        ]
    },
    {
        label: 'dal 01 gennaio al 31 dicembre valgono 7gg assicurativamente',
        options: [
            { value: ClasseTesseramento.PROBA, label: 'PROMOZIONALE BASE (PROBA)' },
            { value: ClasseTesseramento.PRObasRi, label: 'PROMOZIONALE BASSO RISCHIO (PRObasRi)' },
            { value: ClasseTesseramento.GIORNca, label: 'GIORNALIERA CALCIO (GIORNca)' },
            { value: ClasseTesseramento.GIORNci, label: 'GIORNALIERA CICLISMO (GIORNci)' },
            { value: ClasseTesseramento.GIORNss, label: 'GIORNALIERA SPORT SPECIALI (GIORNss)' },
            { value: ClasseTesseramento.GIORNomnia, label: 'GIORNALIERA OMNIA (GIORNomnia)' },
        ]
    },
    {
        label: 'dal 01 settembre al 31 dicembre',
        options: [
            { value: ClasseTesseramento.GIOVbas365, label: 'GIOVANI BASE 365GG (GIOVbas365)' },
            { value: ClasseTesseramento.GIOVca365, label: 'GIOVANI CALCIO 365GG (GIOVca365)' },
            { value: ClasseTesseramento.GIOVci365, label: 'GIOVANI CICLISMO 365GG (GIOVci365)' },
            { value: ClasseTesseramento.GIOVOmnia365, label: 'GIOVANI OMNIA 365GG (GIOVOmnia365)' },
            { value: ClasseTesseramento.GOLDbas365, label: 'GOLD BASE 365GG (GOLDbas365)' },
            { value: ClasseTesseramento.GOLDbr365, label: 'GOLD BASSO RISCHIO 365GG (GOLDbr365)' },
            { value: ClasseTesseramento.GOLDca365, label: 'GOLD CALCIO 365GG (GOLDca365)' },
            { value: ClasseTesseramento.GOLDomnia365, label: 'GOLD OMNIA 365GG (GOLDomnia365)' },
            { value: ClasseTesseramento.PLATbas365, label: 'PLATINUM BASE 365GG (PLATbas365)' },
            { value: ClasseTesseramento.PLATbr365, label: 'PLATINUM BASSO RISCHIO 365GG (PLATbr365)' },
            { value: ClasseTesseramento.PLATca365, label: 'PLATINUM CALCIO 365GG (PLATca365)' },
            { value: ClasseTesseramento.PLAcc365, label: 'PLATINUM CALCIO CC 365GG (PLAcc365)' },
            { value: ClasseTesseramento.PLATomnia365, label: 'PLATINUM OMNIA 365GG (PLATomnia365)' },
            { value: ClasseTesseramento.SILVbas365, label: 'SILVER BASE 365GG (SILVbas365)' },
            { value: ClasseTesseramento.SILVbr365, label: 'SILVER BASSO RISCHIO 365GG (SILVbr365)' },
            { value: ClasseTesseramento.SILVca365, label: 'SILVER CALCIO 365GG (SILVca365)' },
            { value: ClasseTesseramento.SILVci365, label: 'SILVER CICLISMO 365GG (SILVci365)' },
            { value: ClasseTesseramento.SILVbrp365, label: 'SILVER BASSO RISCHIO 365GG (SILVbrp365)' },
            { value: ClasseTesseramento.SILVomnia365, label: 'SILVER OMNIA 365GG (SILVomnia365)' },
        ]
    }
];

export const TIPO_TESSERAMENTO_OPTIONS = [
    { value: TipoTesseramento.AAG, label: 'Atleta Agonista' },
    { value: TipoTesseramento.APR, label: 'Atleta Praticante' },
    { value: TipoTesseramento.DIR, label: 'Dirigente' },
    { value: TipoTesseramento.TEC, label: 'Tecnico' },
    { value: TipoTesseramento.UDG, label: 'Ufficiale di Gara' },
    { value: TipoTesseramento.AFT, label: 'Altra figura tecnica' },
    { value: TipoTesseramento.AFO, label: 'Altra figura organizzativa/istituzionale' },
];

export const SESSO_OPTIONS = [
    { value: Sesso.M, label: 'Maschio' },
    { value: Sesso.F, label: 'Femmina' },
];

export const DISABILITA_OPTIONS = [
    { value: Disabilita.F, label: 'Fisica' },
    { value: Disabilita.SNV, label: 'Sensoriale non vedente' },
    { value: Disabilita.SNU, label: 'Sensoriale non udente' },
    { value: Disabilita.IR, label: 'Intellettiva/Relazionale' },
    { value: Disabilita.AD, label: 'Altra disabilità' },
];

export const PRIVACY_OPTIONS = [
    { field: 'marketingUsa', label: 'Letta l\'informativa che precede, dichiaro espressamente di acconsentire al trattamento dei miei dati personali per la finalità di invio comunicazioni Marketing per conto di U.s. Acli Nazionale*' },
    { field: 'marketingPartners', label: 'Letta l\'informativa che precede, dichiaro espressamente di acconsentire al trattamento dei miei dati personali per la finalità di invio comunicazioni Marketing per conto di partners legati a U.s. Acli Nazionale*' },
    { field: 'profilazioneUsa', label: 'Letta l\'informativa che precede, dichiaro espressamente di acconsentire al trattamento dei miei dati personali per la finalità legate alla profilazione per conto di U.s. Acli Nazionale*' },
    { field: 'profilazionePartners', label: 'Letta l\'informativa che precede, dichiaro espressamente di acconsentire al trattamento dei miei dati personali per la finalità legate alla profilazione per conto di partners di U.s. Acli Nazionale*' },
] as const;

export const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const DEFAULT_TESSERATO: Tesserato = {
    classeTesseramento: '',
    tipoTesseramento: [],
    dataInizio: getTodayDate(),
    dataFine: '',
    discipline: [],
    nazioneCittadinanza: 'ITALIA',
    codiceFiscale: '',
    cognome: '',
    nome: '',
    dataNascita: '',
    sesso: '',
    nazioneNascita: '',
    comuneNascita: '',
    indirizzoResidenza: '',
    capResidenza: '',
    comuneResidenza: '',
    marketingUsa: true,
    marketingPartners: true,
    profilazioneUsa: true,
    profilazionePartners: true,
    disabilita: [],
};