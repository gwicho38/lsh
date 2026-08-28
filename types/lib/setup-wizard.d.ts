/**
 * LSH Init Command
 * Interactive setup wizard for first-time configuration
 */
/**
 * Run the interactive setup wizard.
 * `force` has no effect: the wizard already asks to overwrite an existing
 * configuration interactively. It is accepted for parity with `sync --force`.
 */
export declare function runSetupWizard(options: {
    global?: boolean;
    force?: boolean;
}): Promise<void>;
export default runSetupWizard;
