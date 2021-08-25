// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const ConfigFolderName = "fx";
export const AppPackageFolderName = "appPackage";
export const ProductName = "teamsfx";
export const ArchiveFolderName = ".archive";
export const ArchiveLogFileName = ".archive.log";

/**
 * questions for VS and CLI_HELP platforms are static question which don't depend on project context
 * questions for VSCode and CLI platforms are dynamic question which depend on project context
 */
export enum Platform {
  VSCode = "vsc",
  CLI = "cli",
  VS = "vs",
  CLI_HELP = "cli_help",
}

export const StaticPlatforms = [Platform.VS, Platform.CLI_HELP];
export const DynamicPlatforms = [Platform.VSCode, Platform.CLI];
export const CLIPlatforms = [Platform.CLI, Platform.CLI_HELP];

export enum VsCodeEnv {
  local = "local",
  codespaceBrowser = "codespaceBrowser",
  codespaceVsCode = "codespaceVsCode",
  remote = "remote",
}

export enum Stage {
  create = "create",
  migrateV1 = "migrateV1",
  build = "build",
  debug = "debug",
  provision = "provision",
  deploy = "deploy",
  package = "package",
  publish = "publish",
  createEnv = "createEnv",
  removeEnv = "removeEnv",
  switchEnv = "switchEnv",
  userTask = "userTask",
  update = "update", //never used again except APIM just for reference
  grantPermission = "grantPermission",
  checkPermission = "checkPermission",
  listCollaborator = "listCollaborator",
}
