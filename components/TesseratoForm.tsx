import React, { useState, useMemo, useEffect } from 'react';
import { Tesserato, TesseratoField, Disabilita, TipoTesseramento, Sesso } from '../types';
import { Section } from './Section';
import { Input, Select, DateInput } from './Input';
import { RadioGroup } from './RadioGroup';
import { CheckboxGroup } from './CheckboxGroup';
import { MultiSelect } from './MultiSelect';
import { SearchableSelect } from './SearchableSelect';
import { 
    CLASSE_TESSERAMENTO_OPTIONS, 
    TIPO_TESSERAMENTO_OPTIONS, 
    SESSO_OPTIONS, 
    DISABILITA_OPTIONS,
    PRIVACY_OPTIONS
} from '../constants';
import { DISCIPLINES } from '../discipline';
import { validateCodiceFiscale } from '../utils/validation';
import { parseCodiceFiscale, generateCodiceFiscale } from '../utils/codiceFiscaleParser';
import { COMUNI_E_CAP, getCapForComune } from '../comuniECap';
import { normalizeCittadinanza } from '../utils/cittadinanzaUtils';
import { parseItalianDate } from '../utils/dateUtils';


interface TesseratoFormProps {
    tesserato: Tesserato;
    index: number;
    onUpdate: (index: number, field: TesseratoField, value: any) => void;
    onBulkUpdate: (index: number, updates: Partial<Tesserato>) => void;
    onRemove: (index: number) => void;
    total: number;
    isExpanded: boolean;
    onHeaderClick: () => void;
}

