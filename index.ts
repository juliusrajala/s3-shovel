import * as aws from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';

type ACLType =
  | 'private'
  | 'public-read'
  | 'public-read-write';

interface FileObject {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ACL: ACLType;
}

interface FileOptions {
  fileAccess: ACLType;
  bucket: string;
}

export interface BuildConfig {
  accessKeyId: string;
  accessSecret: string;
  buildDir: string;
}

function createFileObject(filePath: string, options: FileOptions): FileObject {
  const { fileAccess, bucket } = options;
  const fileContent = fs.readFileSync(filePath);
  return ({
    Key: filePath,
    Body: fileContent,
    ACL: fileAccess,
    Bucket: bucket,
  })
}

function readFilesInDir(options: FileOptions) {
  function readFiles(targetDir: string, fileList: FileObject [] = []) {
    fs.readdirSync(targetDir).forEach(file => {
      const filePath: string = path.join(targetDir, file);

      // Handle subfolders
      if (fs.statSync(filePath).isDirectory()) return readFiles(filePath, fileList);

      // Handle regular files
      const fileObject = createFileObject(filePath, options);
      fileList.push(fileObject);
    });

    return fileList;
  };

  return (targetDir, fileList?) => readFiles(targetDir, fileList);
}

function createBucket(options = {}) {
  return new aws.S3(options);
}

function uploadFilesToBucket(s3: aws.S3, fileList: FileObject []) {
  return new Promise((resolve, reject) => {
    fileList.map((item) => {
      s3.putObject(item, (err, data) => {
        if (err) reject(err);
        
      })
    })
  })
}

function uploadToS3(config: BuildConfig) {
  const s3 = createBucket();
  const getFilesWithOptions = readFilesInDir({
    fileAccess: 'public-read',
    bucket: config.accessKeyId,
  });

  Promise.resolve(getFilesWithOptions(config.buildDir))
    .then((fileList) => uploadFilesToBucket(s3, fileList))
    .then(console.log)
    .catch((err) => console.error(err));
}

// Function call for testing via ts-node
uploadToS3({
  accessKeyId: 'placeholder-id',
  accessSecret: 'placeholder-secret',
  buildDir: './mock/',
});

export default uploadToS3;
