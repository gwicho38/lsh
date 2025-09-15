/**
 * Built-in commands for comprehensive job management
 */
import JobManager from './job-manager.js';
export declare class JobBuiltins {
    private jobManager;
    constructor(jobManager: JobManager);
    /**
     * job-create - Create a new job
     * Usage: job-create [OPTIONS] COMMAND
     */
    jobCreate(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-list - List jobs with filtering
     * Usage: job-list [OPTIONS]
     */
    jobList(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-show - Show detailed information about a job
     * Usage: job-show JOB_ID
     */
    jobShow(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-start - Start a created job
     * Usage: job-start JOB_ID
     */
    jobStart(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-stop - Stop/kill a running job
     * Usage: job-stop [OPTIONS] JOB_ID
     */
    jobStop(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-pause - Pause a running job
     * Usage: job-pause JOB_ID
     */
    jobPause(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-resume - Resume a paused job
     * Usage: job-resume JOB_ID
     */
    jobResume(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-remove - Remove a job
     * Usage: job-remove [OPTIONS] JOB_ID
     */
    jobRemove(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-update - Update job properties
     * Usage: job-update [OPTIONS] JOB_ID
     */
    jobUpdate(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-run - Create and immediately start a job
     * Usage: job-run [OPTIONS] COMMAND
     */
    jobRun(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-monitor - Monitor job resource usage
     * Usage: job-monitor JOB_ID
     */
    jobMonitor(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-stats - Show job statistics
     * Usage: job-stats
     */
    jobStats(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * job-cleanup - Clean up old completed jobs
     * Usage: job-cleanup [HOURS]
     */
    jobCleanup(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * ps-list - List system processes
     * Usage: ps-list [OPTIONS]
     */
    psList(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * ps-kill - Kill a system process
     * Usage: ps-kill [OPTIONS] PID
     */
    psKill(args: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    private parseCreateOptions;
    private parseListOptions;
    private parseUpdateOptions;
    private formatJobSummary;
    private formatJobDetailed;
}
export default JobBuiltins;
