import log from '../utils/log';
import captureAframe from '../chrome/captureAframe';

// return basename without extension
const basename = path => path.split('/').reverse()[0].split('.')[0];

export default async function handler(event, context, callback) {
  const hashId = 'W59XmZ5YvGn'; // basename(event.Records[0].s3.object.key);

  log('Capturing video for: ', hashId);

  try {
    await captureAframe(hashId);
    log('Completed Capturing video');
  } catch (error) {
    console.error('Error capturing video for', hashId, error);
    return callback(error);
  }

  return callback(null, {});
}
