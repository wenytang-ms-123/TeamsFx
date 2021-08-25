// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import {
  ConfigFolderName,
  LogProvider,
  Platform,
  PluginContext,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { asn1, md, pki } from "node-forge";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";

import { LocalDebugCertificate } from "./constants";
import * as ps from "./util/process";

const continueText = "Continue";
const learnMoreText = "Learn More";
const learnMoreUrl = "https://aka.ms/teamsfx-ca-certificate";
const warningMessage =
  'To debug applications in Teams, your localhost server must be on HTTPS.\
 For Teams to trust the self-signed SSL certificate used by the toolkit, a self-signed certificate must be added to your certificate store.\
 You may skip this step, but you\'ll have to manually trust the secure connection in a new browser window when debugging your apps in Teams.\
 For more information "https://aka.ms/teamsfx-ca-certificate".';
const confirmMessage =
  warningMessage +
  " You may be asked for your account credentials when installing the certificate.";

export interface LocalCertificate {
  certPath: string;
  keyPath: string;
  isTrusted: boolean;
}

export class LocalCertificateManager {
  private readonly ui?: UserInteraction;
  private readonly platform?: Platform;
  private readonly logger?: LogProvider;
  private readonly certFolder: string;

  constructor(ctx: PluginContext | undefined) {
    this.ui = ctx?.ui;
    this.logger = ctx?.logProvider;
    this.platform = ctx?.answers?.platform;
    this.certFolder = `${os.homedir()}/.${ConfigFolderName}/certificate`;
  }

  /**
   * Local certificates are located at {home}/.fx/certificate/
   * Public certificate should be trusted into user"s certificate store.
   *
   * - Check and generate cert and key files (subject, usage, expiration, ...)
   * - Check cert store if trusted (thumbprint, expiration)
   * - Add to cert store if not trusted (friendly name as well)
   */
  public async setupCertificate(needTrust: boolean): Promise<LocalCertificate> {
    const certFilePath = `${this.certFolder}/${LocalDebugCertificate.CertFileName}`;
    const keyFilePath = `${this.certFolder}/${LocalDebugCertificate.KeyFileName}`;
    const localCert: LocalCertificate = {
      certPath: certFilePath,
      keyPath: keyFilePath,
      isTrusted: false,
    };
    let certThumbprint: string | undefined = undefined;
    await fs.ensureDir(this.certFolder);

    this.logger?.info("Detecting/Verifying local certificate.");

    if ((await fs.pathExists(certFilePath)) && (await fs.pathExists(keyFilePath))) {
      const certContent = await fs.readFile(certFilePath, { encoding: "utf8" });
      const keyContent = await fs.readFile(keyFilePath, { encoding: "utf8" });
      const verifyRes = this.verifyCertificateContent(certContent, keyContent);
      if (verifyRes[1]) {
        certThumbprint = verifyRes[0];
      }
    }

    if (!certThumbprint) {
      // generate cert and key
      certThumbprint = await this.generateCertificate(certFilePath, keyFilePath);
    }

    if (needTrust) {
      if (certThumbprint && (await this.verifyCertificateInStore(certThumbprint))) {
        // already trusted
        localCert.isTrusted = true;
      } else {
        localCert.isTrusted = await this.trustCertificate(
          certFilePath,
          certThumbprint,
          LocalDebugCertificate.FriendlyName
        );
      }
    }

    return localCert;
  }

  private async generateCertificate(certFile: string, keyFile: string): Promise<string> {
    // prepare attributes and extensions
    const now = new Date();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    const serialNumber = uuidv4().replace(/-/g, "");
    const attrs = [
      {
        name: "commonName",
        value: "localhost",
      },
    ];
    const exts = [
      {
        name: "basicConstraints",
        cA: false,
      },
      {
        name: "extKeyUsage",
        serverAuth: true,
      },
      {
        name: "subjectAltName",
        altNames: [
          {
            type: 2, // DNS
            value: "localhost",
          },
        ],
      },
    ];

    // generate key and cert
    const keys = pki.rsa.generateKeyPair({
      bits: 4096,
      algorithm: "sha256",
    });
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = serialNumber;
    cert.validity.notBefore = now;
    cert.validity.notAfter = expiry;
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions(exts);
    cert.sign(keys.privateKey, md.sha256.create());

    // get thumbprint
    const der = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
    const m = md.sha1.create();
    m.update(der);
    const thumbprint = m.digest().toHex();

    // output
    const certContent = pki.certificateToPem(cert);
    const keyContent = pki.privateKeyToPem(keys.privateKey);
    await fs.writeFile(certFile, certContent, { encoding: "utf8" });
    await fs.writeFile(keyFile, keyContent, { encoding: "utf8" });

    this.logger?.info(`Local certificate generated to ${certFile}`);
    return thumbprint;
  }

