import fs from 'fs';
import path from 'path';
import os from 'os';
import { app, ipcMain } from 'electron';
import log from 'electron-log';
import settings from 'electron-settings';
import {
    calculateMethod,
    checkEndpoint,
    checkRoutingRules,
    doesFileExist,
    hasLicense
} from '../lib/utils';
import packageJsonData from '../../../package.json';
import { binAssetsPath } from '../main';
import { wpVersion, sbVersion, helperVersion } from '../config';

export const logPath = path.join(app?.getPath('logs'), 'main.log');

export function readLogFile(value: string) {
    return new Promise((resolve, reject) => {
        fs.readFile(value, 'utf8', (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

export const logMetadata = () => {
    const method = settings.get('method');
    const proxyMode = settings.get('proxyMode');
    const license = settings.get('license');
    const endpoint = settings.get('endpoint');
    const routingRules = settings.get('routingRules');
    const asn = settings.get('asn');

    Promise.all([method, proxyMode, license, endpoint, routingRules, asn])
        .then((data) => {
            log.info('------------------------MetaData------------------------');
            log.info(`running on: ${process.platform} ${os.release()} ${process.arch}`);
            log.info(`at od: v${packageJsonData.version}`);
            log.info(`at wp: v${wpVersion}`);
            log.info(`at sb: v${sbVersion}`);
            log.info(`at hp: v${helperVersion}`);
            log.info(`ls assets/bin: ${fs.readdirSync(binAssetsPath)}`);
            log.info('method:', calculateMethod(data[0]));
            log.info('proxyMode:', data[1]);
            log.info('routingRules:', checkRoutingRules(data[4]));
            log.info('endpoint:', checkEndpoint(data[3]));
            log.info('asn:', data[5] ? data[5] : 'UNK');
            log.info('license:', hasLicense(data[2]));
            log.info(`exe: ${app.getPath('exe')}`);
            log.info(`userData: ${app.getPath('userData')}`);
            log.info(`logs: ${app.getPath('logs')}`);
            log.info('------------------------MetaData------------------------');
            // TODO add package type(exe/dev/rpm/dmg/zip/etc...) if possible
        })
        .catch((err) => {
            log.error(err);
        });
};

const parseLogDate = (logLine: string) => {
    const dateRegex =
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2})|(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/;
    const match = logLine.match(dateRegex);
    if (match) {
        if (match[1]) {
            return new Date(match[1]);
        } else if (match[2]) {
            return new Date(match[2]);
        }
    }
    return new Date(0);
};

ipcMain.on('get-logs', async (event) => {
    const wpLogPathExist = await doesFileExist(logPath);
    let wpLogs = '';
    if (wpLogPathExist) {
        wpLogs = String(await readLogFile(logPath));
    }
    const wpLogLines = wpLogs.split('\n');
    const allLogLines = [...wpLogLines]
        .filter((line) => line.trim() !== '')
        .sort((a, b) => {
            const dateA = parseLogDate(a);
            const dateB = parseLogDate(b);
            return dateA.getTime() - dateB.getTime();
        });
    const mergedLogs = allLogLines.join('\n');
    event.reply('get-logs', mergedLogs);
});
