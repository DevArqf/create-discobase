#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { intro, outro, confirm, text, select, spinner, note, log, isCancel, cancel } from '@clack/prompts';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const titleGradient = gradient(['#FF416C', '#FF4B2B']);
const successGradient = gradient(['#00b09b', '#96c93d']);
const infoGradient = gradient(['#667eea', '#764ba2']);

function installPackages(packages, destination) {
    return new Promise((resolve, reject) => {
        const command = `npm install ${packages.join(' ')}`;
        exec(command, { cwd: destination }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function createProject() {
    console.clear();

    // Display banner
    await new Promise((resolve) => {
        figlet.text('DISCOBASE', {
            font: 'ANSI Shadow'
        }, (err, data) => {
            if (!err) {
                console.log('\n' + titleGradient(data));
            }
            resolve();
        });
    });

    const welcomeGradient = gradient(['cyan', 'magenta']);
    intro(
        chalk.bold(welcomeGradient('🚀 Welcome to DiscoBase — Build Discord Bots Like a Pro'))
    );

    note(
        chalk.white.bold(
            'A modern, production-ready framework for building scalable Discord bots\n\n'
        ) +

        chalk.cyan('⚡ Core Capabilities\n') +
        chalk.green('• ') + chalk.white('Support for Discord.js v14\n') +
        chalk.green('• ') + chalk.white('Slash & Prefix command system\n') +
        chalk.green('• ') + chalk.white('Hot reload for commands, events & functions\n') +

        chalk.cyan('\n📊 Built-in Tools\n') +
        chalk.green('• ') + chalk.white('Admin dashboard with real-time insights\n') +
        chalk.green('• ') + chalk.white('MongoDB integration with Mongoose\n') +

        chalk.cyan('\n🛡 Production Ready\n') +
        chalk.green('• ') + chalk.white('Smart error handling & structured logging\n') +
        chalk.green('• ') + chalk.white('Event system, activity tracking & automation ready'),

        chalk.bold.magenta('✨ Why DiscoBase')
    );


    // Step 1: Ask about project location
    // Ask for version preference
    const versionChoice = await select({
        message: 'Which version would you like to use?',
        options: [
            { value: 'new', label: '🚀 Core Edition (Recommended)', hint: 'Clean, package-based, easy updates & optimized' },
            { value: 'old', label: '🧩 Source Edition (Advanced)', hint: 'Full source code, maximum control & customization' }
        ]
    });

    if (isCancel(versionChoice)) {
        cancel('Setup cancelled');
        process.exit(0);
    }

    const useCurrentDir = await select({
        message: 'Where would you like to create your project?',
        options: [
            { value: 'new', label: '📁 Create in a new folder' },
            { value: 'current', label: '📍 Use current directory' }
        ]
    });

    let projectName;
    let destination;

    if (useCurrentDir === 'new') {
        projectName = await text({
            message: 'What is your project name?',
            placeholder: 'my-discord-bot',
            validate: (value) => {
                if (!value) return 'Project name is required';
                if (value.length > 50) return 'Project name is too long';
                if (!/^[a-z0-9-_]+$/i.test(value)) return 'Use only letters, numbers, hyphens, and underscores';
            }
        });
        destination = path.join(process.cwd(), projectName);
    } else {
        projectName = path.basename(process.cwd());
        destination = process.cwd();
    }

    // Check if directory exists and is not empty
    if (fs.existsSync(destination) && fs.readdirSync(destination).length > 0) {
        log.error(`Directory ${chalk.yellow(projectName)} already exists and is not empty!`);
        outro(chalk.red('❌ Setup cancelled'));
        process.exit(1);
    }

    // Create directory if needed
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    // Ask about dashboard (for both versions)
    const includeDashboard = await confirm({
        message: 'Would you like to include the admin dashboard?',
        initialValue: true
    });

    if (isCancel(includeDashboard)) {
        cancel('Setup cancelled');
        process.exit(0);
    }

    // Ask about required packages (for both versions)
    const installRequired = await confirm({
        message: `Install required packages? ${chalk.gray('(discobase-core, discord.js, etc.)')} ${chalk.green('[Recommended]')}`,
        initialValue: true
    });

    if (isCancel(installRequired)) {
        cancel('Setup cancelled');
        process.exit(0);
    }

    // Ask about MongoDB (for both versions)
    const installMongoDB = await confirm({
        message: 'Install MongoDB support? (mongoose)',
        initialValue: true
    });

    if (isCancel(installMongoDB)) {
        cancel('Setup cancelled');
        process.exit(0);
    }

    // If old version selected, copy the template and handle dependencies
    if (versionChoice === 'old') {
        const s = spinner();
        s.start('Copying full source code template...');

        const oldTemplatePath = path.join(__dirname, 'create-discobase');

        // Copy everything except .git, node_modules, and setup files
        const itemsToCopy = fs.readdirSync(oldTemplatePath);

        for (const item of itemsToCopy) {
            if (item === '.git' || item === 'node_modules' || item === 'setup.mjs' || item === 'package-lock.json') {
                continue;
            }

            const sourcePath = path.join(oldTemplatePath, item);
            const destPath = path.join(destination, item);

            if (fs.statSync(sourcePath).isDirectory()) {
                fs.cpSync(sourcePath, destPath, { recursive: true });
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
        }

        s.stop('Full source code copied successfully!');

        // Remove dashboard if user doesn't want it
        if (!includeDashboard) {
            const dashboardPath = path.join(destination, 'admin');
            if (fs.existsSync(dashboardPath)) {
                fs.rmSync(dashboardPath, { recursive: true, force: true });
            }
        }

        // Install dependencies if requested
        if (installRequired) {
            const packages = ['discobase-core@latest', 'discord.js', 'nodemon', 'multer', 'figlet', 'micromatch', 'cli-progress', 'chalk@4', 'fs-extra', 'gradient-string', 'chokidar', 'axios', 'set-interval-async', 'boxen', '@clack/prompts'];
            if (installMongoDB) {
                packages.push('mongoose');
            }

            s.start(`Installing packages (${packages.length} packages)...`);
            await new Promise(resolve => setTimeout(resolve, 500));

            await new Promise((resolve, reject) => {
                exec(`cd "${destination}" && npm install ${packages.join(' ')}`, (error, stdout, stderr) => {
                    if (error) {
                        s.stop(chalk.yellow('Package installation failed'));
                        console.log(chalk.yellow('\n⚠️  Please install packages manually:'));
                        console.log(chalk.gray(`   cd ${projectName}`));
                        console.log(chalk.gray(`   npm install ${packages.join(' ')}`));
                        resolve();
                    } else {
                        s.stop('Packages installed successfully!');
                        resolve();
                    }
                });
            });
        }

        // Success message
        console.log('');

        const nextSteps = [
            useCurrentDir === 'new' ? `cd ${projectName}` : null,
            'Edit config.json with your bot token and bot ID',
            installMongoDB ? 'Add your MongoDB URL in config.json' : null
        ].filter(Boolean);
        
        let successMessage = successGradient('🎉 Project created successfully!\n');
        
        successMessage += '\n' + chalk.bold.white('Next steps:\n');
        nextSteps.forEach((step, i) => {
            successMessage += chalk.cyan(`  ${i + 1}. `) + chalk.white(step) + '\n';
        });
        
        successMessage += '\n' + chalk.bold.blue('Resources:\n');
        successMessage += chalk.cyan('  📚 Docs: https://www.discobase.site\n');
        successMessage += chalk.cyan('  💬 Discord: https://discord.gg/ethical-programmer-s-1188398653530984539\n');
        successMessage += chalk.cyan('  🐙 GitHub: https://github.com/ethical-programmer/create-discobase\n');
        
        note(successMessage, 'Setup Complete');
        
        outro(successGradient('Happy coding! 🚀'));
        process.exit(0);
    }

    // NEW VERSION - Start creating project (prompts already asked above)
    const s = spinner();

    s.start('Creating project structure...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create folder structure
    const folders = [
        'src/commands/Community',
        'src/messages/Community',
        'src/events',
        'src/functions',
        'src/schemas'
    ];

    folders.forEach(folder => {
        const folderPath = path.join(destination, folder);
        fs.mkdirSync(folderPath, { recursive: true });
    });

    s.stop('✅ Project structure created');

    s.start('Generating configuration files...');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create config.json
    const configJson = {
        bot: {
            token: "YOUR_BOT_TOKEN_HERE",
            id: "YOUR_BOT_ID_HERE",
            admins: ["ADMIN_USER_ID_1", "ADMIN_USER_ID_2"],
            ownerId: "YOUR_OWNER_ID_HERE",
            developerCommandsServerIds: ["DEV_SERVER_ID_1"]
        },
        database: {
            mongodbUrl: "YOUR_MONGODB_URL_HERE"
        },
        logging: {
            guildJoinLogsId: "GUILD_JOIN_LOGS_CHANNEL_ID",
            guildLeaveLogsId: "GUILD_LEAVE_LOGS_CHANNEL_ID",
            commandLogsChannelId: "COMMAND_LOGS_CHANNEL_ID",
            errorLogs: "YOUR_ERROR_WEBHOOK_URL_HERE"
        },
        prefix: {
            value: "!"
        }
    };
    fs.writeFileSync(path.join(destination, 'config.json'), JSON.stringify(configJson, null, 2));

    // Create discobase.json
    const discobaseJson = {
        errorLogging: { enabled: false },
        presence: {
            enabled: false,
            status: "dnd",
            interval: 10000,
            type: "PLAYING",
            names: ["with DiscoBase", "with commands", "with your server", "DiscoBase v3.0"],
            "//_streamingUrl_note": "!=! This is only for the STREAMING activity type !=!",
            streamingUrl: "https://www.twitch.tv/example",
            "//_customState_note": "!=! This is only for the CUSTOM activity type !=!",
            customState: "🚀 discobase!"
        },
        commandStats: {
            enabled: true,
            trackUsage: true,
            trackServers: true,
            trackUsers: true
        },
        activityTracker: {
            enabled: true,
            ignoredPaths: ["**/node_modules/**", ".git", ".gitignore", "discobase.json"]
        }
    };
    fs.writeFileSync(path.join(destination, 'discobase.json'), JSON.stringify(discobaseJson, null, 2));

    // Create example slash command
    const slashCommandContent = `//! This is a basic structure for a slash command in a discoBase using discord.js


const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    disabled: false,
    //! The 'data' property defines the slash command's structure using SlashCommandBuilder.
    data: new SlashCommandBuilder()
        //* Name of the slash command. In this case, the command will be '/ping'.
        .setName('ping')

        //* A short description of what the command does, shown when users type '/ping' in Discord.
        .setDescription('This is the ping command.'),

    //? Optional: Permissions that the bot requires to execute the command.
    //? botPermissions: ['SendMessages'], // Example: bot needs permission to send messages.

    //? Optional: Permissions that the user requires to use this command. Uncomment if needed.
    //? userPermissions: ['ManageMessages'], // Example: Only users with Manage Messages permission can use this command.

    //? Optional: Set this to true if only bot admins can use this command.
    //? adminOnly: true,

    //? Optional: Set this to true if only the bot owner can use this command.
    //? ownerOnly: true,

    //? Optional: Set this to true if only developers can use this command.
    //? devOnly: true, so if this true this slash command will only register for the server IDs you provided in config.json

    //? Optional: Cooldown period for the command in seconds to prevent spam.
    //? cooldown: 10,

    //? Optional: Useful for turning off buggy or incomplete commands without deleting the file.
    //? disabled: true,

    //? Optional: Only allow users with these role IDs to run this command
    //? requiredRoles: ['1400100100176478330', '987654321098765432'],

    //! The 'execute' function is where the main logic for the command is placed.
    async execute(interaction, client) {
        try {
            const ping = Date.now() - interaction.createdTimestamp;
            const latency = Math.abs(ping);
            const latencyFormatted = \`\${latency.toString().substring(0, 2)}ms\`;
            const emoji = "⏱️";

            await interaction.reply({ content: \`\${emoji} Pong! Latency is \${latencyFormatted}!\` });

        } catch (error) {
            console.error('An error occurred while executing the command:', error);
        }
    }
};

`;
    fs.writeFileSync(path.join(destination, 'src/commands/Community/ping.js'), slashCommandContent);

    // Create example prefix command
    const prefixCommandContent = `//! This is a basic structure for a prefix command in a discoBase using discord.js

const { execute } = require("../../commands/Community/ping");

module.exports = {
    disabled: false,
    //* Required: Command name, used to trigger the command. Example: !ping
    name: "ping",

    //* Required: A brief description of what the command does, useful for help commands.
    description: "This is the ping command.",

    //* Optional: Aliases are alternative names for the command. Example: !p will also trigger the ping command.
    aliases: ['p'],

    //? Optional: Permissions that the bot requires to execute the command.
    //? botPermissions: ['SendMessages'], // Example: bot needs permission to send messages.

    //? Optional: Permissions that the user requires to use this command. Uncomment if needed.
    //? userPermissions: ['ManageMessages'], // Example: Only users with Manage Messages permission can use this command.

    //? Optional: Set this to true if only bot admins can use this command.
    //? adminOnly: true,

    //? Optional: Set this to true if only the bot owner can use this command.
    //? ownerOnly: true,

    //? Optional: Set this to true if only developers can use this command.
    //? devOnly: true, so if this true this slash command will only register for the server IDs you provided in config.json

    //? Optional: Cooldown period for the command in seconds to prevent spam.
    //? cooldown: 10,


    //? Optional: Useful for turning off buggy or incomplete commands without deleting the file.
    //? disabled: true,

    //? Optional: Only allow users with these role IDs to run this command
    //? requiredRoles: ['1400100100176478330', '987654321098765432'],

    // The run function is the main logic that gets executed when the command is called.
    async execute (message, client, args) {
        const ping = Date.now() - message.createdTimestamp;

        const latency = Math.abs(ping);
        const latencyFormatted = \`\${latency.toString().substring(0, 2)}ms\`;
        const emoji = "⏱️";

        message.reply(\`\${emoji} Pong! Latency is \${latencyFormatted}!\`);
    },
};

`;
    fs.writeFileSync(path.join(destination, 'src/messages/Community/ping.js'), prefixCommandContent);

    // Create src/index.js
    let indexContent = `const { DiscoBase } = require('discobase-core');
const { GatewayIntentBits } = require('discord.js');
`;

    if (includeDashboard) {
        indexContent += `const path = require('path');
`;
    }

    indexContent += `
// Create DiscoBase instance
const bot = new DiscoBase({
    // You can customize client options here
    clientOptions: {
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages
        ]
    }
});

// Access the Discord client if needed
const client = bot.getClient();

// Add custom client event listeners here if needed
// client.on('clientReady', () => {
//     console.log('Custom ready event!');
// });

// Start the bot
bot.start();
`;

    if (includeDashboard) {
        indexContent += `
// Start the admin dashboard
client.once('clientReady', () => {
    const dashboardPath = path.join(__dirname, '../node_modules/discobase-core/admin/dashboard.js');
    require(dashboardPath)(client);
});
`;
    }

    if (includeDashboard) {
        indexContent += `
// Note: Dashboard will be available at http://localhost:3000 when the bot is running
`;
    }
    fs.writeFileSync(path.join(destination, 'src/index.js'), indexContent);

    // Create package.json
    const packageJson = {
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        description: "My Discord bot built with DiscoBase",
        main: "src/index.js",
        scripts: {
            start: "node src/index.js",
            dev: "nodemon src/index.js",
            generate: "node node_modules/discobase-core/cli.js",
            manage: "node node_modules/discobase-core/manage.js"
        },
        keywords: ["discord", "bot"],
        author: "",
        license: "ISC",
      
        devDependencies: {
            "nodemon": "^3.1.7"
        }
    };

    fs.writeFileSync(
        path.join(destination, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );

    // Create README
    const readmeContent = `# ${projectName}

Built with [DiscoBase](https://www.discobase.site) - A powerful Discord bot framework.

> **Note:** This project uses \`discobase-core\` package which contains the framework.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Configure your bot:
   - Edit \`config.json\` with your bot token and settings
   - Customize \`discobase.json\` for framework settings

3. Create your commands:
   - Slash commands in \`src/commands/\`
   - Prefix commands in \`src/messages/\`
   - Custom events in \`src/events/\`

4. Start your bot:
\`\`\`bash
npm start
\`\`\`

## Documentation

Visit [https://www.discobase.site](https://www.discobase.site) for full documentation.
`;

    fs.writeFileSync(path.join(destination, 'README.md'), readmeContent);

    s.stop('✅ Configuration files generated');

    // Install dependencies
    if (installRequired) {
        const packages = ['discobase-core@latest', 'discord.js', 'nodemon', 'multer', 'figlet', 'micromatch', 'cli-progress', 'chalk@4', 'fs-extra', 'gradient-string', 'chokidar', 'axios', 'set-interval-async', 'boxen', '@clack/prompts'];
        if (installMongoDB) {
            packages.push('mongoose');
        }
        if (includeDashboard) {
            packages.push('express', 'cors');
        }

        s.start(`Installing packages (${packages.length} packages)...`);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            await installPackages(packages, destination);
            s.stop(`✅ Installed ${packages.length} packages successfully`);
        } catch (error) {
            s.stop('❌ Failed to install dependencies');
            log.error('Failed to install dependencies. You can install them manually with: npm install');
        }
    } else {
        log.warn('Skipped package installation. Run npm install manually.');
    }

    // Success message
    console.log('');

    const nextSteps = [
        useCurrentDir === 'new' ? `cd ${projectName}` : null,
        'Edit config.json with your bot token and bot ID',
        installMongoDB ? 'Add your MongoDB URL in config.json' : null,
        'npm start'
    ].filter(Boolean);
    
    let successMessage = chalk.green.bold('✓ ') + chalk.white.bold('Project created successfully!\n\n');
    
    successMessage += chalk.cyan.bold('🚀 Next Steps:\n');
    nextSteps.forEach((step, i) => {
        successMessage += chalk.green(`  ${i + 1}. `) + chalk.white.bold(step) + '\n';
    });
    
   
    
    successMessage += '\n' + chalk.blue.bold('📚 Resources:\n');
    successMessage += chalk.white('  Documentation: ') + chalk.cyan.underline('https://www.discobase.site\n');
    successMessage += chalk.white('  Discord Server: ') + chalk.cyan.underline('https://discord.gg/ethical-programmer-s-1188398653530984539\n');
    successMessage += chalk.white('  GitHub: ') + chalk.cyan.underline('https://github.com/ethical-programmer/create-discobase\n');
    
    successMessage += '\n' + chalk.gray('─'.repeat(60)) + '\n';
    successMessage += chalk.green.bold('✓ ') + chalk.white('Ready to build your Discord bot!\n');
    
    note(successMessage, chalk.green.bold('Setup Complete'));
    
    outro(chalk.bold.cyan('✨ Happy coding! 🚀 Let\'s build something amazing!'));
}    

// Run the script
createProject().catch(error => {
    console.error(chalk.red('❌ An error occurred:'), error);
    process.exit(1);
});
