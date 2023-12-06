/*
 * Copyright 2009-2023 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// import { NON_WORKSPACE_PATH, DISCONNECTED_STATUS, ACTIVATION_MSG } from '@src/test/shared/constants';
// import { BottomBarPanel, VSBrowser, WebDriver, InputBox, Workbench, NotificationType } from 'vscode-extension-tester';
// import { retry } from './actionUtils';
// import { clearModal, selectModalButton } from './modalUtils';
// import { openC3Tab } from './c3TabUtils';
// import {
//   assertConnected,
//   connectToUrl,
//   DEFAULT_TIMEOUT,
//   openWelcomePage,
//   UiConnectSpec,
//   validateAndConfigureEnvOrApp,
// } from './connectionUtils';
// import { createDirFs, readJsonData, writeJsonData } from './fileUtils';
// import { sleep } from '@src/test/shared/utils';
import path from 'path';
import { expect } from 'chai';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
// import { verifyC3OutputChannelContent } from './outputTabUtils';
import simpleGit from 'simple-git';
// import { findStatusBarStatus } from './statusBarUtils';

// Default timeouts for notifications to appear, in seconds
export enum NotificationTimeouts {
  default = 120,
  connectionStart = 30, // "Connecting to URL"
  syncPackageStart = 300, // "Syncing packages" -- indicates connection is complete
  syncComplete = 800, // "Syncing complete with C3 Environment"
  bundlingComplete = 450, // "Bundling Completed"
}

export interface VSCodeSettings {
  'c3.telemetry'?: boolean;
  'window.zoomLevel'?: number;
  'c3.testMode'?: boolean;
  'editor.autoClosingBrackets'?: string;
  'editor.acceptSuggestionOnCommitCharacter'?: boolean;
  'c3.runTestInNewApp'?: boolean;
  completedMigrations?: string[];
}

export const defaultVSCodeSettings: VSCodeSettings = {
  'c3.telemetry': false, // Disables telemetry events
  'window.zoomLevel': -1, // Zooms out as far as possible
  'c3.testMode': true,
};

export const notebookVizVsCodeSettings: VSCodeSettings = {
  ...defaultVSCodeSettings,
  'editor.autoClosingBrackets': 'never',
};

export interface SetupSpec {
  // connectSpec: UiConnectSpec;
  appName: string; // Name of the app to connect to (i.e. 'uitestpkgapp')
  pkgName: string; // Name of the package (i.e. 'uitestpkg')
  envName: string;
  workspace: string;
}

// async function _openWorkspaceLinux(browser: VSBrowser, wsPath: string) {
//   try {
//     await browser.driver.switchTo().defaultContent();
//     await executeWorkbenchCommand(browser.driver, 'File: Open Folder...');
//     await inputTextAndConfirm(wsPath);
//   } catch (e) {
//     console.error(e);
//     throw e;
//   }
// }

// async function openWorkspace(browser, wsPath) {
//   // Workaround for docker openResource bug: https://github.com/redhat-developer/vscode-extension-tester/issues/506
//   console.log(`opening '${wsPath}' as workspace`);
//   if (process.platform === 'linux') {
//     await retry(await _openWorkspaceLinux, 10, 1, true, browser, wsPath);
//   } else {
//     await browser.openResources(wsPath);
//   }
// }

/**
 * Sets up a vscode workspace - opens codeSamples as workspace and verifies the C3 welcome page loads
 * @param browser VSBrowser instance
 */
export async function initWorkspace(workspace: string) {
  console.log(`opening '${workspace}' as workspace directory`);
  // const driver = browser.driver;
  // await safeWaitForWorkbench(browser, driver);
  // await openWorkspace(browser, workspace);
  // await safeWaitForWorkbench(browser, driver);
}

/**
 * Validates that the test workspace has been loaded
 * @param browser VSBrowser instance
 */
