// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  ConfigMap,
  CryptoProvider,
  EnvProfileFileNameTemplate,
  EnvConfig,
  err,
  FxError,
  ok,
  PublishProfilesFolderName,
  Result,
  SystemError,
  InputConfigsFolderName,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  EnvInfo,
  Json,
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import path, { basename } from "path";
import fs from "fs-extra";
import jsum from "jsum";
import {
  deserializeDict,
  dataNeedEncryption,
  mergeSerectData,
  PathNotExistError,
  serializeDict,
  sperateSecretData,
  WriteFileError,
  mapToJson,
  objectToMap,
  ProjectEnvNotExistError,
  InvalidEnvConfigError,
  ModifiedSecretError,
} from "..";
import { GLOBAL_CONFIG } from "../plugins/solution/fx-solution/constants";
import { readJson } from "../common/fileUtils";
import { Component, sendTelemetryErrorEvent, TelemetryEvent } from "../common/telemetry";
import { isMultiEnvEnabled } from "../common";
import Ajv from "ajv";
import * as draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import * as envConfigSchema from "@microsoft/teamsfx-api/build/schemas/envConfig.json";
import {
  InvalidProjectError,
  InvalidProjectSettingsFileError,
  isValidProject,
  ReadFileError,
} from ".";

export interface EnvProfileFiles {
  envProfile: string;
  userDataFile: string;
}

class EnvironmentManager {
  public readonly envNameRegex = /^[\w\d-_]+$/;
  public readonly envConfigNameRegex = /config\.(?<envName>[\w\d-_]+)\.json/i;
  public readonly envProfileNameRegex = /profile\.(?<envName>[\w\d-_]+)\.json/i;

  private readonly defaultEnvName = "default";
  private readonly defaultEnvNameNew = "dev";
  private readonly ajv;
  private readonly checksumKey = "_checksum";
  private readonly schema =
    "https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/packages/api/src/schemas/envConfig.json";
  private readonly manifestConfigDescription =
    `You can customize the 'values' object to customize Teams app manifest for different environments.` +
    ` Visit https://aka.ms/teamsfx-config to learn more about this.`;

  constructor() {
    this.ajv = new Ajv();
    this.ajv.addMetaSchema(draft6MetaSchema);
  }

