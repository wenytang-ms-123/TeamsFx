// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IError } from "../interfaces/IError";

export const UnhandledError: IError = {
  name: "UnhandledError",
  message: (detailedMessage: string) => `Unhandled Message: ${detailedMessage}`,
};

export const ReadConfigError: IError = {
  name: "ReadConfigError",
  message: (pluginId: string, key: string) =>
    `Failed to get key "${key}" from plugin "${pluginId}"`,
};
