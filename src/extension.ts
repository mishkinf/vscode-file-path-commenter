// src/extension.ts
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

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				console.log(`Switched to editor: ${editor.document.fileName}`);
				outputChannel.appendLine(`Switched to editor: ${editor.document.fileName}`);
				addRelativePathComment(editor.document);
			}
		})
	);

	if (vscode.window.activeTextEditor) {
		addRelativePathComment(vscode.window.activeTextEditor.document);
	}
}

function isFileInIncludedPaths(filePath: string, workspacePath: string): boolean {
	const config = vscode.workspace.getConfiguration('filePathCommenter');
	const includePaths: string[] = config.get('includePaths') || ['src'];

	const relativePath = path.relative(workspacePath, filePath);
	const result = includePaths.some(includePath => {
		const normalizedIncludePath = path.normalize(includePath);
		const normalizedRelativePath = path.normalize(relativePath);
		return normalizedRelativePath === normalizedIncludePath ||
			normalizedRelativePath.startsWith(normalizedIncludePath + path.sep);
	});

	console.log(`File: ${filePath}, Workspace: ${workspacePath}, Include Paths: ${includePaths.join(', ')}, Result: ${result}`);
	outputChannel.appendLine(`File: ${filePath}, Workspace: ${workspacePath}, Include Paths: ${includePaths.join(', ')}, Result: ${result}`);

	return result;
}

async function addRelativePathComment(document: vscode.TextDocument) {

	console.log(`Checking file: ${document.fileName}`);
	outputChannel.appendLine(`Checking file: ${document.fileName}`);

	const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
	if (!workspaceFolder) {
		console.log(`No workspace folder found for ${document.fileName}`);
		outputChannel.appendLine(`No workspace folder found for ${document.fileName}`);
		return;
	}

	if (!isFileInIncludedPaths(document.fileName, workspaceFolder.uri.fsPath)) {
		console.log(`File not in included paths: ${document.fileName}`);
		outputChannel.appendLine(`File not in included paths: ${document.fileName}`);
		return;
	}

	const commentSyntax = getCommentSyntax(document.languageId);
	const commentClosingSyntax = getCommentClosingSyntax(document.languageId);
	if (commentSyntax === null) {
		console.log(`Unsupported file type: ${document.languageId}`);
		outputChannel.appendLine(`Unsupported file type: ${document.languageId}`);
		return;
	}

	console.log(`Attempting to add/update comment in: ${document.fileName}`);
	outputChannel.appendLine(`Attempting to add/update comment in: ${document.fileName}`);

	const config = vscode.workspace.getConfiguration('filePathCommenter');
	const pathSeparatorSetting = config.get<string>('pathSeparator') || 'auto';
	let pathSeparator: string;

	switch (pathSeparatorSetting) {
		case 'forward':
			pathSeparator = '/';
			break;
		case 'backward':
			pathSeparator = '\\';
			break;
		default: // 'auto'
			pathSeparator = path.sep; // Use the system's default
			break;
	}

	let relativePath = path.relative(workspaceFolder.uri.fsPath, document.fileName);

	if (pathSeparator !== path.sep) {
		relativePath = relativePath.split(path.sep).join(pathSeparator);
	}
	const newComment = `${commentSyntax}${relativePath}${commentClosingSyntax}`;

	try {
		const editor = await vscode.window.showTextDocument(document);
		const firstLine = document.lineAt(0);
		const secondLine = document.lineCount > 1 ? document.lineAt(1) : null;

		const existingCommentRegex = new RegExp(`^${escapeRegExp(commentSyntax)}.*`);

		if (existingCommentRegex.test(firstLine.text)) {
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
}
function getCommentSyntax(languageId: string): string | null {
	switch (languageId) {
		case 'javascript':
		case 'javascriptreact':
		case 'typescript':
		case 'typescriptreact':
		case 'java':
		case 'c':
		case 'cpp':
		case 'csharp':
		case 'objective-c':
		case 'swift':
		case 'go':
		case 'dart':
			return '// ';
		case 'python':
		case 'shellscript':
		case 'yaml':
		case 'dockerfile':
			return '# ';
		case 'html':
		case 'xml':
		case 'svg':
		case 'svelte':
			return '<!-- ';
		case 'css':
		case 'scss':
		case 'less':
			return '/* ';
		case 'php':
			return '// ';
		case 'ruby':
			return '# ';
		case 'perl':
			return '# ';
		case 'lua':
			return '-- ';
		case 'vb':
			return "' ";
		case 'sql':
			return '-- ';
		default:
			return null; // Return null for unsupported file types
	}
}

function getCommentClosingSyntax(languageId: string): string | null {
	switch (languageId) {
		case 'html':
		case 'xml':
		case 'svg':
		case 'svelte':
			return ' -->';
		case 'css':
		case 'scss':
		case 'less':
			return ' */';
		default:
			return ''; // No closing syntax for single-line comment languages
	}
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function deactivate() { }
