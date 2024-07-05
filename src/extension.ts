import * as vscode from 'vscode';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	console.log('File Path Commenter is activating');
	outputChannel = vscode.window.createOutputChannel("File Path Commenter");
	outputChannel.appendLine('Extension is activating!');

	let disposable = vscode.commands.registerCommand('filePathCommenter.addRelativePathComment', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			addRelativePathComment(editor.document);
		}
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((document) => {
			console.log(`File opened: ${document.fileName}`);
			outputChannel.appendLine(`File opened: ${document.fileName}`);
			addRelativePathComment(document);
		})
	);

	// Handle switching between already open tabs
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				console.log(`Switched to editor: ${editor.document.fileName}`);
				outputChannel.appendLine(`Switched to editor: ${editor.document.fileName}`);
				addRelativePathComment(editor.document);
			}
		})
	);

	// Handle the case when the extension activates and there's already an open text editor
	if (vscode.window.activeTextEditor) {
		addRelativePathComment(vscode.window.activeTextEditor.document);
	}
}

async function addRelativePathComment(document: vscode.TextDocument) {
	console.log(`Attempting to add/update comment in: ${document.fileName}`);
	outputChannel.appendLine(`Attempting to add/update comment in: ${document.fileName}`);

	const filePath = document.fileName;
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

	if (workspaceFolder) {
		const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
		const newComment = getCommentSyntax(document.languageId) + relativePath;

		try {
			const editor = await vscode.window.showTextDocument(document);
			const firstLine = document.lineAt(0);
			const secondLine = document.lineCount > 1 ? document.lineAt(1) : null;

			// Check if there's an existing path comment
			const commentSyntax = getCommentSyntax(document.languageId);
			const existingCommentRegex = new RegExp(`^${escapeRegExp(commentSyntax)}.*`);

			if (existingCommentRegex.test(firstLine.text)) {
				// Update existing comment if it's different
				if (firstLine.text !== newComment) {
					await editor.edit(editBuilder => {
						editBuilder.replace(firstLine.range, newComment);
					});
					console.log(`Comment updated in ${document.fileName}`);
					outputChannel.appendLine(`Comment updated in ${document.fileName}`);
				} else {
					console.log(`Comment is up to date in ${document.fileName}`);
					outputChannel.appendLine(`Comment is up to date in ${document.fileName}`);
				}
			} else if (secondLine && existingCommentRegex.test(secondLine.text)) {
				// If the comment is on the second line (e.g., after a shebang), update it
				if (secondLine.text !== newComment) {
					await editor.edit(editBuilder => {
						editBuilder.replace(secondLine.range, newComment);
					});
					console.log(`Comment updated on second line in ${document.fileName}`);
					outputChannel.appendLine(`Comment updated on second line in ${document.fileName}`);
				} else {
					console.log(`Comment is up to date in ${document.fileName}`);
					outputChannel.appendLine(`Comment is up to date in ${document.fileName}`);
				}
			} else {
				// Add new comment if it doesn't exist
				await editor.edit(editBuilder => {
					editBuilder.insert(new vscode.Position(0, 0), newComment + '\n');
				});
				console.log(`Comment added to ${document.fileName}`);
				outputChannel.appendLine(`Comment added to ${document.fileName}`);
			}
		} catch (error) {
			console.error(`Error updating comment in ${document.fileName}:`, error);
			outputChannel.appendLine(`Error updating comment in ${document.fileName}: ${error}`);
		}
	} else {
		console.log(`No workspace folder found for ${document.fileName}`);
		outputChannel.appendLine(`No workspace folder found for ${document.fileName}`);
	}
}

// Helper function to escape special characters in a string for use in a regex
function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function getCommentSyntax(languageId: string): string {
	switch (languageId) {
		case 'javascript':
		case 'typescript':
		case 'java':
		case 'c':
		case 'cpp':
		case 'csharp':
		case 'objective-c':
			return '// ';
		case 'python':
		case 'shellscript':
			return '# ';
		case 'html':
			return '<!-- ';
		case 'css':
			return '/* ';
		case 'php':
			return '// ';
		case 'ruby':
			return '# ';
		case 'perl':
			return '# ';
		case 'lua':
			return '-- ';
		default:
			return '// ';
	}
}

export function deactivate() { }
