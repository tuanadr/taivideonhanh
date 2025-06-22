import express, { Request, Response } from 'express';
import sequelize from './config/database';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import contentDisposition from 'content-disposition';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running!');
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    await sequelize.sync(); // Sync all models
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

app.post('/api/info', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).send({ error: 'URL is required' });
  }

  const ytdlp = spawn('yt-dlp', ['--dump-json', url]);

  let jsonData = '';
  let errorData = '';

  ytdlp.stdout.on('data', (data) => {
    jsonData += data.toString();
  });

  ytdlp.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  ytdlp.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
      console.error(`stderr: ${errorData}`);
      return res.status(500).send({ error: 'Failed to fetch video info', details: errorData });
    }

    try {
      const info = JSON.parse(jsonData);
      res.send({
        title: info.title,
        thumbnail: info.thumbnail,
        formats: info.formats.map((f: any) => ({
          format_id: f.format_id,
          resolution: f.resolution || null,
          ext: f.ext,
          fps: f.fps,
          acodec: f.acodec,
          vcodec: f.vcodec,
          filesize: f.filesize,
          format_note: f.format_note
        })),
      });
    } catch (parseError) {
      console.error('Error parsing yt-dlp output:', parseError);
      res.status(500).send({ error: 'Failed to parse video info' });
    }
  });
});

app.post('/api/download', (req: Request, res: Response) => {
  const { url, format_id, title, ext } = req.body;

  if (!url || !format_id) {
    return res.status(400).send({ error: 'URL and format_id are required' });
  }

  const fileName = title ? `${title}.${ext || 'mp4'}` : 'video.mp4';
  res.setHeader('Content-Disposition', contentDisposition(fileName));
  res.header('Content-Type', 'video/mp4'); // Adjust content type if needed based on ext

  const args = ['-f', `${format_id}+bestaudio`, '--merge-output-format', 'mp4', '-o', '-', url];
  console.log(`Running yt-dlp with args: ${args.join(' ')}`);

  const ytdlp = spawn('yt-dlp', args);

  ytdlp.stdout.pipe(res);

  let errorData = '';
  ytdlp.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  ytdlp.on('error', (err) => {
    console.error('Failed to start yt-dlp process:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start download process', details: err.message });
    }
    res.end();
  });

  ytdlp.on('close', (code) => {
    console.log(`yt-dlp process exited with code ${code}.`);
    if (errorData) {
      console.error(`yt-dlp stderr: ${errorData}`);
    }
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({ error: 'Failed to download video', details: errorData });
    }
    res.end();
  });

  // Let's keep this commented out for now to ensure downloads complete
  // req.on('close', () => {
  //     ytdlp.kill();
  // });
});