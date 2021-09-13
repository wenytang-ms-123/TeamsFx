// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  ConfigFolderName,
  EnvConfig,
  InputConfigsFolderName,
  Inputs,
  err,
  ProjectSettingsFileName,
  PublishProfilesFolderName,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { CoreHookContext, deserializeDict, NoProjectOpenedError, serializeDict } from "../..";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import { readJson, checkFileExist } from "../../common/fileUtils";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { FxCore } from "..";
import {
  isMultiEnvEnabled,
  isArmSupportEnabled,
  isBicepEnvCheckerEnabled,
} from "../../common/tools";
import { loadProjectSettings } from "./projectSettingsLoader";
import { generateArmTemplate } from "../../plugins/solution/fx-solution/arm";
import { loadSolutionContext } from "./envInfoLoader";

const MigrationMessage = (stage: string) =>
  `In order to continue using the latest Teams Toolkit, we will update your project code to use the latest Teams Toolkit. We recommend to initialize your workspace with git for better tracking file changes.`;

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    const core = ctx.self as FxCore;
    const res = await core.tools.ui.showMessage(
      "info",
      MigrationMessage(inputs.stage as string),
      true,
      "OK"
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != "OK") {
      return;
    }
    await migrateToArmAndMultiEnv(ctx);
  }
  await next();
};

async function migrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<void> {
  try {
    await migrateArm(ctx);
    await migrateMultiEnv(ctx);
  } catch (err) {
    // TODO: cleanup files if failed.
    await cleanup(ctx);
    throw err;
  }
  // await removeOldProjectFiles();
}

async function migrateMultiEnv(ctx: CoreHookContext): Promise<void> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }

  const fx = path.join(inputs.projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAppPackage = path.join(inputs.projectPath, "templates", AppPackageFolderName);
  const fxPublishProfile = path.join(fx, PublishProfilesFolderName);
  // TODO: search capability and resource
  const hasProvision = false;
  const hasTab = false;
  const hasBackend = false;
  const hasBot = false;

  await fs.ensureDir(fx);
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAppPackage);

  //config.dev.json
  await fs.writeFile(fxConfig, JSON.stringify(getConfigDevJson(), null, 4));
  //localSettings.json
  const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);
  await localSettingsProvider.save(localSettingsProvider.init(hasTab, hasBackend, hasBot));
  //projectSettings.json
  await fs.copy(path.join(fx, "settings.json"), path.join(fxConfig, ProjectSettingsFileName));
  // appPackage
  await fs.copy(path.join(fx, AppPackageFolderName), templateAppPackage);
  await fs.rename(
    path.join(templateAppPackage, "manifest.source.json"),
    path.join(templateAppPackage, "manifest.template.json")
  );
  await moveIconsToResourceFolder(templateAppPackage);

  if (hasProvision) {
    const devProfile = path.join(fxPublishProfile, "profile.dev.json");
    const devUserData = path.join(fxPublishProfile, "dev.userdata");
    await fs.copy(path.join(fx, "env.default.json"), devProfile);
    await fs.copy(path.join(fx, "default.userdata"), devUserData);
    // remove fx-resource-local-debug.trustDevCert
    await removeFxResourceLocalDebug(devProfile, devUserData);
  }
}

async function moveIconsToResourceFolder(templateAppPackage: string): Promise<void> {
  // see AppStudioPluginImpl.buildTeamsAppPackage()
  const manifest: TeamsAppManifest = await readJson(
    path.join(templateAppPackage, "manifest.template.json")
  );
  const hasColorIcon = manifest.icons.color && !manifest.icons.color.startsWith("https://");
  const hasOutlineIcon = manifest.icons.outline && !manifest.icons.outline.startsWith("https://");
  if (!hasColorIcon || !hasOutlineIcon) {
    return;
  }

  // move to resources
  const resource = path.join(templateAppPackage, "resources");
  await fs.ensureDir(resource);
  await fs.copy(
    path.join(templateAppPackage, manifest.icons.color),
    path.join(resource, manifest.icons.color)
  );
  await fs.copy(
    path.join(templateAppPackage, manifest.icons.outline),
    path.join(resource, manifest.icons.outline)
  );

  // update icons
  manifest.icons.color = path.join("resources", manifest.icons.color);
  manifest.icons.outline = path.join("resources", manifest.icons.outline);
  await fs.writeFile(
    path.join(templateAppPackage, "manifest.template.json"),
    JSON.stringify(manifest, null, 4)
  );
}

async function removeFxResourceLocalDebug(devProfile: string, devUserData: string): Promise<void> {
  const profileData: Map<string, any> = await readJson(devProfile);
  if (profileData.has(PluginNames.LDEBUG)) {
    profileData.delete(PluginNames.LDEBUG);
    await fs.writeFile(devProfile, JSON.stringify(profileData, null, 4), { encoding: "UTF-8" });
  }
  const secrets: Record<string, string> = deserializeDict(await fs.readFile(devUserData, "UTF-8"));
  if (secrets[PluginNames.LDEBUG]) {
    delete secrets[PluginNames.LDEBUG];
    await fs.writeFile(devUserData, serializeDict(secrets), { encoding: "UTF-8" });
  }
}

async function removeOldProjectFiles(): Promise<void> {
  // TODO
}

function getConfigDevJson(): EnvConfig {
  return {
    $schema:
      "https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/packages/api/src/schemas/envConfig.json",
    azure: {},
    manifest: {
      description:
        `You can customize the 'values' object to customize Teams app manifest for different environments.` +
        ` Visit https://aka.ms/teamsfx-config to learn more about this.`,
      values: {},
    },
  };
}

