/* eslint prefer-destructuring: ["error", {AssignmentExpression: {array: true}}] */

'use strict';

const readline = require('readline');
const chalk = require('chalk');
const npc = require('node-package-configurator');
const publisher = require('apex-publish-static-files');

const validations = require('../util/validations');
const templates = require('../templates/templates');
const launch = require('./launch');

// Validates if an object is empty (true), otherwise (false)
const getAppID = function (appURL) {
	const paramString = appURL.substring(appURL.indexOf('f?p=') + 4).split(':');
	return paramString[0];
};

// Returns a connect string for SQLcl based on the project configuration
const getConnectString = function (publish, password) {
	let connectString;

	if (publish.connectionType === 'basic' && publish.basicType === 'sid') {
		connectString = `${publish.username}/${password}@${publish.host}:${publish.port}:${publish.sid}`;
	} else if (publish.connectionType === 'basic' && publish.basicType === 'service name') {
		connectString = `${publish.username}/${password}@${publish.host}:${publish.port}/${publish.serviceName}`;
	} else if (publish.connectionType === 'basic' && publish.basicType === 'tns') {
		connectString = `${publish.username}/${password}@${publish.host}:${publish.port}/${publish.tns}`;
	} else {
		connectString = publish.connectionString;
	}

	return connectString;
};

module.exports = function (args) {
	// Project is the first argument
	const project = args[0];
	// Checks command line syntax
	validations.cliProjectSyntax(project, 'apex-nitro publish <project>');
	// Get project configuration
	const config = npc.getConfig({
		modules: ['apex-nitro', 'afeb'],
		project,
		mapping: templates.mapping()
	});

	// Validates project SQLcl info
	validations.publish(config, project);

	// Launches the project and publishes the files
	const launchPublish = function (password) {
		launch([project], undefined, config, () => {
			console.log(chalk.cyan('...Now'), chalk.cyan.bold('publishing!'));
			publisher.publish({
				sqlclPath: config.publish.path,
				connectString: getConnectString(config.publish, password),
				directory: config.distFolder,
				appID: getAppID(config.appURL),
				destination: config.publish.destination,
				pluginName: config.publish.pluginName
			});
		});
	};

	// Validates if the project source folder contains anything
	if (validations.isSrcFolderValid(config)) {
		// If the password is not provided, let's prompt it to the user
		if (config.publish.connectionType === 'basic' && config.publish.password === undefined) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			rl.question('Enter your database schema password: ', answer => {
				launchPublish(answer);
				rl.close();
			});
		} else {
			launchPublish(config.publish.password);
		}
	}
};
