var aws = require('aws-sdk');

var elastictranscoder = new aws.ElasticTranscoder();
var s3 = new aws.S3();

// return basename without extension
function basename(path) {
  return path.split('/').reverse()[0].split('.')[0];
}

// return output file name with timestamp and extension
function outputKey(name, ext) {
  return name + '.' + ext;
}

function isImage(url) {
  return (url.match(/\.(jpeg|jpg|gif|png)$/) !== null);
}

exports.handler = function (event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2));
  // Get the object from the event and show its content type
  var key = event.Records[0].s3.object.key;

  if (isImage(key)) {
    s3.getObject({Bucket: 'app.acidvr.com-media-in', Key: key}, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {

        s3.putObject({
            Bucket: 'app.acidvr.com',
            Key: 'videos/' + key,
            Body: data.Body,
            ACL: 'public-read',
            ContentType: 'image/jpeg'
          },

          function (err, data) {
            if (err) {
              console.log(err, err.stack); // an error occurred
              context.fail();
            } else {
              console.log(data);           // successful response
            }

          }
        );
      }
    });


  } else if (isWebM()) {
    Input: {
      Key: key
    },
    OutputKeyPrefix: 'videos/',

  }
  else {
    var params = {
      Input: {
        Key: key
      },
      OutputKeyPrefix: 'videos/',
      PipelineId: '1497491505678-65mxvo', /* test-web-transcoxder */

      Outputs: [
        {
          Key: outputKey(basename(key), 'mp4'),
          ThumbnailPattern: basename(key) + '_thumb-{count}',
          PresetId: '1497492044397-9f0blg', // web
        },
        {
          Key: basename(key) + '/600k/s',
          PresetId: '1351620000001-200040', // hls 600k
          SegmentDuration: '10'
        },
        {
          Key: basename(key) + '/1M/s',
          PresetId: '1351620000001-200030', // hls 1M
          SegmentDuration: '10'
        },
        {
          Key: basename(key) + '/2M/s',
          PresetId: '1351620000001-200010', // hls 2M
          SegmentDuration: '10'
        }
      ],

      Playlists: [
        {
          Name: basename(key),
          Format: 'HLSv3',
          OutputKeys: [basename(key) + '/600k/s', basename(key) + '/1M/s', basename(key) + '/2M/s']
        }
      ]
    };

    elastictranscoder.createJob(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        context.fail();
        return;
      }

      context.succeed();
    });
  }
};
