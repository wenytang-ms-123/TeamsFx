// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, FrontendValidator, SimpleAuthValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  cleanUp,
  mockTeamsfxMultiEnvFeatureFlag,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const processEnv = mockTeamsfxMultiEnvFeatureFlag();

  it(`Tab`, async function () {
    // new a project (tab only)
    await execAsync(`teamsfx new --interactive false --app-name ${appName} --capabilities tab `, {
      cwd: testFolder,
      env: processEnv,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setSimpleAuthSkuNameToB1Bicep(projectPath);

    // set subscription
    await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    // provision
    await execAsyncWithRetry(`teamsfx provision --env dev`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    {
      // Validate provision
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/publishProfiles/profile.dev.json`);

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Simple Auth
      const simpleAuth = SimpleAuthValidator.init(context);
      await SimpleAuthValidator.validate(simpleAuth, aad, "B1", true);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);
    }

    // deploy
    await execAsyncWithRetry(`teamsfx deploy --env dev`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    {
      // Validate provision
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/publishProfiles/profile.dev.json`);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateDeploy(frontend);
    }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath);
  });
});
