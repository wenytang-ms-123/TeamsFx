import { DepsInfo, IDepsAdapter, IDepsChecker, IDepsLogger, IDepsTelemetry } from "./checker";
import { AxiosInstance, AxiosResponse, default as axios } from "axios";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import { cpUtils } from "./cpUtils";

import { finished } from "stream";
import { isMacOS, isWindows } from "./common";

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

  public async install(): Promise<void> {
    // install
    await fs.ensureDir(this.getBicepInstallDir());

    const response: AxiosResponse<Array<{ tag_name: string }>> = await this._axios.get(
      "https://api.github.com/repos/Azure/bicep/releases",
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    const selectedVersion: string = response.data
      .map((t) => t.tag_name)
      .filter(this.isVersionSupported)
      .sort((v1, v2) => v2.localeCompare(v1))[0];

    const axiosResponse = await this._axios.get(
      `https://github.com/Azure/bicep/releases/download/${selectedVersion}/${this.getBicepBitSuffixName()}`,
      { timeout: timeout, timeoutErrorMessage: "Failed to download bicep by http request timeout" }
    );
    const bicepWriter = fs.createWriteStream(this.getBicepExecPath());
    axiosResponse.data.pipe(bicepWriter);

    finished(bicepWriter, (err?: NodeJS.ErrnoException | null) => {
      if (err) {
        this._logger.error(`Failed to write bicep bits, err = ${err}`);
        // this._telemetry.sendEvent()
      } else {
        this._logger.debug(`Write bicep bits successfully`);
        // this._telemetry.sendEvent()
      }
    });

    // validate
    if (!(await this.isInstalled())) {
      await fs.emptyDir(this.getBicepInstallDir());
      // this._telemetry.sendEvent()
      await this._logger.info(
        `Failed to validate bicep version, version = ${await this.queryVersionSilently(
          this.getBicepExecPath()
        )}`
      );
    }
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
    return `${match.groups?.major_version}.${match.groups?.minor_version}.${match.groups?.patch_version}`;
  }

  public async getBicepCommand(): Promise<string> {
    if (await this.isInstalled()) {
      return this.getBicepExecPath();
    }
    if (this.isVersionSupported(await this.queryVersionSilently("bicep"))) {
      // this._telemetry.sendEvent();
    } else {
      // this._telemetry.sendEvent();
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

  isEnabled(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async isInstalled(): Promise<boolean> {
    const version = await this.queryVersionSilently(this.getBicepExecPath());
    return this.isVersionSupported(version);
  }
}
