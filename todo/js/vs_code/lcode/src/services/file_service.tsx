/*
 * Copyright 2009-2023 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// import { C3BASE_WORKSPACE, FileAction, SAMPLE_WORKSPACE, commandStrings } from '@src/test/shared/constants';
// import { VSBrowser } from 'vscode-extension-tester';
// import { deleteFileFs, replaceFileContent, writeFileFs } from './fileUtils';
// import {
//   assertAppSwitched,
//   assertCellOutput,
//   assertNotebookOpen,
//   assertTypeExists,
//   executeCell,
//   openNotebook,
//   setCellText,
//   switchAppTo,
//   waitForCellCompletion,
// } from './notebookUtils';
// import { PackageExplorerIframe } from './page-objects/packageExplorerIframe';
// import { verifyC3OutputChannelContent } from './outputTabUtils';
// import { UiSyncStatus } from './uiTestConstants';
// import { IssueFile } from '../resources/pkgIssues';
// import { basename } from 'path';
// import { ProblemsPanelIframe } from './page-objects/problemsPanelIframe';
// import { allWorkspacePackages, executeWorkbenchCommand, switchGitBranch } from './workspaceUtils';
// import simpleGit from 'simple-git';
// import { expect } from 'chai';
// import { DSWorkflowResults, DSWorkflowSteps, dsWorkflowData } from '@src/test/psr/resources/dsWorkflowData';

/**
 * This util should be called whenever we do a full sync of a package, which can happen in these scenarios
 * 1. New package (dictated by the creation of a valid package.json)
 * 2. Moving a valid package into your workspace
 * 3. Updating the dependencies of an existing package.json
 *
 * @param browser VSBrowser instance
 * @param pkgName name of syncing package
 */
export async function assertFullPkgSync(browser: VSBrowser, pkgName: string) {
  const pkgJsonPath = `${pkgName}/${pkgName}.c3pkg.json`;
  await packageExplorer.assertPathSyncStatus(browser, pkgJsonPath, UiSyncStatus.validated, 600);
}

/**
 * Uses fs to replace the dependencies of a package.json
 * @param pkgName package to be updated
 * @param newDependencies string representation of the dependencies value in package.json e.g. '["packageA", "packageB"]'
 */
export function updatePackageDependencies(pkgName: string, newDependencies: string) {
  replaceFileContent(`${pkgName}/${pkgName}.c3pkg.json`, newDependencies, SAMPLE_WORKSPACE, /\[.*?\]/g);
}

/**
 * pkgName: The package name
 * appName: Name of the app for our package (for notebook)
 * typeName: A type name
 * exist: true if `pkgName` or its dependency package has `typeName`
 * textToAutocomplete: the input text to be checked with autocompletion
 */
export interface PkgUpdateSpec {
  pkgName: string;
  appName: string;
  typeName: string;
  exist: boolean;
  textToAutocomplete: string;
}

/**
 * Checks that the expected type exists in the given package
 * 1. Notebook (type existence)
 * 2. JS language server (type autocomplete)
 * 3. C3 language server (type autocomplete)
 */
