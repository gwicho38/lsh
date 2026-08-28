/**
 * LSH Doctor Command
 * Health check and troubleshooting utility
 */
/**
 * Run the LSH health check
 */
export declare function runDoctor(options: {
    global?: boolean;
    verbose?: boolean;
    json?: boolean;
}): Promise<void>;
export default runDoctor;