export async function validateWorkspace() {
  console.log('Verifying workspace is loaded');

  // wait for c3 welcome page tab to load
  // await openWelcomePage(driver);

  //wait for terminal to load
  // await driver.wait(
  //   async () => {
  //     try {
  //       const bottomBarPanel = new BottomBarPanel();
  //       const isDisplayed = await bottomBarPanel.isDisplayed();
  //       if (isDisplayed) {
  //         return bottomBarPanel;
  //       }
  //     } catch {
  //       return undefined;
  //     }
  //   },
  //   DEFAULT_TIMEOUT * 1000,
  //   'Could not find bottom bar panel',
  // );
  // await sleep(1000);
}

// async function safeWaitForWorkbench(browser: VSBrowser, driver: WebDriver) {
//   try {
//     await browser.waitForWorkbench();
//   } catch {
//     await driver.switchTo().activeElement();
//   }
// }

/**
 * Tears down the current workspace by opening a different directory
 * @param browser VSBrowser instance
 */
// export async function resetWorkspace(browser: VSBrowser) {
//   const driver = browser.driver;
//   try {
//     await driver.switchTo().defaultContent();
//   } catch (e) {
//     console.error(e);
//   }
//   await closeAllEditors(browser);
//   await openWorkspace(browser, NON_WORKSPACE_PATH);
//   await safeWaitForWorkbench(browser, driver);
// }

/**
 * This util close all open tabs
 * @param browser VSBrowser instance
 */
// export async function closeAllEditors(browser: VSBrowser) {
//   await browser.driver.switchTo().defaultContent();
//   await executeWorkbenchCommand(browser.driver, 'View: Close All Editors');
//   // Check if modal pops up and click "Don't Save"
//   try {
//     await selectModalButton(browser.driver, "Don't Save", 3);
//   } catch (e) {
//     console.log('No dirty files in window');
//   }
// }

/**
 * Sets VSCode settings
 * @param workspacePath absolute path to workspace root
 * @param settingsFile name of the settings file to write to (i.e. .c3-extension-settings.json)
 * @param settings {@link VSCodeSettings} settings to use for the test instance of vscode
 */
// export async function setVSCodeSettings(
//   workspacePath: string,
//   settingsFile = 'settings.json',
//   settings = defaultVSCodeSettings,
// ) {
//   const settingsPath = path.resolve(workspacePath, `.vscode/${settingsFile}`);
//   if (!existsSync(settingsPath)) {
//     await createDirFs('.vscode', workspacePath);
//   }
//   const currSettings = await readJsonData(settingsPath);
//
//   for (const entry of Object.entries(settings)) {
//     currSettings[entry[0]] = entry[1];
//   }
//   await writeJsonData(settingsPath, currSettings);
// }
//
/**
 * Sets up the workspace and initializes the default VSCode settings
 * @param browser VSBrowser instance
 */
export async function setupWorkspace(workspace: string) {
  await initWorkspace(workspace);

  // await validateWorkspace(browser.driver);

  console.log('closing editors');
  // await closeAllEditors(browser);
  console.log('all editors closed');

  // await setVSCodeSettings(workspace, 'settings.json');
}

