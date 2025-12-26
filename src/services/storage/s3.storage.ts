import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { IStorage, FileStats } from './storage.interface';
import { getEnvConfig } from '../../utils/env';

/**
 * S3 对象存储实现
 * 支持 AWS S3、七牛云、阿里云 OSS、MinIO 等 S3 兼容服务
 */
export class S3Storage implements IStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly bucketPrefix: string;  // Bucket 内路径前缀
  private readonly publicUrl: string;     // S3 公开访问地址

  constructor() {
    const env = getEnvConfig();

    // 验证 S3 配置完整性
    if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 配置不完整，请检查环境变量：S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
    }

    this.bucket = env.S3_BUCKET;
    this.bucketPrefix = env.S3_BUCKET_PREFIX || '';
    this.publicUrl = env.S3_PUBLIC_URL || env.S3_ENDPOINT;

    // 初始化 S3 客户端
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      // 七牛云等服务可能需要强制使用路径样式
      forcePathStyle: true,
    });
  }

  /**
   * 构建 S3 对象键（加上前缀）
   */
  private getS3Key(relativePath: string): string {
    const normalized = relativePath.replace(/^\/+/, ''); // 移除开头的斜杠
    return this.bucketPrefix ? `${this.bucketPrefix}/${normalized}` : normalized;
  }

  /**
   * 从 S3 键中移除前缀，返回相对路径
   */
  private removePrefix(s3Key: string): string {
    if (this.bucketPrefix && s3Key.startsWith(this.bucketPrefix + '/')) {
      return s3Key.substring(this.bucketPrefix.length + 1);
    }
    return s3Key;
  }

  /**
   * 保存文件到 S3
   */
  async saveFile(relativePath: string, data: Buffer): Promise<void> {
    const key = this.getS3Key(relativePath);

    // 根据文件扩展名设置 Content-Type
    const contentType = this.getContentType(relativePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
  }

  /**
   * 从 S3 读取文件
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const key = this.getS3Key(relativePath);

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`文件不存在或无法读取: ${relativePath}`);
    }

    // 将流转换为 Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * 从 S3 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    const key = this.getS3Key(relativePath);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const key = this.getS3Key(relativePath);

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 列出目录下的文件
   */
  async listFiles(dirPath: string, options?: { recursive?: boolean }): Promise<string[]> {
    const prefix = this.getS3Key(dirPath);
    const delimiter = options?.recursive ? undefined : '/';

    const files: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix.endsWith('/') ? prefix : prefix + '/',
          Delimiter: delimiter,
          ContinuationToken: continuationToken,
        })
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Key !== prefix && !obj.Key.endsWith('/')) {
            // 返回相对于 dirPath 的路径
            const fullPath = this.removePrefix(obj.Key);
            const relativePath = fullPath.substring(dirPath.length).replace(/^\//, '');
            files.push(relativePath);
          }
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return files;
  }

  /**
   * 删除目录及其所有内容
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    const prefix = this.getS3Key(dirPath);

    // 列出所有文件
    const allFiles: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix.endsWith('/') ? prefix : prefix + '/',
          ContinuationToken: continuationToken,
        })
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            allFiles.push(obj.Key);
          }
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    // 批量删除
    if (allFiles.length > 0) {
      // 七牛云不支持 DeleteObjectsCommand 的批量删除（需要 Content-MD5）
      // 改为逐个删除文件
      for (const key of allFiles) {
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          })
        );
      }
    }
  }

  /**
   * 获取文件的公开访问 URL
   *
   * 说明：
   * - 返回完整的 S3 对象访问 URL
   * - URL 格式：{publicUrl}/{bucketPrefix}/{relativePath}
   * - 例如：http://cdn.example.com/folder2podcast/audio/admin/周杰伦演唱会/...
   */
  getFileUrl(relativePath: string): string {
    // 如果有 bucket prefix，需要包含在 URL 中
    if (this.bucketPrefix) {
      return `${this.publicUrl}/${this.bucketPrefix}/${relativePath}`;
    }
    return `${this.publicUrl}/${relativePath}`;
  }

  /**
   * 获取文件大小
   */
  async getFileSize(relativePath: string): Promise<number> {
    const key = this.getS3Key(relativePath);

    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    return response.ContentLength || 0;
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(relativePath: string): Promise<FileStats> {
    const key = this.getS3Key(relativePath);

    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    return {
      size: response.ContentLength || 0,
      createdAt: response.LastModified || new Date(),
      modifiedAt: response.LastModified || new Date(),
      isDirectory: false, // S3 没有真正的目录概念
    };
  }

  /**
   * 检查目录是否存在
   * 注意：S3 没有真正的目录，这里检查是否有以该前缀开头的对象
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    const prefix = this.getS3Key(dirPath);

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix.endsWith('/') ? prefix : prefix + '/',
        MaxKeys: 1,
      })
    );

    return (response.Contents?.length || 0) > 0 || (response.CommonPrefixes?.length || 0) > 0;
  }

  /**
   * 创建目录（S3 中无需显式创建目录）
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    // S3 中无需显式创建目录，上传文件时会自动创建
    // 这里可以选择创建一个空的 .keep 文件来标记目录
    // 为了保持接口一致性，这里什么也不做
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const sourceKey = this.getS3Key(sourcePath);
    const destKey = this.getS3Key(destPath);

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
      })
    );
  }

  /**
   * 移动/重命名文件
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    // S3 不支持原生的移动操作，需要先复制再删除
    await this.copyFile(sourcePath, destPath);
    await this.deleteFile(sourcePath);
  }

  /**
   * 获取存储类型
   */
  getStorageType(): 'local' | 's3' {
    return 's3';
  }

  /**
   * 根据文件扩展名返回 Content-Type
   */
  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // 音频格式
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      aac: 'audio/aac',
      wma: 'audio/x-ms-wma',

      // 图片格式
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',

      // 配置文件
      json: 'application/json',
      xml: 'application/xml',
      txt: 'text/plain',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
