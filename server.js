const express = require("express");
const puppeteer = require("puppeteer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

app.post("/record", async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).send("URL missing");

  const outputPath = path.join(__dirname, "output", "recording.mp4");
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--window-size=1280,720"
      ],
      defaultViewport: {
        width: 1280,
        height: 720
      }
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const ffmpegCmd =
      `ffmpeg -y -video_size 1280x720 -f x11grab -i :0 -t 10 ${outputPath}`;

    exec(ffmpegCmd, async (err) => {
      await browser.close();

      if (err) return res.status(500).send("Recording failed");

      res.download(outputPath);
    });

  } catch (e) {
    console.log("ERROR =>", e);
    res.status(500).send("Internal server error");
  }
});

app.listen(3000, () => console.log("Server started on port 3000"));