export async function assertPkgUpdate(browser: VSBrowser, pkgUpdateSpec: PkgUpdateSpec) {
  const pkgName = pkgUpdateSpec.pkgName;
  const appName = pkgUpdateSpec.appName;
  await PackageExplorerIframe.inst().startApp(browser, pkgName, appName);
  await PackageExplorerIframe.inst().assertAppStarted(browser, pkgName, appName);

  // 1. Check notebook
  await openNotebook(browser, true);
  await assertNotebookOpen(browser.driver, 60);
  await switchAppTo(browser.driver, appName);
  await assertAppSwitched(browser, appName, 60);
  await assertTypeExists(browser.driver, 0, pkgUpdateSpec.typeName, pkgUpdateSpec.exist);

  // TODO: Enable after PLAT-64692: Autocompletion does not work properly for newly added dependency pkg
  // 2. JS language server
  // const jsAutoCompleteFile = `${pkgName}/src/autoComplete.js`;
  // await validateAutocomplete(
  //   browser,
  //   pkgUpdateSpec.textToAutocomplete,
  //   [`${pkgUpdateSpec.typeName}`],
  //   jsAutoCompleteFile,
  //   pkgUpdateSpec.exist,
  // );

  // TODO: Enable after PLAT-64692: Autocompletion does not work properly for newly added dependency pkg
  // 3. C3 language server
  // const c3AutoCompleteFile = `${pkgName}/src/autoComplete.c3typ`;
  // await validateAutocomplete(
  //   browser,
  //   pkgUpdateSpec.textToAutocomplete,
  //   [`${pkgUpdateSpec.typeName}`],
  //   c3AutoCompleteFile,
  //   pkgUpdateSpec.exist,
  // );
}

export async function verifyDeletion(browser: VSBrowser, path: string) {
  await verifyC3OutputChannelContent(browser.driver, `deleting file from server: ${path}`, true);
}

/**
 * Tests making repeated changes to multiple files and validating the correct Pkg Issues are created
 * @param browser VSBrowser instance
 * @param iterations number of times to update the set of files
 * @param issueFiles a list of issueFiles to update on each iteration
 * @param workspace Full path to the workspace root
 */
export async function stressPkgStoreTest(
  // browser: VSBrowser,
  iterations: number,
  // issueFiles: IssueFile[],
  // workspace: string = SAMPLE_WORKSPACE,
) {
  const errorMap = new Map<string, string[]>();
  for (let i = 0; i < iterations; i++) {
    console.log(`StressPkgStoreTest - iteration ${i}`);
    // On odd iterations, we write correct contents to remove the pkg issues.
    // On even iterations, we write error contents to create pkg issues.

    // 1. Write contents to all files
    const fixIter = i % 2 == 1;
    // // for (const issueFile of issueFiles) {
    //   const fileName = basename(issueFile.path);
    //   // Write file content
    //   await writeFileFs(issueFile.path, fixIter ? issueFile.fixedContent : issueFile.errorContent, workspace);
    //
    //   if (fixIter) {
    //     errorMap.delete(fileName);
    //   } else {
    //     errorMap.set(fileName, issueFile.errorMsgs);
    //   }
    // }

    // 2. Verify UI updates to match file content changes
    // for (const issueFile of issueFiles) {
    //   try {
    //     await PackageExplorerIframe.inst().assertPathSyncStatus(browser, issueFile.path, UiSyncStatus.unsynced, 5);
    //   } catch (e) {
    //     console.log(`${issueFile.path} did not transition to unsynced.`);
    //   }
    //
    //   await PackageExplorerIframe.inst().assertPathSyncStatus(browser, issueFile.path, UiSyncStatus.validated, 60);
    //
    //   // TODO : PLAT-70639 uncomment color assertions
    //   // await packageExplorer.assertPathColor(
    //   //   browser,
    //   //   pkgIssueFile.path,
    //   //   fixIter ? UiPathColor.fixed : UiPathColor.error,
    //   // );
    // }
    // // After writing all files, check problems panel
    // // TODO: PLAT-70622 use assertPackageErrors once it is more performant.
    // // await problemsPanel.assertPackageErrors(browser, PkgName.uiTestPkg, errorMap);
    // await ProblemsPanelIframe.inst().assertPackageErrorsSlim(browser, errorMap);
  }
}

/**
 * Tests switching branches of an already connected workspace and asserting all paths become validated.
 * @param browser VSBrowser instance
 * @param workspace the full path of the connected workspace (i.e Users/<user>/c3vsce/c3base/base)
 * @param checkoutPath param to pass into "git checkout". Works with tags, branches, and commits
 * @param unsyncedPath A path in the workspace, used to verify that files were upserted and changed to unsynced.
 * @param timeout time in seconds for the worksapce to finish validation
 */
