/**
 * Sub processes that can be executed by the state machine.
 *
 * These match the names of the main script file for each sub process in
 *    source/subProcesses/*
 */
declare enum SUBPROCESS {
    SETUP = "setupWorkingDir",
    WATCHER = "repoWatcher",
    WEBPACK = "webpackDevServer",
    TEST = "test"
}
export default SUBPROCESS;
