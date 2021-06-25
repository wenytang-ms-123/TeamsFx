// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/**
 * Encrypt/decrypt secrets
 */
export interface EncryptionProvider {
  /**
   * Encrypt string
   * @param secret - original secret string
   */
  encrypt(secret: string): string;

  /**
   * Decrypt cipher string
   * @param cipher - encrypted string
   */
  decrypt(cipher: string): string;
}
