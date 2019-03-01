import Cdp from 'chrome-remote-interface';
import AWS from 'aws-sdk';
import fs from 'file-system';
import chokidar from 'chokidar';

function sleep(miliseconds = 1000) {
  if (miliseconds === 0)
    return Promise.resolve();
  return new Promise(resolve => setTimeout(() => resolve(), miliseconds))
}

async function nodeAppears(client, selector) {
  // browser code to register and parse mutations
  const browserCode = (selector) => {
    return new Promise((resolve) => {
      new MutationObserver((mutations, observer) => {
        // add all the new nodes
        const nodes = [];
        mutations.forEach((mutation) => {
          nodes.push(...mutation.addedNodes);
        });
        // fulfills if at least one node matches the selector
        if (nodes.find((node) => {
          return node.matches(selector)
        })) {
          observer.disconnect();
          resolve();
        }
      }).observe(document.querySelector('#downloadContainer'), {
        childList: true
      });
    });
  };
  // inject the browser code
  const { Runtime } = client;
  await Runtime.evaluate({
    expression: `(${browserCode})(${JSON.stringify(selector)})`,
    awaitPromise: true
  });
}

export default async function captureAframe(hashId) {
  const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 60

  let loaded = false;
  let downloadComplete = false;

  const watcher = chokidar.watch('/tmp', {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
  });

  watcher.on('add', path => {
    if (path.indexOf('.webm') > 0) downloadComplete = true;
  });

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100);
      await loading(startTime)
    }
  };

  const [tab] = await Cdp.List();
  const client = await Cdp({ host: '127.0.0.1', target: tab });

  const { Network, Page, Runtime } = client;

  Page.loadEventFired(() => {
    loaded = true
  });

  await Promise.all([Network.enable(), Page.enable()]);

  await Page.navigate({
    url: `https://www.acidvr.com/liquidlyrics/capture/${hashId}.html`,
  });

  await Page.loadEventFired();
  await loading();

  // wait for the element to be present
  await nodeAppears(client, 'a#download');
  await Runtime.evaluate({
    expression: 'document.querySelector(\'a#download\').click()',
  });

  await Page.setDownloadBehavior({
    behavior: 'allow',
    downloadPath: '/tmp',
  });

  let waitTime = 0;
  while (!downloadComplete && waitTime < 60000) {
    await sleep();
    waitTime += 1000;
    console.log(`Wait time: ${waitTime}`);
  }

  const putFile = async () => {
    const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });
    const filePath = '/tmp/download.webm';
    const stream = fs.createReadStream(filePath);
    stream.setEncoding('binary');
    const params = {
      Bucket: 'app.acidvr.com-media-in',
      Key: `${hashId}.webm`,
      Body: stream,
      ContentType: 'video/webm',
    };
    console.log('\n\n\n**********************************');
    console.log(params);
    console.log('\n\n\n**********************************');
    const putObjectPromise = s3.putObject(params).promise();
    putObjectPromise
      .then(() => {
        console.log('Success');
        return true;
      }, 1000)
      .catch((err) => {
        console.log(err);
        return false;
      });
  };

  if (downloadComplete) putFile();
  return null;
}
