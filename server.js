const express = require('express')
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const fse = require('fs-extra')
const path = require('path')

const app = express()

app.use(express.static(__dirname + '/public'))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const UPLOAD_DIR = __dirname + '/public/upload'
const TMP_DIR = __dirname + '/temp'

// create upload folder if not exist
fse.existsSync(UPLOAD_DIR) || fse.mkdirsSync(UPLOAD_DIR)

// create temp folder if not exist
fse.existsSync(TMP_DIR) || fse.mkdirsSync(TMP_DIR)

app.post('/upload', (req, res) => {
  const form = new multiparty.Form({ uploadDir: 'temp' })
  form.parse(req)

  form.on('file', async(name, chunk) => {
    let chunkDir = `${UPLOAD_DIR}/${chunk.originalFilename.split('.')[0]}`
    if (!fse.existsSync(chunkDir))  {
      await fse.mkdirs(chunkDir)
    }

    let dPath = path.join(chunkDir, chunk.originalFilename.split('.')[1])
    await fse.move(chunk.path, dPath, { overwrite: true })

    res.send('upload success!')
    res.end();
  })

  form.on('error', (err) => {
    console.log('err', err)
    res.send('upload failed!')
  })
})

app.post('/merge', async(req, res) => {
  let name = req.body.name
  let chunkSize = req.body.chunkSize
  let fname = name.split('.')[0];
  let chunkDir = path.join(UPLOAD_DIR, fname)
  try{
    await streamMerge(chunkSize, chunkDir, path.join(UPLOAD_DIR, name))
    res.send({ msg: 'merge success', url: 'http://localhost:3000/upload/'+name })
  } catch(err) {
    res.send({ msg: 'merge failed' })
  } finally {
    // remove chunk files dir
    fse.removeSync(chunkDir)
  }
})


// concurrent merge
const streamMerge = async (chunkSize, chunkFilesDir, targetFile) => {
  const list = fse.readdirSync(chunkFilesDir);
  const fileList = list.sort((a, b) => a-b).map(nameIdx => [
    path.join(chunkFilesDir, nameIdx),
    nameIdx
  ])


  await Promise.all(fileList.map(async ([filePath, nameIdx]) => {
    const idx = +nameIdx
    const start = idx * chunkSize;

    const readStream = fse.createReadStream(filePath);
    // 指定位置寫入數據
    const writeStream = fse.createWriteStream(targetFile, {
      start,
    });

    return new Promise((resolve, reject) => {
      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      readStream.pipe(writeStream);
    });
  }));
}

app.listen(3000, () => {
  console.log('server is running at port 3000')
})