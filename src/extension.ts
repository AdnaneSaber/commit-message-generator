import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const disposableCopyLastCommitDiff = vscode.commands.registerCommand(
    "diffCopier.copyLastCommitDiff",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }

      const repoPath = workspaceFolders[0].uri.fsPath;

      exec(
        "git show --pretty=fuller --patch HEAD",
        { cwd: repoPath },
        (error, stdout, stderr) => {
          if (error) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            return;
          }

          // GPT prompt template
          const gptPrompt = `
### Prompt
Please generate a commit message and description for the following changes:

${stdout}

### Instructions
- Summarize the changes in a concise commit message.
- Provide a detailed description that includes:
  - An overview of what the commit does.
  - Any relevant technical details or motivations.
  - Highlight new features, fixes, or changes.

### Example Output
Commit Message: <BRANCH-NAME>: <Your concise summary here>
Description:
- <Detailed description here>
            `;

          // Copy the prompt to the clipboard
          vscode.env.clipboard.writeText(gptPrompt.trim());
          vscode.window.showInformationMessage(
            "Full last commit diff and prompt copied to clipboard. Paste the GPT response when ready."
          );

          // Prompt the user to input the GPT response
          vscode.window
            .showInputBox({
              prompt: "Paste the GPT response here:",
              placeHolder: "Type or paste the GPT-generated message here...",
            })
            .then((response) => {
              if (response) {
                vscode.env.clipboard.writeText(response);
                vscode.window.showInformationMessage(
                  "GPT response copied to clipboard."
                );
              }
            });
        }
      );
    }
  );
  const scriptPath = path.posix.join(context.extensionPath.replace(/\\/g, '/'), 'scripts', 'git_commands.sh');
  console.log(scriptPath.split('\\'));
  // Command to run `git_commit_default`
  const disposableGitCommitDefault = vscode.commands.registerCommand(
    "diffCopier.gitCommitDefault",
    () => {
      const terminal = vscode.window.createTerminal(`Git Commit Default`);
      terminal.show();
      terminal.sendText(`source ${scriptPath} && git_commit_default`);
    }
  );

  // Command to run `git_commit_custom`
  const disposableGitCommitCustom = vscode.commands.registerCommand(
    "diffCopier.gitCommitCustom",
    async () => {
      const commitMessage = await vscode.window.showInputBox({
        placeHolder: "Enter your commit message",
      });

      if (commitMessage) {
        const terminal = vscode.window.createTerminal(`Git Commit Custom`);
        terminal.show();
        terminal.sendText(
          `source ${scriptPath} && git_commit_custom "${commitMessage}"`
        );
      } else {
        vscode.window.showErrorMessage("Commit message is required.");
      }
    }
  );
  context.subscriptions.push(disposableCopyLastCommitDiff);
  context.subscriptions.push(disposableGitCommitCustom);
  context.subscriptions.push(disposableGitCommitDefault);
}

export function deactivate() {}
