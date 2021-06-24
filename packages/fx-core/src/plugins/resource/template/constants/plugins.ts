// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IPlugin } from "../../commonUtils/interfaces/IPlugin";

export class Plugins {
  static TemplatePlugin: IPlugin = {
    id: "fx-resource-template",
    name: "template",
    shortName: "temp",
    configKeys: {
      suffix: "suffix",
      resourceName: "resourceName",
    },
  };

  static SolutionPlugin: IPlugin = {
    id: "solution",
    configKeys: {
      resourceNameSuffix: "resourceNameSuffix",
    },
  };
}
