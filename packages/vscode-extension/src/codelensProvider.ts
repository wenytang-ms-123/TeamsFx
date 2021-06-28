import * as vscode from "vscode";

/**
 * CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private userDataRegex: RegExp;
  private envRegex: RegExp;

  constructor() {
    this.userDataRegex = /fx-resource-[a-zA-Z\-]+\.[a-zA-Z\-_]+=(.*)/g;
    this.envRegex = /.+(?:SECRET|PASSWORD)=(.*)/g;
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (document.fileName.endsWith("userdata")) {
      return this.computeCodeLenses(document, this.userDataRegex);
    } else if (document.fileName.endsWith("env")) {
      return this.computeCodeLenses(document, this.envRegex);
    } else {
      return [];
    }
  }

  computeCodeLenses(
    document: vscode.TextDocument,
    secretRegex: RegExp
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    this.codeLenses = [];
    const text = document.getText();
    const regex = new RegExp(secretRegex);
    let matches;
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[1]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      // const range = document.getWordRangeAtPosition(position, new RegExp(secretRegex));
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + matches[1].length)
      );
      const command = {
        title: "descrypt secret",
        command: "fx-extension.decryptSecret",
        arguments: [matches[1], range],
      };
      if (range) {
        this.codeLenses.push(new vscode.CodeLens(range, command));
      }
    }
    return this.codeLenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens {
    return codeLens;
  }
}