// export async function executeWorkbenchCommand(driver: WebDriver, command: string) {
//   await enterVSCodeSearch(driver, `>${command}`);
// }
//
// export async function setupWorkspaceAndConnect(browser: VSBrowser, spec: SetupSpec) {
//   try {
//     await browser.driver.switchTo().defaultContent();
//   } catch (e) {
//     console.error(e);
//   }
//   await safeWaitForWorkbench(browser, browser.driver);
//   if (
//     !(await findStatusBarStatus(browser.driver, 'C3 AI Extension', 10)) ||
//     (await findStatusBarStatus(browser.driver, DISCONNECTED_STATUS, 10))
//   ) {
//     // If not a valid workspace or disconnected -- perform setup steps
//     await setupWorkspace(browser, spec.workspace);
//
//     await validateAndConfigureEnvOrApp(browser, spec.envName, spec.pkgName, spec.appName);
//
//     // Connect
//     await connectToUrl(browser.driver, spec.connectSpec);
//     await assertConnected(browser, spec.connectSpec.appUrl, spec.pkgName);
//   }
//
//   // Open the C3 tab
//   await openC3Tab();
// }
//
// export async function nativeVSCodeFileSearch(driver: WebDriver, file: string) {
//   await enterVSCodeSearch(driver, file);
// }
//
// export async function enterVSCodeSearch(driver: WebDriver, searchText: string) {
//   await driver.switchTo().defaultContent();
//
//   await retry(
//     async (text) => {
//       const prompt = await new Workbench().openCommandPrompt();
//       await prompt.setText(text);
//       await prompt.confirm();
//     },
//     5,
//     2,
//     true,
//     searchText,
//   );
// }
//
// /**
//  * Returns a NotificationCenter
//  * @param driver WebDriver instance
//  */
// async function notificationsCenter(driver: WebDriver) {
//   try {
//     return await new Workbench().openNotificationsCenter();
//   } catch {
//     // if bell icon is not clickable, show notifications manually and retry
//     await executeWorkbenchCommand(driver, 'Notifications: Show Notifications');
//     return await new Workbench().openNotificationsCenter();
//   }
// }
//
// /**
//  * Returns a Notification for the given message and fails if it was not found
//  * @param driver WebDriver instance
//  * @param message expected message
//  * @param onlyLatest flag to determine if we should assert only the latest notification or all notifications
//  * @param timeout time in seconds to wait for expected notification to appear
//  */
// async function notificationForMessage(
//   driver: WebDriver,
//   message: string,
//   onlyLatest = false,
//   timeout: number = NotificationTimeouts.default,
// ) {
//   await driver.switchTo().defaultContent();
//   return await driver.wait(
//     async () => {
//       try {
//         const center = await notificationsCenter(driver);
//         const notifications = await center.getNotifications(NotificationType.Any);
//         // Determine number of notifications to check
//         const numNotifications = onlyLatest ? 1 : notifications.length;
//         for (let i = 0; i < numNotifications; i++) {
//           const notification = notifications[i];
//           const currentMessage = await notification.getMessage();
//           if (currentMessage?.indexOf(message) >= 0) {
//             return notification;
//           }
//         }
//       } catch { }
//     },
//     timeout * 1000,
//     `No notification with text: ${message} appeared in ${timeout} seconds`,
//   );
// }
//
// /**
//  * Asserts that a notification pops up with the expected message
//  * @param browser VSBrowser instance
//  * @param message expected message
//  * @param onlyLatest flag to determine if we should assert only the latest notification or all notifications
//  * @param timeout time in seconds to wait for expected notification to appear
//  */
// export async function assertNotification(browser: VSBrowser, message: string, onlyLatest?: boolean, timeout?: number) {
//   // fails if no notification appeared
//   await notificationForMessage(browser.driver, message, onlyLatest, timeout);
// }
//
// /**
//  * Click the cancel button on the notification with the given message
//  * @param browser VSBrowser instance
//  * @param message expected message
//  * @param onlyLatest flag to determine if we should assert only the latest notification or all notifications
//  */
// export async function clickCancelOnNotification(browser: VSBrowser, message: string, onlyLatest = true) {
//   const notification = await notificationForMessage(browser.driver, message, onlyLatest);
//   await notification.takeAction('Cancel');
// }
//
// export async function clearNotifications() {
//   const driver = VSBrowser.instance.driver;
//   await driver.switchTo().defaultContent();
//   // "Clear All Notifications" does not clear if the notifications are hidden
//   await executeWorkbenchCommand(driver, 'Notifications: Show Notifications');
//   await executeWorkbenchCommand(driver, 'Notifications: Clear All Notifications');
// }
//
// /**
//  *
//  * @param text text to enter into the input box
//  * @param input
//  */
// export async function inputTextAndConfirm(text: string, inputBox?: InputBox) {
//   // if input is not passed, create one. This does not perform any actions, just creates an InputBox object with the relevant css selectors
//   if (!inputBox) {
//     inputBox = await InputBox.create();
//   }
//   // explicit waits to allow inputbox to render and send text
//   await inputBox.clear();
//   await sleep(500);
//   await inputBox.setText(text);
//   await sleep(500);
//   await inputBox.confirm();
// }
//
// /**
//  * Resets the state as much as possible between tests, without tearing down connection. Call this in after of each test
//  * TODO: PLAT-60328 - Add functionality for reverting file changes, workspace settings, etc.
//  */
// export async function resetTestState() {
//   await clearModal();
//   await clearNotifications();
//   await closeAllEditors(VSBrowser.instance);
// }
//
// /**
//  * Returns a list of pkgNames within a workspace
//  * @param workspacePath absolute path to a workspace directory
//  * @returns list of pkgNames
//  */
// export async function allWorkspacePackages(workspacePath: string): Promise<[string]> {
//   // Make sure workspacePath is valid directory and is not already a package
//   if (!(await stat(workspacePath)).isDirectory()) {
//     throw new Error(`${workspacePath} is not a valid workspace path`);
//   }
//
//   // If the workspace is already a package, return the pkgName
//   if (await _folderContainsPkgManifest(workspacePath)) {
//     return [path.basename(workspacePath)];
//   }
//
//   // Gets all children of a folder, and returns their absolute paths in a list
//   const folderChildPaths = async (folder: string) => {
//     return (await readdir(folder)).map((fileName) => path.join(workspacePath, fileName));
//   };
//
//   // Push all files within workspace into a queue
//   const fileQueue = await folderChildPaths(workspacePath);
//   const pkgList = [];
//
//   // Process queue
//   while (fileQueue.length > 0) {
//     // Get first element in queue
//     const filePath = fileQueue.shift();
//     console.log(filePath);
//
//     // Ensure path exists
//     if (!existsSync(filePath)) {
//       continue;
//     }
//
//     // If path isn't a directory, skip
//     if (!(await stat(filePath)).isDirectory()) {
//       continue;
//     }
//
//     // Check if the path is a valid pkg
//     if (await _folderContainsPkgManifest(filePath)) {
//       pkgList.push(path.basename(filePath));
//     } else {
//       // Push all children of filePath onto the queue
//       fileQueue.push(...(await folderChildPaths(filePath)));
//     }
//   }
//
//   // Return as [String] otherwise typescript will complain about returning a potentially empty []
//   return pkgList as [string];
// }
//
// /**
//  * Whether or not a folder contains a pkg manifest file ('.c3pkg.json')
//  * @param folderPath Folder to check for manifest
//  */
// async function _folderContainsPkgManifest(folderPath: string): Promise<boolean> {
//   for (const file of await readdir(folderPath)) {
//     if (file.endsWith('.c3pkg.json')) {
//       return true;
//     }
//   }
//   return false;
// }
//
// /**
//  * Update the global configuration for the C3 namespace
//  * @param key name of the configuration
//  * @param value value for the configuration
//  */
// export async function setGlobalConfiguration(key: string, value: any) {
//   // Default configuration is global(user)
//   const settingsEditor = await new Workbench().openSettings();
//   const setting = await settingsEditor.findSetting(key);
//   await setting.setValue(value);
// }
//
// /**
//  * Wait for the extension to activate
//  */
// export async function waitForExtensionActivation(driver: WebDriver, timeout = 20) {
//   await verifyC3OutputChannelContent(driver, ACTIVATION_MSG, true, timeout);
// }
//
// export async function switchGitBranch(workspace: string, checkoutPath: string) {
//   const git = simpleGit({ baseDir: workspace });
//   try {
//     await git.checkout('.');
//     await git.fetch('origin');
//     await git.checkout(checkoutPath);
//   } catch (e) {
//     console.error(e);
//   }
// }

console.log("lcode");