export async function switchBranchAndValidate(
  // browser: VSBrowser,
  workspace: string,
  checkoutPath: string,
  unsyncedPath: string,
  timeout: number,
) {
  // const git = simpleGit({ baseDir: workspace });
  // const originalCommit = await git.revparse('HEAD');

  // await switchGitBranch(C3BASE_WORKSPACE, checkoutPath);
  //
  // const newCommit = await git.revparse('HEAD');
  // expect(newCommit).to.not.eq(originalCommit, 'Branch was not checked out correctly.');
  //
  // // Get updated list of workspace pkgs
  // const pkgList = await allWorkspacePackages(C3BASE_WORKSPACE);
  //
  // await PackageExplorerIframe.inst().assertPathSyncStatus(browser, unsyncedPath, UiSyncStatus.unsynced, 240);
  // await PackageExplorerIframe.inst().assertWorkspaceValidationComplete(browser, pkgList, timeout);
}

// /**
//  * Makes consistent type updates to the same c3base file. Updates stored calc fields and creates new js and py functions.
//  * @param browser VSBrowser instance
//  * @param iterations number of times to repeat the changes.
//  * @param validationStatusTimeout timeout for a file to be validated
//  */
// export async function repeatTypeUpdates(
//   browser: VSBrowser,
//   iterations: number,
//   validationStatusTimeout: number,
// ): Promise<DSWorkflowResults> {
//   const {
//     workspace,
//     pkgName,
//     c3typFile,
//     jsFile,
//     pyFile,
//     c3typOriginalContent,
//     newStoredCalcContent,
//     updatedStoredCalcContent,
//     brokenStoredCalcContent,
//     newJsAndPyFuncsContent,
//     pyOriginalContent,
//     pyBrokenContent,
//     jsOriginalContent,
//     jsBrokenContent,
//   } = dsWorkflowData;
//   const packageExplorer = PackageExplorerIframe.inst();
//   const updateTimes: DSWorkflowResults = {
//     [DSWorkflowSteps.newCalc]: [],
//     [DSWorkflowSteps.updateCalc]: [],
//     [DSWorkflowSteps.makeIssue]: [],
//     [DSWorkflowSteps.addImpl]: [],
//     [DSWorkflowSteps.updateImpl]: [],
//     [DSWorkflowSteps.removeImpl]: [],
//   };

// await packageExplorer.openContextMenuAndClick(browser, pkgName, FileAction.CreateNotebook);
//
// To test in notebook
// const assertValidatedContentInNotebook = async (notebookInput, notebookOutput) => {
//   await setCellText(browser.driver, 0, notebookInput);
//   await executeCell(browser.driver, 0);
//   await waitForCellCompletion(browser.driver, 0);
//   await assertCellOutput(browser.driver, 0, notebookOutput);
// };

// Sometimes test util doesn't catch unsynced state if it switches to synced/validated too quickly
// const checkPathUnsynced = async (path) => {
//   try {
//     await packageExplorer.assertPathSyncStatus(browser, path, UiSyncStatus.unsynced, 15);
//   } catch { }
// };

// To track time taken for a set of steps, and writes to the updateTimes array
const recordTimeForUpdate = async (
  stepName: string,
  numUpdates: number,
  func: (...theArgs: any[]) => Promise<any>,
) => {
  const startTime = process.hrtime();
  await func();
  const totalTime = process.hrtime(startTime)[0];
  // updateTimes[stepName].push(totalTime / numUpdates);
};

