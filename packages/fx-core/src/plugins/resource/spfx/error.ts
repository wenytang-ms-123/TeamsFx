// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./utils/constants";
import * as util from "util";

export function ScaffoldError(error: Error): UserError | SystemError {
  if (error instanceof UserError || error instanceof SystemError) {
    return error;
  } else {
    return new SystemError(error, Constants.PLUGIN_NAME, "SPFxScaffoldError");
  }
}

export function NoSPPackageError(distFolder: string): UserError {
  return new UserError(
    Constants.PLUGIN_NAME,
    util.format("Cannot find SharePoint package %s", distFolder),
    "NoSharePointPackage"
  );
}

export function BuildSPPackageError(error: Error): UserError | SystemError {
  if (error instanceof UserError || error instanceof SystemError) {
    return error;
  } else {
    return new UserError(error, Constants.PLUGIN_NAME, "BuildSPFxPackageFail");
  }
}

export function NoManifestFileError(distFolder: string): UserError {
  return new UserError(
    Constants.PLUGIN_NAME,
    util.format("Cannot find manifest file %s", distFolder),
    "NoManifestFile"
  );
}
