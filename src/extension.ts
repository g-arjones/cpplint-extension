'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as an from './runner';
import { Lint } from './lint';
import { analysisResult } from './lint'
import * as configuration from './configuration'
import { ConfigManager } from './configuration';

let disposables: Set<any>;
let outputChannel: vscode.OutputChannel;
let statusItem: vscode.StatusBarItem;
let timer: NodeJS.Timer;

let diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('cpplint');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('CppLint');
    // outputChannel.appendLine('CppLint is running.');
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "cpplint" is now active!');

    loadConfigure();

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let single = vscode.commands.registerCommand('cpplint.runAnalysis', runAnalysis);
    context.subscriptions.push(single);

    // workspace mode does not regist event
    let whole = vscode.commands.registerCommand('cpplint.runWholeAnalysis', runWholeAnalysis);
    context.subscriptions.push(whole);
}

function runAnalysis(): Promise<void> {
    var edit = vscode.window.activeTextEditor;
    if (!edit) {
        return Promise.reject("no edit opened");
    }
    let activedoc = vscode.window.activeTextEditor.document;
    let filename = activedoc.fileName;
    let workspacefolder = vscode.workspace.getWorkspaceFolder(activedoc.uri)
    let workspaces = null;
    if (workspacefolder != undefined) {
        workspaces = [workspacefolder.uri.fsPath]
    }

    outputChannel.show();
    outputChannel.clear();

    let start = 'CppLint started: ' + new Date().toString();
    outputChannel.appendLine(start);

    let result = an.runOnFile();
    outputChannel.appendLine(result);

    let end = 'CppLint ended: ' + new Date().toString();
    outputChannel.appendLine(end);

    // vscode.window.showInformationMessage(edit.document.uri.fsPath)
    return Promise.resolve()
}

function runWholeAnalysis(): Promise<void> {
    let workspaces: string[] = [];
    for (let folder of vscode.workspace.workspaceFolders) {
        workspaces = workspaces.concat(folder.uri.fsPath)
    }

    outputChannel.show();
    outputChannel.clear();

    let start = 'CppLint started: ' + new Date().toString();
    outputChannel.appendLine(start);

    let result = an.runOnWorkspace();
    outputChannel.appendLine(result);

    let end = 'CppLint ended: ' + new Date().toString();
    outputChannel.appendLine(end);

    // vscode.window.showInformationMessage(edit.document.uri.fsPath)
    return Promise.resolve()
}

// this method is called when your extension is deactivated
export function deactivate() {
    clearTimeout(timer)
    vscode.window.showInformationMessage("Cpplint deactivated")
}

function doLint() {
    if (vscode.window.activeTextEditor) {
        let language = vscode.window.activeTextEditor.document.languageId
        if (ConfigManager.getInstance().isSupportLanguage(language)) {
            if (ConfigManager.getInstance().isSingleMode()) {
                Lint(diagnosticCollection, false);
            } else {
                Lint(diagnosticCollection, true);
            }
        }
    }
    clearTimeout(timer)
}

function startLint() {
    timer = global.setTimeout(doLint, 1.5 * 1000);
}

function loadConfigure() {
    ConfigManager.getInstance().initialize();
    if (ConfigManager.getInstance().isSingleMode()) {
        doLint();
        vscode.window.onDidChangeActiveTextEditor((() => doLint()).bind(this));
        vscode.workspace.onDidSaveTextDocument((() => doLint()).bind(this));
    } else {
        // start timer to do workspace lint
        startLint();
        vscode.workspace.onDidSaveTextDocument((() => startLint()).bind(this));
    }
}
