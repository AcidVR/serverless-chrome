import Cdp from 'chrome-remote-interface'
import AWS from 'aws-sdk'
import fs from 'file-system'
import sleep from '../utils/sleep'

export default async function captureAframe(hashId) {
  const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 240
  const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' })
  let result
  let loaded = false

  const nodeAppears = async (client, selector) => {
    // browser code to register and parse mutations
    const browserCode = () =>
      new Promise(fulfill => {
        new MutationObserver((mutations, observer) => {
          // add all the new nodes
          const nodes = []
          mutations.forEach(mutation => {
            nodes.push(...mutation.addedNodes)
          })
          // fulfills if at least one node matches the selector
          if (nodes.find(node => node.matches('a#download'))) {
            observer.disconnect()
            fulfill()
          }
        }).observe(document.body, {
          childList: true,
        })
      })

    // inject the browser code
    const { Runtime } = client
    await Runtime.evaluate({
      expression: `(${browserCode})(${JSON.stringify(selector)})`,
      awaitPromise: true,
    })
  }

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100)
      await loading(startTime)
    }
  }

  const [tab] = await Cdp.List()
  const client = await Cdp({ host: '127.0.0.1', target: tab })

  const { Network, Page } = client

  Page.loadEventFired(() => {
    console.log('Page loaded')
    loaded = true
  })

  await Promise.all([Network.enable(), Page.enable()])

  await Page.navigate({
    url: `https://www.acidvr.com/liquidlyrics/capture/${hashId}.html`,
  })
  await Page.loadEventFired()
  await loading()

  // wait for the element to be present
  await nodeAppears(client, '#download')
  await Page.setDownloadBehavior({
    behavior: 'allow',
    downloadPath: '/tmp',
  })
  const { Runtime } = client
  await Runtime.evaluate({
    expression: "document.querySelector('a#download').click()",
  })

  const getRequestBody = async requestId => {
    try {
      const body = await this.protocol.Network.getResponseBody({ requestId })
      if (body.base64Encoded)
        return Buffer.from(body.body, 'base64').toString('utf-8')
      return body.body
    } catch (e) {
      return null
    }
  }

  const putFile = async () => {
    console.log('Upload attempt')
    setTimeout(() => {
      const filePath = '/tmp/download.webm'
      const stream = fs.createReadStream(filePath)
      stream.setEncoding('binary')
      const params = {
        Bucket: 'app.acidvr.com-media-in',
        Key: `${hashId}.webm`,
        Body: stream,
        ContentType: 'video/webm',
      }
      console.log(params)
      const putObjectPromise = s3.putObject(params).promise()
      putObjectPromise
        .then(() => {
          console.log('Success')
          return true
        }, 1000)
        .catch(err => {
          console.log(err)
        })
    })
    return false
  }

  putFile()
  return result
}
