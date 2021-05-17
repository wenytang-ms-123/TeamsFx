// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { ApimValidator } from "../../commonlib";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  getConfigFileName,
  cleanUp,
} from "../commonUtils";
import AzureLogin from "../../../src/commonlib/azureLogin";
import GraphLogin from "../../../src/commonlib/graphLogin";

describe("Create a new API Management Service", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Import API into a new API Management Service`, async function () {
    // new a project
    let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(
      !result.stderr
        ? "[Successfully] Create project"
        : `[Warning] Create project: ${result.stderr}`
    );

    await setSimpleAuthSkuNameToB1(projectPath);

    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);

    result = await execAsync(`teamsfx resource add azure-apim --subscription ${subscriptionId}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(
      !result.stderr
        ? "[Successfully] Add apim resource"
        : `[Warning] Add apim resource: ${result.stderr}`
    );

    result = await execAsync(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(
      !result.stderr ? "[Successfully] Provision" : `[Warning] Provision: ${result.stderr}`
    );

    const provisionContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateProvision(provisionContext, appName);

    result = await execAsync(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(!result.stderr ? "[Successfully] Deploy" : `[Warning] Deploy: ${result.stderr}`);

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true);
  });
});
