// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author wenyt <75360946+wenytang-ms@users.noreply.github.com>
 */
import * as path from "path";
import { VSBrowser } from "vscode-extension-tester";
import { Timeout } from "../../utils/constants";
import {
  RemoteDebugTestContext,
  runProvision,
  reRunProvision,
  runDeploy,
} from "./remotedebugContext";
import {
  execCommandIfExist,
  createNewProject,
  clearNotifications,
} from "../../utils/vscodeOperation";
import { initPage, validateEchoBot } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import {
  cleanUpResourceGroup,
  createResourceGroup,
} from "../../utils/cleanHelper";

describe("Remote debug Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let remoteDebugTestContext: RemoteDebugTestContext;
  let testRootFolder: string;
  let appName: string;
  const appNameCopySuffix = "copy";
  let newAppFolderName: string;
  let projectPath: string;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    remoteDebugTestContext = new RemoteDebugTestContext("bot");
    testRootFolder = remoteDebugTestContext.testRootFolder;
    appName = remoteDebugTestContext.appName;
    newAppFolderName = appName + appNameCopySuffix;
    projectPath = path.resolve(testRootFolder, newAppFolderName);
    await remoteDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await remoteDebugTestContext.after();

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await remoteDebugTestContext.cleanUp(
      appName,
      projectPath,
      false,
      true,
      false
    );
  });

  it(
    "[auto] Delete resource group and re-provision for bot project",
    {
      testPlanCaseId: 10744682,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const driver = VSBrowser.instance.driver;
      await createNewProject("bot", appName);
      await runProvision(appName);
      await clearNotifications();
      await cleanUpResourceGroup(appName, "dev");
      await createResourceGroup(appName, "dev");
      await reRunProvision();
      await runDeploy(Timeout.botDeploy);
      const teamsAppId = await remoteDebugTestContext.getTeamsAppId(
        projectPath
      );
      const page = await initPage(
        remoteDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await driver.sleep(Timeout.longTimeWait);
      await validateEchoBot(page);
    }
  );
});
