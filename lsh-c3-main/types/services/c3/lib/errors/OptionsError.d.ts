declare class OptionsError extends Error {
    options: string[];
    constructor(message: string, options: string[]);
}
export default OptionsError;
