// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IError {
  name: string;
  message: (...args: string[]) => string;
  link?: string;
}