// await executeWorkbenchCommand(browser.driver, commandStrings.showC3OutputChannel);
for (let i = 0; i < 1; i++) {
  console.log(`repeatTypeUpdates - iteration ${i}`);
  // 1. Add a new stored calc field to FailureRecommendationRelation.c3typ
  console.log('Add a new stored calc field to FailureRecommendationRelation.c3typ');
  // await recordTimeForUpdate(DSWorkflowSteps.newCalc, 1, async () => {
  // await writeFileFs(c3typFile, newStoredCalcContent, workspace);

  // await checkPathUnsynced(c3typFile);
  // await packageExplorer.assertPathSyncStatus(browser, c3typFile, UiSyncStatus.validated, validationStatusTimeout);
  // });

  // 2. Change the definition of a stored calc field
  console.log('Change the definition of a stored calc field on FailureRecommendationRelation.c3typ');
  // await recordTimeForUpdate(DSWorkflowSteps.updateCalc, 1, async () => {
  //   await writeFileFs(c3typFile, updatedStoredCalcContent, workspace);
  //   await checkPathUnsynced(c3typFile);
  //   await packageExplorer.assertPathSyncStatus(browser, c3typFile, UiSyncStatus.validated, validationStatusTimeout);
  // });
  //
  // 3. Break a stored calc field
  console.log(
    'Change the definition of a stored calc field on FailureRecommendationRelation.c3typ to an invalid one',
  );
  // await recordTimeForUpdate(DSWorkflowSteps.makeIssue, 1, async () => {
  //   await writeFileFs(c3typFile, brokenStoredCalcContent, workspace);
  //   await checkPathUnsynced(c3typFile);
  //   await packageExplorer.assertPathSyncStatus(browser, c3typFile, UiSyncStatus.validated, validationStatusTimeout);
  // });

  // 4. Add python and js method and corresponding impl files
  console.log('Add a py and js method. Create implementation files.');
  // await recordTimeForUpdate(DSWorkflowSteps.addImpl, 3, async () => {
  //   await writeFileFs(c3typFile, newJsAndPyFuncsContent, workspace);
  //   await writeFileFs(jsFile, jsOriginalContent, workspace);
  //   await writeFileFs(pyFile, pyOriginalContent, workspace);
  //   await checkPathUnsynced(c3typFile);
  //   await checkPathUnsynced(jsFile);
  //   await checkPathUnsynced(pyFile);
  //   await packageExplorer.assertPathSyncStatus(browser, jsFile, UiSyncStatus.validated, validationStatusTimeout);
  //   await packageExplorer.assertPathSyncStatus(browser, pyFile, UiSyncStatus.validated, validationStatusTimeout);
  //   await packageExplorer.assertPathSyncStatus(browser, c3typFile, UiSyncStatus.validated, validationStatusTimeout);
  // });

  // 5. Update js and py file contents
  console.log('Update js and py file contents with invalid function definitions');
  // await recordTimeForUpdate(DSWorkflowSteps.updateImpl, 2, async () => {
  //   await writeFileFs(jsFile, jsBrokenContent, workspace);
  //   await writeFileFs(pyFile, pyBrokenContent, workspace);
  //   await checkPathUnsynced(jsFile);
  //   await checkPathUnsynced(pyFile);
  //   await packageExplorer.assertPathSyncStatus(browser, jsFile, UiSyncStatus.validated, validationStatusTimeout);
  //   await packageExplorer.assertPathSyncStatus(browser, pyFile, UiSyncStatus.validated, validationStatusTimeout);
  // });

  // 6. Revert c3typ file contents and delete impl files
  console.log('Revert c3typ file contents and delete impl files');
  // await recordTimeForUpdate(DSWorkflowSteps.removeImpl, 3, async () => {
  //   await writeFileFs(c3typFile, c3typOriginalContent, workspace);
  //   await deleteFileFs(jsFile, workspace);
  //   await deleteFileFs(pyFile, workspace);
  //   await packageExplorer.assertPathDoesNotExist(browser, jsFile);
  //   await packageExplorer.assertPathDoesNotExist(browser, pyFile);
  //   await checkPathUnsynced(c3typFile);
  //   await packageExplorer.assertPathSyncStatus(browser, c3typFile, UiSyncStatus.validated, validationStatusTimeout);
  // });
}
// return updateTimes;
// }
