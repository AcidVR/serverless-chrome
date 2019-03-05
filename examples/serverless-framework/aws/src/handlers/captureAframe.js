import log from '../utils/log';
import captureAframe from '../chrome/captureAframe';

export default async function handler(event, context, callback) {
  const queryStringParameters = event.queryStringParameters || {};
  const { hashId = 'test_2' } = queryStringParameters;

  let data;

  log('Capturing video for', hashId);

  try {
    data = await captureAframe(hashId);
  } catch (error) {
    console.error('Error capturing video for', hashId, error);
    return callback(error);
  }

  return callback(null, {
    statusCode: 200,
    body: data,
    isBase64Encoded: true,
    headers: {
      'Content-Type': 'image/png',
    },
  });
}