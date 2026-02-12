import express from 'express';
import { createWriteStream, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Busboy from 'busboy';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
// En desarrollo usa carpeta local, en producción usa variable de entorno
const uploadDir = process.env.UPLOAD_DIR || join(__dirname, 'uploads');
mkdirSync(uploadDir, { recursive: true });
app.use(express.static(uploadDir));


app.post('/upload', (req, res) => {
  const busboy = Busboy({ headers: req.headers });

  busboy.on('file', (fieldname, file, info) => {
    const { filename, encoding, mimeType } = info;
    const saveTo = join(uploadDir, filename);
    const writeStream = createWriteStream(saveTo);

    console.log(`Subiendo: ${filename} (${mimeType})`);
    file.pipe(writeStream);

    file.on('limit', () => {
      console.log('Archivo demasiado grande');
      writeStream.destroy();
      res.status(413).json({ error: 'Archivo demasiado grande' });
    });

    writeStream.on('finish', () => {
      const protocol = req.protocol;
      const host = req.get('host');
      const url = `${protocol}://${host}/${filename}`;

      res.json({
        success: true,
        file: {
          filename,
          path: url,
          size: writeStream.bytesWritten
        }
      });
    });

    writeStream.on('error', (err) => {
      console.error('Error escribiendo archivo:', err);
      res.status(500).json({ error: 'Error guardando archivo' });
    });
  });

  busboy.on('field', (name, value) => {
    console.log(`Campo ${name}: ${value}`);
  });

  busboy.on('error', (err) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Fallo en upload' });
  });

  req.pipe(busboy);
});

app.listen(3000, () => {
  console.log('Servidor en http://localhost:3000');
});