  public async loadEnvInfo(
    projectPath: string,
    envName?: string,
    cryptoProvider?: CryptoProvider
  ): Promise<Result<EnvInfo, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
    }

    envName = envName ?? this.getDefaultEnvName();
    const configResult = await this.loadEnvConfig(projectPath, envName);
    if (configResult.isErr()) {
      return err(configResult.error);
    }

    const profileResult = await this.loadEnvProfile(projectPath, envName, cryptoProvider);
    if (profileResult.isErr()) {
      return err(profileResult.error);
    }

    return ok({ envName, config: configResult.value, profile: profileResult.value });
  }

  public newEnvConfigData(appName: string): EnvConfig {
    const envConfig: EnvConfig = {
      $schema: this.schema,
      manifest: {
        description: this.manifestConfigDescription,
        values: {
          appName: {
            short: appName,
            full: `Full name for ${appName}`,
          },
        },
      },
    };

    return envConfig;
  }

  public async writeEnvConfig(
    projectPath: string,
    envConfig: EnvConfig,
    envName?: string
  ): Promise<Result<string, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
    }

    const envConfigsFolder = this.getEnvConfigsFolder(projectPath);
    if (!(await fs.pathExists(envConfigsFolder))) {
      await fs.ensureDir(envConfigsFolder);
    }

    envName = envName ?? this.getDefaultEnvName();
    const envConfigPath = this.getEnvConfigPath(envName, projectPath);

    try {
      await fs.writeFile(envConfigPath, JSON.stringify(envConfig, null, 4));
    } catch (error) {
      return err(WriteFileError(error));
    }

    return ok(envConfigPath);
  }

  public async writeEnvProfile(
    envData: Map<string, any> | Json,
    projectPath: string,
    envName?: string,
    cryptoProvider?: CryptoProvider
  ): Promise<Result<string, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
    }

    const envProfilesFolder = this.getEnvProfilesFolder(projectPath);
    if (!(await fs.pathExists(envProfilesFolder))) {
      await fs.ensureDir(envProfilesFolder);
    }

    envName = envName ?? this.getDefaultEnvName();
    const envFiles = this.getEnvProfileFilesPath(envName, projectPath);

    const data = envData instanceof Map ? mapToJson(envData) : envData;
    const secrets = sperateSecretData(data);
    if (cryptoProvider) {
      this.encrypt(secrets, cryptoProvider);
    }
    if (Object.keys(secrets).length) {
      secrets[this.checksumKey] = jsum.digest(secrets, "SHA256", "hex");
    }

    try {
      await fs.writeFile(envFiles.envProfile, JSON.stringify(data, null, 4));
      await fs.writeFile(envFiles.userDataFile, serializeDict(secrets));
    } catch (error) {
      return err(WriteFileError(error));
    }

    return ok(envFiles.envProfile);
  }

  public async listEnvConfigs(projectPath: string): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
    }

    const envConfigsFolder = this.getEnvConfigsFolder(projectPath);
    if (!(await fs.pathExists(envConfigsFolder))) {
      return ok([]);
    }

    const configFiles = await fs.readdir(envConfigsFolder);
    const envNames = configFiles
      .map((file) => this.getEnvNameFromPath(file))
      .filter((name): name is string => name !== null);

    return ok(envNames);
  }

  public async checkEnvExist(projectPath: string, env: string): Promise<Result<boolean, FxError>> {
    const envList = await environmentManager.listEnvConfigs(projectPath);
    if (envList.isErr()) {
      return err(envList.error);
    }
    if (envList.value?.indexOf(env) >= 0) {
      return ok(true);
    } else {
      return ok(false);
    }
  }

  public getEnvConfigPath(envName: string, projectPath: string): string {
    const basePath = this.getEnvConfigsFolder(projectPath);
    return path.resolve(basePath, EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, envName));
  }

  public getEnvProfileFilesPath(envName: string, projectPath: string): EnvProfileFiles {
    const basePath = this.getEnvProfilesFolder(projectPath);
    const envProfile = path.resolve(
      basePath,
      isMultiEnvEnabled()
        ? EnvProfileFileNameTemplate.replace(EnvNamePlaceholder, envName)
        : `env.${envName}.json`
    );
    const userDataFile = path.resolve(basePath, `${envName}.userdata`);

    return { envProfile, userDataFile };
  }

  private async loadEnvConfig(
    projectPath: string,
    envName: string
  ): Promise<Result<EnvConfig, FxError>> {
    if (!isMultiEnvEnabled()) {
      return ok({
        manifest: { values: { appName: { short: "" } } },
      });
    }

    const envConfigPath = this.getEnvConfigPath(envName, projectPath);
    if (!(await fs.pathExists(envConfigPath))) {
      return err(ProjectEnvNotExistError(envName));
    }

    const validate = this.ajv.compile<EnvConfig>(envConfigSchema);
    const data = await fs.readJson(envConfigPath);
    if (validate(data)) {
      return ok(data);
    }

    return err(InvalidEnvConfigError(envName, JSON.stringify(validate.errors)));
  }

  private async loadEnvProfile(
    projectPath: string,
    envName: string,
    cryptoProvider?: CryptoProvider
  ): Promise<Result<Map<string, any>, FxError>> {
    const envFiles = this.getEnvProfileFilesPath(envName, projectPath);
    const userDataResult = await this.loadUserData(envFiles.userDataFile, cryptoProvider);
    if (userDataResult.isErr()) {
      return err(userDataResult.error);
    }
    const userData = userDataResult.value;

    if (!(await fs.pathExists(envFiles.envProfile))) {
      const data = new Map<string, any>([[GLOBAL_CONFIG, new ConfigMap()]]);

      return ok(data);
    }

    const envData = await readJson(envFiles.envProfile);

    mergeSerectData(userData, envData);
    const data = objectToMap(envData);

    return ok(data);
  }

  private getEnvNameFromPath(filePath: string): string | null {
    const match = this.envConfigNameRegex.exec(filePath);
    if (match != null && match.groups != null) {
      return match.groups.envName;
    }

    return null;
  }

  private getConfigFolder(projectPath: string): string {
    return path.resolve(projectPath, `.${ConfigFolderName}`);
  }

  private getPublishProfilesFolder(projectPath: string): string {
    return path.resolve(this.getConfigFolder(projectPath), PublishProfilesFolderName);
  }

  private getEnvProfilesFolder(projectPath: string): string {
    return isMultiEnvEnabled()
      ? this.getPublishProfilesFolder(projectPath)
      : this.getConfigFolder(projectPath);
  }

  private getEnvConfigsFolder(projectPath: string): string {
    return path.resolve(this.getConfigFolder(projectPath), InputConfigsFolderName);
  }

  private async loadUserData(
    userDataPath: string,
    cryptoProvider?: CryptoProvider
  ): Promise<Result<Record<string, string>, FxError>> {
    if (!(await fs.pathExists(userDataPath))) {
      return ok({});
    }

    const content = await fs.readFile(userDataPath, "UTF-8");
    const secrets = deserializeDict(content);
    if (!cryptoProvider) {
      return ok(secrets);
    }

    const res = this.decrypt(secrets, cryptoProvider);
    if (res.isErr()) {
      if (!this.checksumMatch(secrets)) {
        sendTelemetryErrorEvent(
          Component.core,
          TelemetryEvent.DecryptUserdata,
          ModifiedSecretError()
        );
      } else {
        const fxError: SystemError = res.error;
        const fileName = basename(userDataPath);
        fxError.message = `Project update failed because of ${fxError.name}(file:${fileName}):${fxError.message}, if your local file '*.userdata' is not modified, please report to us by click 'Report Issue' button.`;
        fxError.userData = `file: ${fileName}\n------------FILE START--------\n${content}\n------------FILE END----------`;
        sendTelemetryErrorEvent(Component.core, TelemetryEvent.DecryptUserdata, fxError);
      }
    }
    return res;
  }

  private encrypt(
    secrets: Record<string, string>,
    cryptoProvider: CryptoProvider
  ): Result<Record<string, string>, FxError> {
    for (const secretKey of Object.keys(secrets)) {
      if (!dataNeedEncryption(secretKey)) {
        continue;
      }
      const encryptedSecret = cryptoProvider.encrypt(secrets[secretKey]);
      // always success
      if (encryptedSecret.isOk()) {
        secrets[secretKey] = encryptedSecret.value;
      }
    }

    return ok(secrets);
  }

  private decrypt(
    secrets: Record<string, string>,
    cryptoProvider: CryptoProvider
  ): Result<Record<string, string>, FxError> {
    for (const secretKey of Object.keys(secrets)) {
      if (!dataNeedEncryption(secretKey)) {
        continue;
      }

      const secretValue = secrets[secretKey];
      const plaintext = cryptoProvider.decrypt(secretValue);
      if (plaintext.isErr()) {
        return err(plaintext.error);
      }

      secrets[secretKey] = plaintext.value;
    }

    return ok(secrets);
  }

  private checksumMatch(secrets: Record<string, string>): boolean {
    const checksum = secrets[this.checksumKey];
    if (checksum) {
      delete secrets[this.checksumKey];
      return jsum.digest(secrets, "SHA256", "hex") === checksum;
    }
    return true;
  }

  public getDefaultEnvName() {
    if (isMultiEnvEnabled()) {
      return this.defaultEnvNameNew;
    } else {
      return this.defaultEnvName;
    }
  }

  public getActiveEnv(projectRoot: string): Result<string, FxError> {
    if (!isMultiEnvEnabled()) {
      return ok("default");
    }
    if (!isValidProject(projectRoot)) {
      return err(InvalidProjectError());
    }
    const settingsJsonPath = path.join(
      projectRoot,
      `.${ConfigFolderName}/${InputConfigsFolderName}/${ProjectSettingsFileName}`
    );
    let settingsContent;
    try {
      settingsContent = fs.readFileSync(settingsJsonPath, "utf8");
    } catch (error) {
      return err(ReadFileError(error));
    }

    let settingsJson;
    try {
      settingsJson = JSON.parse(settingsContent);
    } catch (error) {
      return err(
        InvalidProjectSettingsFileError(
          `Project settings file is not a valid JSON, error: '${error}'`
        )
      );
    }

    if (
      !settingsJson ||
      !settingsJson.activeEnvironment ||
      typeof settingsJson.activeEnvironment !== "string"
    ) {
      return err(
        InvalidProjectSettingsFileError(
          "The property 'activeEnvironment' does not exist in project settings file."
        )
      );
    }

    return ok(settingsJson.activeEnvironment as string);
  }
}

export const environmentManager = new EnvironmentManager();
