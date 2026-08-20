import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private config: ConfigService) {
    this.endpoint = this.config.get<string>('SUPABASE_S3_ENDPOINT_URL')!;
    this.bucket = this.config.get<string>('SUPABASE_S3_BUCKET_NAME')!;
    this.client = new S3Client({
      region: this.config.get<string>('SUPABASE_S3_REGION'),
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('SUPABASE_S3_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY')!,
      },
    });
  }

  /** Envia o arquivo pro bucket e retorna a URL pública, no mesmo padrão de pastas do django-storages atual. */
  async upload(folder: string, file: Express.Multer.File): Promise<string> {
    const extension = path.extname(file.originalname);
    const key = `${folder}/${randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}
