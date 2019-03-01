import Cdp from 'chrome-remote-interface';
import AWS from 'aws-sdk';
import fs from 'file-system';

export default async function captureAframe(hashId) {
  const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });

  const nodeAppears = async (client, selector) => {
    // browser code to register and parse mutations
    const browserCode = () => new Promise((fulfill) => {
      new MutationObserver((mutations, observer) => {
        // add all the new nodes
        const nodes = [];
        mutations.forEach((mutation) => {
          nodes.push(...mutation.addedNodes);
        });
        // fulfills if at least one node matches the selector
        if (nodes.find(node => node.matches('a#download'))) {
          observer.disconnect();
          fulfill();
        }
      }).observe(document.body, {
        childList: true,
      });
    });

    // inject the browser code
    const { Runtime } = client;
    await Runtime.evaluate({
      expression: `(${browserCode})(${JSON.stringify(selector)})`,
      awaitPromise: true,
    });
  };

  const [tab] = await Cdp.List();
  const client = await Cdp({ host: '127.0.0.1', target: tab });

  const { Network, Page } = client;

  await Promise.all([Network.enable(), Page.enable()]);

  await Page.navigate({
    url: `https://www.acidvr.com/liquidlyrics/capture/${hashId}.html`,
  });

  // wait for the element to be present
  await nodeAppears(client, '#download');
  await Page.setDownloadBehavior({
    behavior: 'allow',
    downloadPath: '/tmp',
  });
  const { Runtime } = client;
  const downloadLink = await Runtime.evaluate({
    expression: "document.querySelector('a#download').href",
  });

  const x = await Page.navigate({
    url: downloadLink.result.value,
  });

  console.log(x);

  Network.responseReceived(async ({ requestId, response }) => {
    console.log(requestId, response);
    const url = response ? response.url : null;
    if (url.indexOf('.webm') >= 0) {
      const { body, base64Encoded } = await Network.getResponseBody({ requestId });
      console.log(url, body, base64Encoded);
    }
  });

  const putFile = async () => {
    setTimeout(() => {
      const filePath = '/tmp/download.webm';
      const stream = fs.createReadStream(filePath);
      stream.setEncoding('binary');
      const params = {
        Bucket: 'app.acidvr.com-media-in',
        Key: `${hashId}.webm`,
        Body: stream,
        ContentType: 'video/webm',
      };
      const putObjectPromise = s3.putObject(params).promise();
      putObjectPromise
        .then(() => {
          console.log('Success');
          return true;
        }, 1000)
        .catch((err) => {
          console.log(err);
        });
    });
    return false;
  };

  // putFile();
  return null;
}
