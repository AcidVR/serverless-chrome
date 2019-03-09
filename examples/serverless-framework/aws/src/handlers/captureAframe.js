import log from '../utils/log';
import captureAframe from '../chrome/captureAframe';

export default async function handler(event, context, callback) {
  const queryStringParameters = event.queryStringParameters || {};
  const { hashId = 'W59XmZ5YvGn' } = queryStringParameters;

  let data;

  log('Capturing video for: ', hashId);

  try {
    data = await captureAframe(hashId);
    log('Completed Capturing video');

  } catch (error) {
    console.error('Error capturing video for', hashId, error);
    return callback(error);
  }

  return callback(null, {});
}
