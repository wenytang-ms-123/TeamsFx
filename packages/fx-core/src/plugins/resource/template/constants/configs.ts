// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IConfig } from "../../commonUtils/interfaces/IConfig";
import { Plugins } from "./plugins";

export const provisionInputConfig: IConfig = new Map([
  [
    Plugins.TemplatePlugin.configKeys.suffix,
    {
      plugin: Plugins.SolutionPlugin.id,
      key: Plugins.SolutionPlugin.configKeys.resourceNameSuffix,
    },
  ],
]);

export const provisionOutputConfig: IConfig = new Map([
  [
    Plugins.TemplatePlugin.configKeys.resourceName,
    {
      key: Plugins.TemplatePlugin.configKeys.resourceName,
      required: false,
    },
  ],
]);