async function cleanup(ctx: CoreHookContext) {}

async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
  // if (!preCheckEnvEnabled()) {
  //   return false;
  // }
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }
  const fxExist = await fs.pathExists(path.join(inputs.projectPath, ".fx"));
  if (!fxExist) {
    return false;
  }

  const envFileExist = await checkFileExist(
    path.join(inputs.projectPath, ".fx", "env.default.json")
  );
  const configDirExist = await fs.pathExists(path.join(inputs.projectPath, ".fx", "configs"));
  const armParameterExist = await checkFileExist(
    path.join(inputs.projectPath, ".fx", "configs", "azure.parameters.dev.json")
  );
  if (envFileExist && (!armParameterExist || !configDirExist)) {
    return true;
  }
  return false;
}

function preCheckEnvEnabled() {
  if (isMultiEnvEnabled() && isArmSupportEnabled() && isBicepEnvCheckerEnabled()) {
    return true;
  }
  return false;
}

async function migrateArm(ctx: CoreHookContext) {
  await generateArmTempaltesFiles(ctx);
}

async function generateArmTempaltesFiles(ctx: CoreHookContext) {
  // copy ctx
  const fakeCtx: CoreHookContext = { arguments: ctx.arguments };

  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }
  const core = ctx.self as FxCore;

  const fx = path.join(inputs.projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAzure = path.join(inputs.projectPath, "templates", "azure");
  await fs.ensureDir(fx);
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAzure);
  // load local settings.json
  const loadRes = await loadProjectSettings(inputs);
  if (loadRes.isErr()) {
    ctx.result = err(loadRes.error);
    return;
  }
  const [projectSettings, projectIdMissing] = loadRes.value;
  fakeCtx.projectSettings = projectSettings;
  fakeCtx.projectIdMissing = projectIdMissing;

  // load envinfo env.default.json
  const targetEnvName = "default";
  const result = await loadSolutionContext(
    core.tools,
    inputs,
    fakeCtx.projectSettings,
    fakeCtx.projectIdMissing,
    targetEnvName,
    inputs.ignoreEnvInfo
  );
  if (result.isErr()) {
    console.log("error!!!!!!!!!");
    return;
  }
  fakeCtx.solutionContext = result.value;
  // generate arm templates
  try {
    await generateArmTemplate(fakeCtx.solutionContext!);
  } catch (error) {
    return error;
  }
  if (await checkFileExist(path.join(templateAzure, "parameters.template.json"))) {
    await fs.move(
      path.join(templateAzure, "parameters.template.json"),
      path.join(fxConfig, "parameters.deafult.json")
    );
  }
}

async function parameterParser(ctx: CoreHookContext) {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }
  const fx = path.join(inputs.projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const envConfig = await fs.readJson(path.join(fx, "env.default.json"));
  const targetJson = await fs.readJson(path.join(fxConfig, "parameters.deafult.json"));
  if (envConfig["fx-resource-frontend-hosting"]) {
    if (envConfig["fx-resource-frontend-hosting"]["storageName"]) {
      targetJson["parameters"]["frontendHosting_storageName"] = {
        value: envConfig["fx-resource-frontend-hosting"]["storageName"],
      };
    }
  }
  if (envConfig["fx-resource-identity"]) {
    if (envConfig["fx-resource-identity"]["identityName"]) {
      targetJson["parameters"]["identity_managedIdentityName"] = {
        value: envConfig["fx-resource-identity"]["identityName"],
      };
    }
  }
  // azure SQL
  if (envConfig["fx-resource-azure-sql"]) {
    if (envConfig["fx-resource-azure-sql"]["admin"]) {
      targetJson["parameters"]["azureSql_admin"] = {
        value: envConfig["fx-resource-azure-sql"]["admin"],
      };
    }
    if (envConfig["fx-resource-azure-sql"]["sqlEndpoint"]) {
      targetJson["parameters"]["azureSql_serverName"] = {
        value: envConfig["fx-resource-azure-sql"]["sqlEndpoint"],
      };
    }
    if (envConfig["fx-resource-azure-sql"]["databaseName"]) {
      targetJson["parameters"]["azureSql_databaseName"] = {
        value: envConfig["fx-resource-azure-sql"]["databaseName"],
      };
    }
  }
  //
  if (envConfig["fx-resource-aad-app-for-teams"]) {
    if (envConfig["fx-resource-aad-app-for-teams"]["clientId"]) {
      targetJson["parameters"]["m365ClientId"] = {
        value: envConfig["fx-resource-aad-app-for-teams"]["clientId"],
      };
    }
    if (envConfig["fx-resouce-aad-app-for-teams"]["tenantId"]) {
      targetJson["parameters"]["m365TenantId"] = {
        value: envConfig["fx-resouce-aad-app-for-teams"]["tenantId"],
      };
    }
    if (envConfig["fx-resouce-aad-app-for-teams"]["oauthAuthority"]) {
      targetJson["parameters"]["m365OauthAuthorityHost"] = {
        value: envConfig["fx-resouce-aad-app-for-teams"]["oauthAuthority"],
      };
    }
  }

  if (envConfig["fx-resource-simple-auth"]) {
    if (envConfig["fx-resource-simple-auth"]["endpoint"]) {
      targetJson["parameters"]["simpleAuth_packageUri"] = {
        value: envConfig["fx-resource-simple-auth"]["endpoint"],
      };
    }
  }

  await fs.writeFile(
    path.join(fxConfig, "parameters.deafult.json"),
    JSON.stringify(targetJson, null, 4)
  );
}
