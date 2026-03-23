
// Basic validation for Italian Codice Fiscale (16 alphanumeric characters)
export const validateCodiceFiscale = (cf: string): boolean => {
    if (!cf) return true; // Allow empty
    const cfRegex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
    return cfRegex.test(cf);
};
