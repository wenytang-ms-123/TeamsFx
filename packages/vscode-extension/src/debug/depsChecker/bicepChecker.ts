import { DepsInfo, IDepsAdapter, IDepsChecker, IDepsLogger, IDepsTelemetry } from "./checker";
import { AxiosInstance, AxiosResponse, default as axios } from "axios";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { cpUtils } from "./cpUtils";

import { finished } from "stream";
import {
  defaultHelpLink,
  DepsCheckerEvent,
  isMacOS,
  isWindows,
  Messages,
  TelemtryMessages,
} from "./common";
import { DepsCheckerError } from "./errors";

export const BicepName = "Bicep";
export const supportedVersions: Array<string> = ["v0.4"];
export const installVersion = "";

const timeout = 5 * 60 * 1000;

export class BicepChecker implements IDepsChecker {
  private readonly _adapter: IDepsAdapter;
  private readonly _logger: IDepsLogger;
  private readonly _telemetry: IDepsTelemetry;
  private readonly _axios: AxiosInstance;

  constructor(adapter: IDepsAdapter, logger: IDepsLogger, telemetry: IDepsTelemetry) {
    this._adapter = adapter;
    this._logger = logger;
    this._telemetry = telemetry;
    this._axios = axios.create({
      headers: { "content-type": "application/json" },
    });
  }

  public async getDepsInfo(): Promise<DepsInfo> {
    return {
      name: BicepName,
      isLinuxSupported: true,
      installVersion: `${installVersion}`,
      supportedVersions: supportedVersions,
      details: new Map<string, string>(),
    };
  }

  public async isEnabled(): Promise<boolean> {
    const isBicepEnabled: boolean = await this._adapter.bicepCheckerEnabled();
    if (!isBicepEnabled) {
      this._telemetry.sendEvent(DepsCheckerEvent.bicepCheckSkipped);
    }
    return isBicepEnabled;
  }

  public async isInstalled(): Promise<boolean> {
    // always install private bicep even if global bicep exists.
    if (this.isVersionSupported(await this.queryVersionSilently("bicep"))) {
      this._telemetry.sendEvent(DepsCheckerEvent.bicepAlreadyInstalled);
    }

    const privateVersion = await this.queryVersionSilently(this.getBicepExecPath());
    if (this.isVersionSupported(privateVersion)) {
      // avoid missing this event
      this._telemetry.sendEvent(DepsCheckerEvent.bicepInstallCompleted);
      return true;
    }

    return false;
  }

  public async install(): Promise<void> {
    await this.cleanup();

    await this.installBicep();

    if (!(await this.validate())) {
      await this.handleInstallFailed();
    }
    await this.handleInstallCompleted();
  }

  private async cleanup() {
    try {
      await fs.emptyDir(this.getBicepInstallDir());
    } catch (err) {
      await this._logger.debug(
        `Failed to clean up path: ${this.getBicepInstallDir()}, error: ${err}`
      );
    }
  }

  private async installBicep(): Promise<void> {
    try {
      await this._telemetry.sendEventWithDuration(
        DepsCheckerEvent.bicepInstallScriptCompleted,
        async () => await this._adapter.runWithProgressIndicator(this.doInstallBicep)
      );
    } catch (err) {
      this._telemetry.sendSystemErrorEvent(
        DepsCheckerEvent.bicepInstallScriptError,
        TelemtryMessages.failedToInstallBicep,
        err
      );
    }
  }

  private async doInstallBicep() {
    const response: AxiosResponse<Array<{ tag_name: string }>> = await this._axios.get(
      "https://api.github.com/repos/Azure/bicep/releases",
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    const selectedVersion: string = response.data
      .map((t) => t.tag_name)
      .filter(this.isVersionSupported)
      .sort((v1, v2) => v2.localeCompare(v1))[0];
    const installDir = this.getBicepExecPath();

    await this._logger.info(
      Messages.downloadBicep
        .replace("@NameVersion", `Bicep ${selectedVersion}`)
        .replace("@InstallDir", installDir)
    );
    const axiosResponse = await this._axios.get(
      `https://github.com/Azure/bicep/releases/download/${selectedVersion}/${this.getBicepBitSuffixName()}`,
      {
        timeout: timeout,
        timeoutErrorMessage: "Failed to download bicep by http request timeout",
      }
    );

    const bicepWriter = fs.createWriteStream(installDir);
    axiosResponse.data.pipe(bicepWriter);

    finished(bicepWriter, (err?: NodeJS.ErrnoException | null) => {
      if (err) throw err;
    });
  }

  private async validate(): Promise<boolean> {
    let isVersionSupported = false;
    let privateVersion = "";
    try {
      privateVersion = await this.queryVersion(this.getBicepExecPath());
      isVersionSupported = this.isVersionSupported(privateVersion);
    } catch (err) {
      this._telemetry.sendSystemErrorEvent(
        DepsCheckerEvent.bicepValidationError,
        TelemtryMessages.failedToValidateBicep,
        err
      );
    }

    if (!isVersionSupported) {
      this._telemetry.sendEvent(DepsCheckerEvent.bicepValidationError, {
        "bicep-private-version": privateVersion,
      });
    }

    return isVersionSupported;
  }

  private async handleInstallCompleted() {
    this._telemetry.sendEvent(DepsCheckerEvent.bicepInstallCompleted);
    await this._logger.info(
      Messages.finishInstallBicep.replace("@NameVersion", await this.getDisPlayNameVersion())
    );
  }

  private async handleInstallFailed(): Promise<void> {
    await this.cleanup();
    this._telemetry.sendEvent(DepsCheckerEvent.bicepInstallError);
    throw new DepsCheckerError(
      Messages.failToInstallBicep.split("@NameVersion").join(await this.getDisPlayNameVersion()),
      defaultHelpLink
    );
  }

  private async getDisPlayNameVersion(): Promise<string> {
    return `Bicep ${await this.queryVersionSilently(this.getBicepExecPath())}`;
  }

  private isVersionSupported(version: string): boolean {
    return supportedVersions.some((supported) => version.includes(supported));
  }

  private async queryVersionSilently(path: string): Promise<string> {
    try {
      return this.queryVersion(path);
    } catch (e) {
      // do nothing
      return "";
    }
  }

  public async getBicepCommand(): Promise<string> {
    if (await this.isInstalled()) {
      return this.getBicepExecPath();
    }
    return "bicep";
  }

  private getBicepExecPath(): string {
    return path.join(this.getBicepInstallDir(), this.getBicepFileName());
  }

  private getBicepFileName(): string {
    if (isWindows()) {
      return "bicep.exe";
    }
    return "bicep";
  }

  private getBicepBitSuffixName(): string {
    if (isWindows()) {
      return "bicep-win-x64.exe";
    }
    if (isMacOS()) {
      return "bicep-osx-x64";
    }
    return "bicep-linux-x64";
  }

  private getBicepInstallDir(): string {
    // TODO: fix it after testing
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "bicep のtestتست@#");
  }

  private async queryVersion(path: string): Promise<string> {
    const output = await cpUtils.executeCommand(
      undefined,
      this._logger,
      { shell: false },
      path,
      "--version"
    );
    const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
    const match = regex.exec(output);
    if (!match) {
      return "";
    }
    return `v${match.groups?.major_version}.${match.groups?.minor_version}.${match.groups?.patch_version}`;
  }
}
