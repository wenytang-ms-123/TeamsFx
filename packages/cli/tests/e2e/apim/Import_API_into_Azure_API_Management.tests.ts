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

describe("Import API into API Management", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscriptionId = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  before(async () => {
    // new a project
    let result = await execAsync(`teamsfx new --app-name ${appName} --interactive false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`New: ${JSON.stringify(result)}`);

    await setSimpleAuthSkuNameToB1(projectPath);

    result = await execAsync(`teamsfx resource add azure-apim --subscription ${subscriptionId}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`Add: ${JSON.stringify(result)}`);

    result = await execAsync(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`Provision: ${JSON.stringify(result)}`);

    result = await execAsync(
      `teamsfx deploy apim --open-api-document openapi/openapi.json --api-prefix ${appName} --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(`Deploy: ${JSON.stringify(result)}`);
  });

  it(`Create a new API version in Azure API Management`, async function () {
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    const result = await execAsync(`teamsfx deploy apim --api-version v2`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`Deploy: ${JSON.stringify(result)}`);

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v2");
  });

  it(`Update an existing API version in Azure API Management`, async function () {
    await ApimValidator.init(subscriptionId, AzureLogin, GraphLogin);
    const result = await execAsync(`teamsfx deploy apim --api-version v1`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`Deploy: ${JSON.stringify(result)}`);

    const deployContext = await fs.readJSON(getConfigFileName(appName));
    await ApimValidator.validateDeploy(deployContext, projectPath, appName, "v1");
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, true);
  });
});
