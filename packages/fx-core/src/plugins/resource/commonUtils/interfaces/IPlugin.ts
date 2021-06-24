// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IPlugin {
  id: string;
  name?: string;
  shortName?: string;
  configKeys: { [key: string]: string };
}
