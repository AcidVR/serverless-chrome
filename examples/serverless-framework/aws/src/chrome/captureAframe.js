import Cdp from 'chrome-remote-interface';
import AWS from 'aws-sdk';
import fs from 'fs';
import tar from 'tar-fs';
import FFmkek from 'ffmkek';

/*
function sleep(miliseconds = 1000) {
  if (miliseconds === 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(() => resolve(), miliseconds));
}

async function nodeAppears(client, selector) {
  // browser code to register and parse mutations
  const browserCode = selector => new Promise((resolve) => {
    new MutationObserver((mutations, observer) => {
      // add all the new nodes
      const nodes = [];
      mutations.forEach((mutation) => {
        nodes.push(...mutation.addedNodes);
      });
      // fulfills if at least one node matches the selector
      if (nodes.find(node => node.matches(selector))) {
        console.log('node.matches');
        observer.disconnect();
        resolve();
      }
    }).observe(document.querySelector('#downloadContainer'), {
      childList: true,
    });
  });
  // inject the browser code
  const { Runtime } = client;
  await Runtime.evaluate({
    expression: `(${browserCode})(${JSON.stringify(selector)})`,
    awaitPromise: true,
  });
}
*/

export default async function captureAframe(hashId) {
  /* const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 60;

  let loaded = false;
  const downloadComplete = false;

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100);
      await loading(startTime);
    }
  };


  const [tab] = await Cdp.List();
  const client = await Cdp({ host: '127.0.0.1', target: tab });

  const {
    Network, Page, Runtime,
  } = client;

  Page.loadEventFired(() => {
    console.log('Page.loadEventFired');
    loaded = true;
  });

  await Promise.all([Network.enable(), Page.enable(), Runtime.enable()]);


  await Page.navigate({
    url: `https://www.acidvr.com/liquidlyrics/capture/${hashId}.html`,
  });

  console.log('Downloaded page');

  await Page.loadEventFired();
  await loading();

  await Page.setDownloadBehavior({
    behavior: 'allow',
    downloadPath: '/tmp/download',
  });

  // wait for the element to be present
  await nodeAppears(client, 'div#download');
  console.log('download node appears');

  let fileCount = 0;
  const onExtractFinish = () => { console.log('FINISHED*****************************'); };


  // Loop through all the files in the temp directory
  fs.readdir('/tmp/download', (err, files) => {
    if (err) {
      console.error('Could not list the directory.', err);
      process.exit(1);
    }
    files.forEach((file) => {
      if (file.includes('tar')) {
        return fs.createReadStream(`/tmp/download/${file}`).pipe(tar.extract('/tmp/extracted', {
          dmode: 0o555, // all dirs should be readable
          fmode: 0o444, // all files should be readable
          finish: onExtractFinish,
          map(header) {
            header.type = 'file';
            header.linkname = '';
            return header;
          },
        }));
      }
      return false;
    });
  }); */

  const streamOut = `/tmp/out/${hashId}.mp4`;
  await new FFmkek()
    .addOption('-start_number', '3')
    .addOption('-framerate', '30')
    .addOption('-f', 'image2')
    .addOption('-s', '1920x1080')
    .addOption('-vsync', '1')
    .addInput('/tmp/extracted/%07d.jpg')
    .addInput('https://www.acidvr.com/videos/W59XmZ5YvGn.mp3')
    .addOption('-vcodec', 'libx264')
    .addOption('-crf', '25')
    .addOption('-pix_fmt', 'yuv420p')
    .addOption('-shortest')
    .addOption('-acodec', 'copy')
    .save(streamOut)
    .then((a) => console.log(`AAA: ${a}`))
    .catch(e => console.log(e));

  /* async function upload(fileStream, fileName, bucketName) {
    console.log(`Uploading video.\n${fileStream}\n${fileName}\n${bucketName}`);
    const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });
    const params = {
      Body: fs.createReadStream(streamOut),
      Key: fileName,
      Bucket: bucketName,
      ContentType: 'video/mp4',
    };
    await s3.putObject(params).promise();
  }

  const bucketName = 'app.acidvr.com-media-in';
  const putFile = async () => {
    upload(streamOut, `${hashId}.mp4`, bucketName);
  };

  if (downloadComplete) return putFile(); */
}
