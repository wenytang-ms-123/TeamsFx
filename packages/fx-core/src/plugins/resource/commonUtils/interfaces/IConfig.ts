// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigValue } from "@microsoft/teamsfx-api";

export interface IConfigValue {
  value?: ConfigValue;
  plugin?: string;
  key: string;
  required?: boolean;
}

export type IConfig = Map<string, IConfigValue>;
