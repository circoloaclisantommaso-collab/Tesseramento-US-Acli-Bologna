
export enum ClasseTesseramento {
    ESTbas = 'ESTbas',
    ESTcal = 'ESTcal',
    ESTcil = 'ESTcil',
    ESTomnia = 'ESTomnia',
    Frie = 'Frie',
    GIOVbas = 'GIOVbas',
    GIOVca = 'GIOVca',
    GIOVci = 'GIOVci',
    GIOVomnia = 'GIOVomnia',
    GOLDbas = 'GOLDbas',
    GOLDbr = 'GOLDbr',
    GOLCA = 'GOLCA',
    gocic = 'gocic',
    golss = 'golss',
    GOLDomnia = 'GOLDomnia',
    PLAbas = 'PLAbas',
    plabs = 'plabs',
    PLATca = 'PLATca',
    PLAcc = 'PLAcc',
    PLATci = 'PLATci',
    PLATss = 'PLATss',
    PLATomnia = 'PLATomnia',
    SILVbase = 'SILVbase',
    SILVbr = 'SILVbr',
    SILVca = 'SILVca',
    SILVci = 'SILVci',
    SILVbrp = 'SILVbrp',
    SILVomnia = 'SILVomnia',
    TESvolo = 'TESvolo',
    PROBA = 'PROBA',
    PRObasRi = 'PRObasRi',
    GIORNca = 'GIORNca',
    GIORNci = 'GIORNci',
    GIORNss = 'GIORNss',
    GIORNomnia = 'GIORNomnia',
    GIOVbas365 = 'GIOVbas365',
    GIOVca365 = 'GIOVca365',
    GIOVci365 = 'GIOVci365',
    GIOVOmnia365 = 'GIOVOmnia365',
    GOLDbas365 = 'GOLDbas365',
    GOLDbr365 = 'GOLDbr365',
    GOLDca365 = 'GOLDca365',
    GOLDomnia365 = 'GOLDomnia365',
    PLATbas365 = 'PLATbas365',
    PLATbr365 = 'PLATbr365',
    PLATca365 = 'PLATca365',
    PLAcc365 = 'PLAcc365',
    PLATomnia365 = 'PLATomnia365',
    SILVbas365 = 'SILVbas365',
    SILVbr365 = 'SILVbr365',
    SILVca365 = 'SILVca365',
    SILVci365 = 'SILVci365',
    SILVbrp365 = 'SILVbrp365',
    SILVomnia365 = 'SILVomnia365',
    GOLD_A = 'GOLD-A',
    PLA_A = 'PLA-A',
    SIL_A = 'SIL-A',
}

export enum TipoTesseramento {
    AAG = 'AAG', // Atleta Agonista
    APR = 'APR', // Atleta Praticante
    DIR = 'DIR', // Dirigente
    TEC = 'TEC', // Tecnico
    UDG = 'UDG', // Ufficiale di Gara
    AFT = 'AFT', // Altra figura tecnica
    AFO = 'AFO', // Altra figura organizzativa/istituzionale
}

export enum Sesso {
    M = 'M',
    F = 'F',
}

export enum Disabilita {
    F = 'F',     // FISICI
    SNV = 'SNV', // SENSORIALI NON VEDENTI
    SNU = 'SNU', // SENSORIALI NON UDENTI
    IR = 'IR',   // INTELLETTIVI/RELAZIONALI
    AD = 'AD',   // ALTRA DISABILITÀ
}

export interface Tesserato {
    id?: string | number;
    classeTesseramento: ClasseTesseramento | '';
    tipoTesseramento: TipoTesseramento[];
    dataInizio: string;
    dataFine: string;
    discipline: string[];
    nazioneCittadinanza: string;
    codiceFiscale: string;
    cognome: string;
    nome: string;
    dataNascita: string;
    sesso: Sesso | '';
    nazioneNascita: string;
    comuneNascita: string;
    indirizzoResidenza: string;
    capResidenza: string;
    comuneResidenza: string;
    marketingUsa: boolean | null;
    marketingPartners: boolean | null;
    profilazioneUsa: boolean | null;
    profilazionePartners: boolean | null;
    disabilita: Disabilita[];
}

export type TesseratoField = keyof Tesserato;