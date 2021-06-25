// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { EncryptionProvider } from "@microsoft/teamsfx-api";

export class Encryption implements EncryptionProvider {
  private key: string;

  constructor(projectId: string) {
    this.key = projectId + "_teamsfx";
  }

  public encrypt(secret: string): string {
    return secret + "!!!";
  }

  public decrypt(cipher: string): string {
    return cipher.substr(0, cipher.length - 3);
  }
}
