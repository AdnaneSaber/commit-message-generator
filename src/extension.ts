import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
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

      // First, get the current branch name
      exec("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }, (branchError, branchStdout, branchStderr) => {
        if (branchError) {
          vscode.window.showErrorMessage(`Error getting branch name: ${branchStderr}`);
          return;
        }

        const branchName = branchStdout.trim(); // Remove any extra whitespace

        exec(
          "git show --pretty=fuller --patch HEAD",
          { cwd: repoPath },
          (error, stdout, stderr) => {
            if (error) {
              vscode.window.showErrorMessage(`Error: ${stderr}`);
              return;
            }

            // GPT prompt template with branch name inserted
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
Commit Message: ${branchName}: <Your concise summary here>
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
      });
    }
  );

  const scriptPath = path.posix.join(context.extensionPath.replace(/\\/g, '/'), 'scripts', 'git_commands.sh');

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

        // After committing, log the comparison URL
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const repoPath = workspaceFolders[0].uri.fsPath;
          const { userName, repoName } = await getRepoDetails(repoPath);
          const branchName = await getCurrentBranchName(repoPath);

          if (userName && repoName && branchName) {
            const compareUrl = `https://github.com/${userName}/${repoName}/compare/${branchName}?expand=1`;
            console.log(compareUrl);
            vscode.window.showInformationMessage(`Comparison URL logged: ${compareUrl}`);
          }
        }
      } else {
        vscode.window.showErrorMessage("Commit message is required.");
      }
    }
  );

  context.subscriptions.push(disposableCopyLastCommitDiff);
  context.subscriptions.push(disposableGitCommitCustom);
  context.subscriptions.push(disposableGitCommitDefault);
}

// Function to get the current branch name
function getCurrentBranchName(repoPath: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    exec("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error getting branch name: ${stderr}`);
      }
      resolve(stdout.trim());
    });
  });
}

// Function to get the repository details (username and repo name)
function getRepoDetails(repoPath: string): Promise<{ userName: string, repoName: string }> {
  return new Promise((resolve, reject) => {
    exec("git config --get remote.origin.url", { cwd: repoPath }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error getting repository details: ${stderr}`);
        return;
      }

      const remoteUrl = stdout.trim();
      const regex = /github\.com[:/](.*)\/(.*)\.git/;
      const match = remoteUrl.match(regex);

      if (match && match[1] && match[2]) {
        resolve({
          userName: match[1],
          repoName: match[2]
        });
      } else {
        reject("Invalid GitHub remote URL format.");
      }
    });
  });
}

export function deactivate() {}
