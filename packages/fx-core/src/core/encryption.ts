// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { EncryptionProvider } from "@microsoft/teamsfx-api";
import Cryptr from "cryptr";

export class Encryption implements EncryptionProvider {
  private cryptr: Cryptr;

  constructor(projectId: string) {
    this.cryptr = new Cryptr(projectId + "_teamsfx");
  }

  public encrypt(secret: string): string {
    return this.cryptr.encrypt(secret);
  }

  public decrypt(cipher: string): string {
    try {
      return this.cryptr.decrypt(cipher);
    } catch (e) {
      // legacy raw secret string
      return cipher;
    }
  }
}