const ChevronIcon: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
    <svg
        className={`w-6 h-6 text-gray-500 transition-transform duration-300 transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);


export const TesseratoForm: React.FC<TesseratoFormProps> = ({ tesserato, index, onUpdate, onBulkUpdate, onRemove, total, isExpanded, onHeaderClick }) => {
    const [isParsingCf, setIsParsingCf] = useState(false);
    const [manualResidenza, setManualResidenza] = useState(false);
    const [manualClasseTesseramento, setManualClasseTesseramento] = useState(false);
    const [manualTipoTesseramento, setManualTipoTesseramento] = useState(false);


    const handleChange = (field: TesseratoField, value: any) => {
        onUpdate(index, field, value);
    };

    const handleMultiSelectChange = (field: 'tipoTesseramento' | 'disabilita', value: string) => {
        const currentValues = tesserato[field] as string[];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        handleChange(field, newValues);
    };

    const isCfValid = validateCodiceFiscale(tesserato.codiceFiscale);

    const handleCfBlur = async () => {
        if (!isCfValid || !tesserato.codiceFiscale) return;

        setIsParsingCf(true);
        try {
            const parsedData = await parseCodiceFiscale(tesserato.codiceFiscale);
            if (parsedData) {
                const updates: Partial<Tesserato> = {};
                if (parsedData.dataNascita && !tesserato.dataNascita) updates.dataNascita = parsedData.dataNascita;
                if (parsedData.sesso && !tesserato.sesso) updates.sesso = parsedData.sesso;
                // NON sovrascrivere o cancellare mai un comune di nascita già presente
                if (parsedData.comuneNascita && !tesserato.comuneNascita?.trim()) {
                    updates.comuneNascita = parsedData.comuneNascita.toUpperCase();
                }
                if (parsedData.nazioneNascita && (!tesserato.nazioneNascita || tesserato.nazioneNascita.toUpperCase() === 'ITALIA')) {
                    updates.nazioneNascita = parsedData.nazioneNascita.toUpperCase();
                }
                if (Object.keys(updates).length > 0) {
                    onBulkUpdate(index, updates);
                }
            }
        } catch (error) {
            console.error("Failed to parse Codice Fiscale", error);
        } finally {
            setIsParsingCf(false);
        }
    };

    // Advanced logic for Residenza fields validation and manual mode
    const comuneOptions = useMemo(() => 
        COMUNI_E_CAP.map(c => ({
            value: c.nome,
            label: `${c.nome} (${c.provincia})`
        })).sort((a, b) => a.label.localeCompare(b.label)),
        []
    );

    const isComuneValid = useMemo(() =>
        comuneOptions.some(c => c.value === tesserato.comuneResidenza),
        [comuneOptions, tesserato.comuneResidenza]
    );

    const capOptions = useMemo(() => {
        if (!tesserato.comuneResidenza) return [];
        const selectedComune = COMUNI_E_CAP.find(c => c.nome === tesserato.comuneResidenza);
        return selectedComune ? selectedComune.cap.map(cap => ({ value: cap, label: cap })) : [];
    }, [tesserato.comuneResidenza]);

    const isCapForComuneValid = useMemo(() => {
        if (!tesserato.capResidenza || !tesserato.comuneResidenza) return true; // Not an error if one is empty
        const selectedComune = COMUNI_E_CAP.find(c => c.nome === tesserato.comuneResidenza);
        return selectedComune ? selectedComune.cap.includes(tesserato.capResidenza) : false;
    }, [tesserato.comuneResidenza, tesserato.capResidenza]);

    useEffect(() => {
        // Automatically switch to manual mode if imported data is not valid
        if ((tesserato.comuneResidenza && !isComuneValid) || (tesserato.comuneResidenza && tesserato.capResidenza && isComuneValid && !isCapForComuneValid)) {
            setManualResidenza(true);
        }
    }, [tesserato.comuneResidenza, tesserato.capResidenza, isComuneValid, isCapForComuneValid]);

    // Assegna automaticamente il CAP se presente il comune di residenza ma manca il CAP
    useEffect(() => {
        if (tesserato.comuneResidenza && (!tesserato.capResidenza || !tesserato.capResidenza.trim())) {
            const autoCap = getCapForComune(tesserato.comuneResidenza);
            if (autoCap) {
                onBulkUpdate(index, { capResidenza: autoCap });
            }
        }
    }, [tesserato.comuneResidenza, tesserato.capResidenza, index, onBulkUpdate]);

    const handleManualResidenzaToggle = () => {
        const isTogglingToManual = !manualResidenza;
        setManualResidenza(isTogglingToManual);
        onBulkUpdate(index, {
            comuneResidenza: '',
            capResidenza: '',
        });
    };

    const handleComuneChange = (value: string) => {
        const autoCap = getCapForComune(value);
        onBulkUpdate(index, {
            comuneResidenza: value,
            capResidenza: autoCap || ''
        });
    };
    
    const dropdownComuneError = !tesserato.comuneResidenza ? 'Campo obbligatorio' : undefined;
    const dropdownCapError = !tesserato.capResidenza ? 'Campo obbligatorio' : undefined;

    const manualComuneError = !tesserato.comuneResidenza ? 'Campo obbligatorio' : (!isComuneValid ? 'Comune non in lista. Verificare.' : undefined);
    const manualCapError = !tesserato.capResidenza ? 'Campo obbligatorio' : (!isCapForComuneValid ? 'CAP non valido per il comune.' : undefined);

    // Automaticamente estrae i dati se il Codice Fiscale viene inserito/modificato ed è valido
    useEffect(() => {
        let isMounted = true;
        const autoParseCf = async () => {
            const cf = (tesserato.codiceFiscale || '').trim();
            if (cf && validateCodiceFiscale(cf)) {
                // Estraiamo i dati solo se i campi chiave sono effettivamente vuoti
                if (!tesserato.dataNascita || !tesserato.sesso || !tesserato.comuneNascita) {
                    try {
                        const parsedData = await parseCodiceFiscale(cf);
                        if (parsedData && isMounted) {
                            const updates: Partial<Tesserato> = {};
                            if (parsedData.dataNascita) {
                                if (!tesserato.dataNascita) {
                                    updates.dataNascita = parsedData.dataNascita;
                                } else {
                                    const cfParts = parsedData.dataNascita.split('-');
                                    const currParts = parseItalianDate(tesserato.dataNascita).split('-');
                                    if (cfParts.length === 3 && currParts.length === 3) {
                                        if (currParts[0] === cfParts[0] && (currParts[1] !== cfParts[1] || currParts[2] !== cfParts[2])) {
                                            updates.dataNascita = `${currParts[0]}-${cfParts[1]}-${cfParts[2]}`;
                                        }
                                    }
                                }
                            }
                            if (parsedData.sesso && !tesserato.sesso) updates.sesso = parsedData.sesso;
                            if (parsedData.comuneNascita && !tesserato.comuneNascita) updates.comuneNascita = parsedData.comuneNascita.toUpperCase();
                            if (parsedData.nazioneNascita && (!tesserato.nazioneNascita || tesserato.nazioneNascita.toUpperCase() === 'ITALIA')) {
                                updates.nazioneNascita = parsedData.nazioneNascita.toUpperCase();
                            }
                            
                            if (Object.keys(updates).length > 0) {
                                onBulkUpdate(index, updates);
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        };
        autoParseCf();
        return () => { isMounted = false; };
    }, [tesserato.codiceFiscale, tesserato.dataNascita, tesserato.sesso, tesserato.comuneNascita, tesserato.nazioneNascita, index, onBulkUpdate]);

    // Effetto separato per calcolare il CF quando i dati anagrafici cambiano
    useEffect(() => {
        // Calcola il CF solo se i campi minimi sono presenti e il CF attuale è vuoto o invalido
        const { nome, cognome, sesso, dataNascita, comuneNascita, nazioneNascita } = tesserato;
        const nazione = (nazioneNascita || 'ITALIA').trim().toUpperCase();
        const isForeign = nazione !== 'ITALIA';
        const hasBirthPlace = isForeign ? !!nazione : !!comuneNascita;

        if (nome && cognome && sesso && dataNascita && hasBirthPlace) {
            const trimmedCf = (tesserato.codiceFiscale || '').trim().toUpperCase();
            if (!trimmedCf || !validateCodiceFiscale(trimmedCf)) {
                const generated = generateCodiceFiscale({
                    ...tesserato,
                    nome: nome.trim().toUpperCase(),
                    cognome: cognome.trim().toUpperCase(),
                    sesso,
                    dataNascita,
                    comuneNascita: (comuneNascita || '').trim().toUpperCase(),
                    nazioneNascita: nazione
                });
                if (generated && generated !== trimmedCf) {
                    onBulkUpdate(index, { codiceFiscale: generated });
                }
            }
        }
    }, [tesserato.nome, tesserato.cognome, tesserato.sesso, tesserato.dataNascita, tesserato.comuneNascita, tesserato.nazioneNascita, index, onBulkUpdate]);
    const isClasseInList = useMemo(() => {
        return CLASSE_TESSERAMENTO_OPTIONS.some(group => {
            if ('options' in group) {
                return group.options.some(opt => opt.value === tesserato.classeTesseramento);
            }
            return (group as any).value === tesserato.classeTesseramento;
        });
    }, [tesserato.classeTesseramento]);

    useEffect(() => {
        if (tesserato.classeTesseramento && !isClasseInList) {
            setManualClasseTesseramento(true);
        }
    }, [tesserato.classeTesseramento, isClasseInList]);

    const handleManualClasseToggle = () => {
        const isTogglingToManual = !manualClasseTesseramento;
        setManualClasseTesseramento(isTogglingToManual);
        handleChange('classeTesseramento', '');
    };

    const isAnyTipoNotInList = useMemo(() => {
        if (!tesserato.tipoTesseramento || tesserato.tipoTesseramento.length === 0) {
            return false;
        }
        const validValues = new Set(TIPO_TESSERAMENTO_OPTIONS.map(o => o.value));
        return tesserato.tipoTesseramento.some(v => !validValues.has(v));
    }, [tesserato.tipoTesseramento]);

    useEffect(() => {
        if (isAnyTipoNotInList) {
            setManualTipoTesseramento(true);
        }
    }, [isAnyTipoNotInList]);

    const handleManualTipoToggle = () => {
        const isTogglingToManual = !manualTipoTesseramento;
        setManualTipoTesseramento(isTogglingToManual);
        handleChange('tipoTesseramento', []);
    };


    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200" onClick={onHeaderClick}>
                <div>
                    <h2 className="text-xl font-bold text-blue-800">Tesserato {index + 1}</h2>
                     {!isExpanded && (
                        <p className="text-sm text-gray-600 mt-1 truncate max-w-xs sm:max-w-md">
                           {tesserato.nome || tesserato.cognome ? `${tesserato.nome} ${tesserato.cognome}` : 'Nuovo Tesserato'}
                           {tesserato.codiceFiscale && ` - ${tesserato.codiceFiscale}`}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-4">
                     {total > 1 && (
                         <button
                            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                            className="text-red-500 hover:text-red-700 font-semibold transition-colors text-sm"
                         >
                            Rimuovi
                        </button>
                     )}
                     <ChevronIcon isExpanded={isExpanded} />
                </div>
            </div>
            
            <div className={`transition-[max-height] duration-700 ease-in-out ${isExpanded ? 'max-h-[3500px]' : 'max-h-0'}`}>
                <div className="p-6 space-y-2">
                    <Section title="Dati Tesseramento">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="mb-2">
                                     <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id={`manual-classe-${index}`}
                                            checked={manualClasseTesseramento}
                                            onChange={handleManualClasseToggle}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                           Codice non in lista
                                        </span>
                                    </label>
                                </div>
                                {manualClasseTesseramento ? (
                                    <Input 
                                        label="Classe Tesseramento" 
                                        value={tesserato.classeTesseramento} 
                                        onChange={e => handleChange('classeTesseramento', e.target.value.toUpperCase())}
                                        placeholder="Inserisci codice classe"
                                        required 
                                    />
                                ) : (
                                    <Select 
                                        label="Classe Tesseramento" 
                                        value={tesserato.classeTesseramento} 
                                        onChange={e => handleChange('classeTesseramento', e.target.value)} 
                                        options={CLASSE_TESSERAMENTO_OPTIONS} 
                                        required 
                                    />
                                )}
                            </div>
                             <div>
                                <div className="mb-2">
                                     <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id={`manual-tipo-${index}`}
                                            checked={manualTipoTesseramento}
                                            onChange={handleManualTipoToggle}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Codice non in lista
                                        </span>
                                    </label>
                                </div>
                                {manualTipoTesseramento ? (
                                    <Input
                                        label="Tipo Tesseramento"
                                        value={tesserato.tipoTesseramento.join('|')}
                                        onChange={e => handleChange('tipoTesseramento', e.target.value.toUpperCase().split('|').map(s => s.trim()).filter(Boolean))}
                                        placeholder="Es. AAG|DIR"
                                        required
                                        info="Usa '|' per separare più codici."
                                    />
                                ) : (
                                    <CheckboxGroup
                                        label="Tipo Tesseramento"
                                        options={TIPO_TESSERAMENTO_OPTIONS}
                                        selectedValues={tesserato.tipoTesseramento as TipoTesseramento[]}
                                        onChange={(value) => handleMultiSelectChange('tipoTesseramento', value)}
                                    />
                                )}
                            </div>
                             <DateInput 
                                label="Data Inizio" 
                                value={tesserato.dataInizio} 
                                onChange={e => handleChange('dataInizio', e.target.value)} 
                                required 
                                error={!tesserato.dataInizio ? 'Campo obbligatorio' : undefined}
                             />
                            <DateInput 
                                label="Data Fine" 
                                value={tesserato.dataFine} 
                                onChange={e => handleChange('dataFine', e.target.value)} 
                                required 
                                error={!tesserato.dataFine ? 'Campo obbligatorio' : undefined}
                            />
                            <div className="md:col-span-2">
                                 <MultiSelect
                                    label="Discipline"
                                    options={DISCIPLINES}
                                    selectedValues={tesserato.discipline}
                                    onChange={values => handleChange('discipline', values)}
                                    placeholder="Cerca e seleziona discipline..."
                                    required
                                    error={tesserato.discipline.length === 0 ? 'Campo obbligatorio' : undefined}
                                />
                            </div>
                        </div>
                    </Section>

                    <Section title="Dati Anagrafici">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Nome" 
                                value={tesserato.nome} 
                                onChange={e => handleChange('nome', e.target.value)} 
                                required 
                                error={!tesserato.nome.trim() ? 'Campo obbligatorio' : undefined}
                            />
                            <Input 
                                label="Cognome" 
                                value={tesserato.cognome} 
                                onChange={e => handleChange('cognome', e.target.value)} 
                                required 
                                error={!tesserato.cognome.trim() ? 'Campo obbligatorio' : undefined}
                            />
                            <Input 
                                label="Codice Fiscale" 
                                value={tesserato.codiceFiscale} 
                                onChange={e => handleChange('codiceFiscale', e.target.value.toUpperCase())} 
                                onBlur={handleCfBlur}
                                required 
                                error={!tesserato.codiceFiscale.trim() ? 'Campo obbligatorio' : !isCfValid ? "Formato non valido" : undefined}
                                info={isParsingCf ? "Analisi del codice fiscale..." : undefined}
                                actionButton={
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                // Previene la perdita di focus dall'input prima del calcolo
                                                e.preventDefault();
                                            }}
                                            onClick={() => {
                                                const generatedCf = generateCodiceFiscale(tesserato);
                                                if (generatedCf) {
                                                    handleChange('codiceFiscale', generatedCf);
                                                } else {
                                                    alert("Impossibile calcolare il Codice Fiscale. Assicurati di aver inserito Nome, Cognome, Sesso, Data e Comune di Nascita.");
                                                }
                                            }}
                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium whitespace-nowrap"
                                            title="Calcola Codice Fiscale dai dati anagrafici"
                                        >
                                            Calcola
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!isCfValid || !tesserato.codiceFiscale) {
                                                    alert("Inserisci un Codice Fiscale valido per estrarre i dati.");
                                                    return;
                                                }
                                                setIsParsingCf(true);
                                                try {
                                                    const parsedData = await parseCodiceFiscale(tesserato.codiceFiscale);
                                                    if (parsedData) {
                                                        const updates: Partial<Tesserato> = {};
                                                        if (parsedData.dataNascita) updates.dataNascita = parsedData.dataNascita;
                                                        if (parsedData.sesso) updates.sesso = parsedData.sesso;
                                                        if (parsedData.comuneNascita) updates.comuneNascita = parsedData.comuneNascita.toUpperCase();
                                                        if (parsedData.nazioneNascita) updates.nazioneNascita = parsedData.nazioneNascita.toUpperCase();
                                                        if (Object.keys(updates).length > 0) {
                                                            onBulkUpdate(index, updates);
                                                        }
                                                    } else {
                                                        alert("Impossibile estrarre i dati dal Codice Fiscale fornito.");
                                                    }
                                                } catch (error) {
                                                    console.error("Failed to parse Codice Fiscale", error);
                                                } finally {
                                                    setIsParsingCf(false);
                                                }
                                            }}
                                            className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm font-medium whitespace-nowrap"
                                            title="Estrai Sesso, Data e Comune di Nascita dal Codice Fiscale"
                                        >
                                            Estrai Dati
                                        </button>
                                    </div>
                                }
                            />
                            <Select 
                                label="Sesso" 
                                value={tesserato.sesso} 
                                onChange={e => handleChange('sesso', e.target.value)} 
                                options={SESSO_OPTIONS} 
                                required 
                            />
                            <DateInput 
                                label="Data di Nascita" 
                                value={tesserato.dataNascita} 
                                onChange={e => handleChange('dataNascita', e.target.value)} 
                                required 
                            />
                            <Input 
                                label="Comune di Nascita" 
                                value={tesserato.comuneNascita} 
                                onChange={e => handleChange('comuneNascita', e.target.value)} 
                                required 
                            />
                            <Input 
                                label="Nazione di Nascita" 
                                value={tesserato.nazioneNascita} 
                                onChange={e => handleChange('nazioneNascita', e.target.value)} 
                            />
                            <Input 
                                label="Nazione Cittadinanza" 
                                value={tesserato.nazioneCittadinanza} 
                                placeholder="Es. ITALIA, ROMANIA, MAROCCO"
                                onChange={e => handleChange('nazioneCittadinanza', e.target.value)} 
                                onBlur={() => {
                                    if (tesserato.nazioneCittadinanza) {
                                        handleChange('nazioneCittadinanza', normalizeCittadinanza(tesserato.nazioneCittadinanza));
                                    }
                                }}
                                info="Indicare sempre lo Stato sovrano (es. ITALIA, MAROCCO), non la derivazione o aggettivo"
                            />
                        </div>
                    </Section>
                     <Section title="Disabilità">
                        <CheckboxGroup
                            label=""
                            options={DISABILITA_OPTIONS}
                            selectedValues={tesserato.disabilita as Disabilita[]}
                            onChange={(value) => handleMultiSelectChange('disabilita', value)}
                            inline
                        />
                    </Section>

                    <Section title="Residenza">
                         <div className="mb-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id={`manual-residenza-${index}`}
                                    checked={manualResidenza}
                                    onChange={handleManualResidenzaToggle}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Comune o CAP non presente in lista (inserimento manuale)
                                </span>
                            </label>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {manualResidenza ? (
                                <>
                                    <Input
                                        label="Comune di Residenza"
                                        value={tesserato.comuneResidenza}
                                        onChange={e => {
                                            const newComune = e.target.value;
                                            const autoCap = (!tesserato.capResidenza || !tesserato.capResidenza.trim()) ? getCapForComune(newComune) : '';
                                            if (autoCap) {
                                                onBulkUpdate(index, {
                                                    comuneResidenza: newComune,
                                                    capResidenza: autoCap
                                                });
                                            } else {
                                                handleChange('comuneResidenza', newComune);
                                            }
                                        }}
                                        placeholder="Es. Roma"
                                        required
                                        error={manualComuneError}
                                    />
                                    <Input
                                        label="CAP di Residenza"
                                        value={tesserato.capResidenza}
                                        onChange={e => handleChange('capResidenza', e.target.value)}
                                        placeholder="Es. 00100"
                                        required
                                        error={manualCapError}
                                    />
                                </>
                            ) : (
                                <>
                                    <SearchableSelect
                                        label="Comune di Residenza"
                                        options={comuneOptions}
                                        selectedValue={tesserato.comuneResidenza}
                                        onChange={handleComuneChange}
                                        placeholder="Cerca e seleziona un comune..."
                                        required
                                        error={dropdownComuneError}
                                    />
                                    <Select 
                                        label="CAP di Residenza"
                                        value={tesserato.capResidenza}
                                        onChange={e => handleChange('capResidenza', e.target.value)}
                                        options={capOptions}
                                        required
                                        disabled={!tesserato.comuneResidenza || capOptions.length === 0}
                                        error={dropdownCapError}
                                    />
                                </>
                            )}
                            <Input 
                                label="Indirizzo di Residenza" 
                                value={tesserato.indirizzoResidenza} 
                                onChange={e => handleChange('indirizzoResidenza', e.target.value)} 
                                className="md:col-span-2" 
                                required 
                            />
                        </div>
                    </Section>

                    <Section title="Privacy">
                        <div className="space-y-4">
                            {PRIVACY_OPTIONS.map(opt => (
                                <RadioGroup
                                    key={opt.field}
                                    label={opt.label}
                                    name={`${opt.field}-${index}`}
                                    selectedValue={tesserato[opt.field]}
                                    onChange={(value) => handleChange(opt.field as TesseratoField, value)}
                                    error={tesserato[opt.field] === null ? 'Campo obbligatorio' : undefined}
                                />
                            ))}
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
};