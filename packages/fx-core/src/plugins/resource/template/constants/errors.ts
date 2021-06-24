// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IError } from "../../commonUtils/interfaces/IError";

export const SuffixError: IError = {
  name: "SuffixError",
  message: (suffix: string) => `Length of suffix ${suffix} is too short.`,
};
