// Generated from typescript/assets/js/contact-validation.ts; edit the TypeScript source.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports)
        module.exports = api;
    else
        root.EllisContactValidation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function clean(value) {
        return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
    }
    function validateContact(values) {
        values = values || {};
        const errors = {};
        const rules = [
            ['name', 2, 100, 'Enter your name.', 'Enter a name between 2 and 100 characters.'],
            ['phone', 6, 40, 'Enter a phone number.', 'Enter a phone number between 6 and 40 characters.'],
            ['service', 2, 160, 'Choose a type of work.', 'Choose a type of work between 2 and 160 characters.'],
            ['message', 10, 3000, 'Tell us what you need help with.', 'Enter job details between 10 and 3000 characters.'],
        ];
        rules.forEach(([name, min, max, empty, length]) => {
            const value = clean(values[name]);
            if (!value)
                errors[name] = empty;
            else if (value.length < min || value.length > max)
                errors[name] = length;
        });
        const email = clean(values.email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
            errors.email = 'Enter a valid email address of at most 254 characters.';
        if (values.postcode !== undefined && (typeof values.postcode !== 'string' || clean(values.postcode).length > 100))
            errors.postcode = 'Enter a suburb or postcode of at most 100 characters.';
        return { valid: Object.keys(errors).length === 0, errors };
    }
    return { validateContact };
});