  private verifyCertificateContent(
    certContent: string,
    keyContent: string
  ): [string | undefined, boolean] {
    const thumbprint: string | undefined = undefined;
    try {
      const cert = pki.certificateFromPem(certContent);
      const privateKey = pki.privateKeyFromPem(keyContent);

      // get thumbprint
      const der = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
      const m = md.sha1.create();
      m.update(der);
      const thumbprint = m.digest().toHex();

      // verify key pair
      const expectedPublicKey = pki.rsa.setPublicKey(privateKey.n, privateKey.e);
      if (pki.publicKeyToPem(expectedPublicKey) !== pki.publicKeyToPem(cert.publicKey)) {
        return [thumbprint, false];
      }

      // verify subject and issuer
      const subject = cert.subject.getField("CN");
      if ("localhost" !== subject.value) {
        return [thumbprint, false];
      }

      const issuer = cert.issuer.getField("CN");
      if ("localhost" !== issuer.value) {
        return [thumbprint, false];
      }

      // verify date, add one day buffer
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const notBefore = cert.validity.notBefore;
      const notAfter = cert.validity.notAfter;
      if (notBefore > now || notAfter < tomorrow) {
        return [thumbprint, false];
      }

      // verify extension
      const basicConstraints = cert.getExtension("basicConstraints") as {
        cA?: boolean;
      };
      if (
        basicConstraints === undefined ||
        basicConstraints.cA === undefined ||
        basicConstraints.cA
      ) {
        return [thumbprint, false];
      }

      const extKeyUsage = cert.getExtension("extKeyUsage") as {
        serverAuth?: boolean;
      };
      if (
        extKeyUsage === undefined ||
        extKeyUsage.serverAuth === undefined ||
        !extKeyUsage.serverAuth
      ) {
        return [thumbprint, false];
      }

      const subjectAltName = cert.getExtension("subjectAltName") as {
        altNames?: {
          type: number;
          value: string;
        }[];
      };
      if (
        subjectAltName === undefined ||
        subjectAltName.altNames === undefined ||
        !subjectAltName.altNames.some((a) => a.type === 2 && a.value === "localhost")
      ) {
        return [thumbprint, false];
      }

      return [thumbprint, true];
    } catch (error) {
      // treat any error as not verified, to not block the main progress
      return [thumbprint, false];
    }
  }

  private async verifyCertificateInStore(thumbprint: string): Promise<boolean> {
    try {
      if (os.type() === "Windows_NT") {
        const getCertCommand = `(Get-ChildItem -Path Cert:\\CurrentUser\\Root | Where-Object { $_.Thumbprint -match '${thumbprint}' }).Thumbprint`;
        const existingThumbprint = (await ps.execPowerShell(getCertCommand)).trim();
        return existingThumbprint.toUpperCase() === thumbprint.toUpperCase();
      } else if (os.type() === "Darwin") {
        const listCertCommand = `security find-certificate -c localhost -a -Z -p "${os.homedir()}/Library/Keychains/login.keychain-db"`;
        const existingCertificates = await ps.execShell(listCertCommand);
        if (existingCertificates) {
          const thumbprintRegex = /SHA-1 hash: ([0-9A-Z]+)/g;
          let match = undefined;
          while ((match = thumbprintRegex.exec(existingCertificates))) {
            const existingThumbprint = match[1];
            if (existingThumbprint.toUpperCase() === thumbprint.toUpperCase()) {
              return true;
            }
          }
        }

        return false;
      } else {
        // TODO: Linux
        return false;
      }
    } catch (error) {
      // treat any error as not verified, to not block the main progress
      this.logger?.debug(`Certificate unverified. Details: ${error}`);
      return false;
    }
  }

  private async trustCertificate(
    certPath: string,
    thumbprint: string,
    friendlyName: string
  ): Promise<boolean> {
    try {
      if (os.type() === "Windows_NT") {
        if (!(await this.waitForUserConfirm())) {
          return false;
        }

        const installCertCommand = `(Import-Certificate -FilePath '${certPath}' -CertStoreLocation Cert:\\CurrentUser\\Root)[0].Thumbprint`;
        const thumbprint = (await ps.execPowerShell(installCertCommand)).trim();

        const friendlyNameCommand = `(Get-ChildItem -Path Cert:\\CurrentUser\\Root\\${thumbprint}).FriendlyName='${friendlyName}'`;
        await ps.execPowerShell(friendlyNameCommand);

        return true;
      } else if (os.type() === "Darwin") {
        if (!(await this.waitForUserConfirm())) {
          return false;
        }

        await ps.execShell(
          `security add-trusted-cert -p ssl -k "${os.homedir()}/Library/Keychains/login.keychain-db" "${certPath}"`
        );

        return true;
      } else {
        // TODO: Linux
        return false;
      }
    } catch (error) {
      // treat any error as install failure, to not block the main progress
      this.logger?.warning(`Failed to install certificate. Error: ${error}`);
      return false;
    }
  }

  private showWarningMessage() {
    if (this.ui) {
      if (this.platform === Platform.CLI) {
        // no user interaction for CLI
        this.ui.showMessage("warn", warningMessage, false);
      } else {
        this.ui.showMessage("warn", warningMessage, false, learnMoreText).then((result) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === learnMoreText) {
            this.ui!.openUrl(learnMoreUrl);
          }
        });
      }
    }
  }

  private async waitForUserConfirm(): Promise<boolean> {
    if (this.ui) {
      let userSelected: string | undefined;
      do {
        const res = await this.ui.showMessage(
          "info",
          confirmMessage,
          true,
          learnMoreText,
          continueText
        );
        userSelected = res.isOk() ? res.value : undefined;
        if (userSelected === learnMoreText) {
          this.ui.openUrl(learnMoreUrl);
        }
      } while (userSelected === learnMoreText);
      return userSelected === continueText;
    }

    // No dialog, always return true;
    return true;
  }
}
