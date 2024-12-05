const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
let router = express.Router()
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    async function SeonPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let SeonPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!SeonPairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await SeonPairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            SeonPairWeb.ev.on('creds.update', saveCreds);
            SeonPairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        const sessionSeon = fs.readFileSync('./session/creds.json');

                        const auth_path = './session/';
                        const user_jid = jidNormalizedUser(SeonPairWeb.user.id);

                      function randomMegaId(length = 6, numberLength = 4) {
                      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                      let result = '';
                      for (let i = 0; i < length; i++) {
                      result += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                       const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                        return `${result}${number}`;
                        }

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);

                        const string_session = mega_url.replace('https://mega.nz/file/', '');

                        const sid = string_session;
                        let next = `SEON-MD-${sid}`
                        const dt = await SeonPairWeb.sendMessage(user_jid, {
                            text: next
                        });
                        let up = `❌ *Do not share this code with others. Use this to create the SEON-MD bot.*\n\n> 📱 *Github:* https://github.com/SEON-MD/SEON-MD-V1\n\n> 🔔 *Our Channel:* https://whatsapp.com/channel/0029VagDCZdH5JLr7Yd6Wz24`
                        const dts = await SeonPairWeb.sendMessage(user_jid, {
                            text: up
                        });

                    } catch (e) {
                        exec('pm2 restart Seon');
                    }

                    await delay(100);
                    return await removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    SeonPair();
                }
            });
        } catch (err) {
            exec('pm2 restart Seon-md');
            console.log("service restarted");
            SeonPair();
            await removeFile('./session');
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await SeonPair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart Seon');
});


module.exports = router;
