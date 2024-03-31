declare class SubProcessError extends Error {
    constructor(message: string, stack: string[]);
}
export default SubProcessError;
