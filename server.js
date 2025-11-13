const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());

app.post("/record", async (req, res) => {
    const url = req.body.url;
    if (!url) return res.status(400).send("URL missing");

    const output = path.join(__dirname, "output", "recording.webm");
    if (fs.existsSync(output)) fs.unlinkSync(output);

    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--enable-usermedia-screen-capturing",
                "--auto-select-desktop-capture-source=screen",
                "--disable-infobars",
                "--window-size=1280,720"
            ]
        });

        const page = await browser.newPage();
        const client = await page.target().createCDPSession();

        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: "networkidle2" });

        // Start recording
        await client.send("Page.startScreencast", { format: "webm", quality: 80 });

        const chunks = [];

        client.on("Page.screencastFrame", async (frame) => {
            chunks.push(Buffer.from(frame.data, "base64"));
            await client.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
        });

        // Record for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Stop recording
        await client.send("Page.stopScreencast");
        await browser.close();

        fs.writeFileSync(output, Buffer.concat(chunks));

        return res.download(output);

    } catch (err) {
        console.error("ERROR:", err);
        return res.status(500).send("Recording failed");
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
